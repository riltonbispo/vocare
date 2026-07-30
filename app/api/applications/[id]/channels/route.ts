import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();
const associationSchema = z
  .object({
    channel_id: z.string().uuid(),
  })
  .strict();

async function authenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return { supabase, user: error ? null : user };
}

async function findOwnedApplication(
  supabase: SupabaseClient<Database>,
  userId: string,
  applicationId: string,
) {
  return supabase
    .from("candidaturas")
    .select("id")
    .eq("id", applicationId)
    .eq("user_id", userId)
    .maybeSingle();
}

async function findOwnedChannel(
  supabase: SupabaseClient<Database>,
  userId: string,
  channelId: string,
) {
  return supabase
    .from("application_channels")
    .select("id, name")
    .eq("id", channelId)
    .eq("user_id", userId)
    .maybeSingle();
}

async function listApplicationChannels(
  supabase: SupabaseClient<Database>,
  userId: string,
  applicationId: string,
) {
  const { data: assignments, error: assignmentsError } = await supabase
    .from("application_channel_assignments")
    .select("channel_id")
    .eq("application_id", applicationId)
    .eq("user_id", userId);

  if (assignmentsError) {
    return { channels: null, error: assignmentsError };
  }

  if (assignments.length === 0) {
    return { channels: [], error: null };
  }

  const { data: channels, error: channelsError } = await supabase
    .from("application_channels")
    .select("id, name")
    .eq("user_id", userId)
    .in(
      "id",
      assignments.map(({ channel_id }) => channel_id),
    )
    .order("name", { ascending: true });

  return { channels, error: channelsError };
}

async function parseAssociationBody(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return { error: "JSON inválido." } as const;
  }

  const parsedBody = associationSchema.safeParse(body);

  if (!parsedBody.success) {
    return { error: "Identificador do canal inválido." } as const;
  }

  return { channelId: parsedBody.data.channel_id } as const;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/applications/[id]/channels">,
) {
  const parsedId = idSchema.safeParse((await context.params).id);

  if (!parsedId.success) {
    return NextResponse.json(
      { error: "Identificador da candidatura inválido." },
      { status: 400 },
    );
  }

  const { supabase, user } = await authenticatedClient();

  if (!user) {
    return NextResponse.json(
      { error: "Sessão não autenticada." },
      { status: 401 },
    );
  }

  const { data: application, error: applicationError } =
    await findOwnedApplication(supabase, user.id, parsedId.data);

  if (applicationError) {
    console.error("[application-channels:get:application]", applicationError);
    return NextResponse.json(
      { error: "Não foi possível verificar a candidatura." },
      { status: 500 },
    );
  }

  if (!application) {
    return NextResponse.json(
      { error: "Candidatura não encontrada." },
      { status: 404 },
    );
  }

  const { channels, error } = await listApplicationChannels(
    supabase,
    user.id,
    parsedId.data,
  );

  if (error || !channels) {
    console.error("[application-channels:get]", error);
    return NextResponse.json(
      { error: "Não foi possível carregar os canais da candidatura." },
      { status: 500 },
    );
  }

  return NextResponse.json({ channels });
}

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/applications/[id]/channels">,
) {
  const parsedId = idSchema.safeParse((await context.params).id);

  if (!parsedId.success) {
    return NextResponse.json(
      { error: "Identificador da candidatura inválido." },
      { status: 400 },
    );
  }

  const parsedBody = await parseAssociationBody(request);

  if ("error" in parsedBody) {
    return NextResponse.json({ error: parsedBody.error }, { status: 400 });
  }

  const { supabase, user } = await authenticatedClient();

  if (!user) {
    return NextResponse.json(
      { error: "Sessão não autenticada." },
      { status: 401 },
    );
  }

  const [applicationResult, channelResult] = await Promise.all([
    findOwnedApplication(supabase, user.id, parsedId.data),
    findOwnedChannel(supabase, user.id, parsedBody.channelId),
  ]);

  if (applicationResult.error || channelResult.error) {
    console.error("[application-channels:post:ownership]", {
      applicationError: applicationResult.error,
      channelError: channelResult.error,
    });
    return NextResponse.json(
      { error: "Não foi possível verificar a candidatura e o canal." },
      { status: 500 },
    );
  }

  if (!applicationResult.data) {
    return NextResponse.json(
      { error: "Candidatura não encontrada." },
      { status: 404 },
    );
  }

  if (!channelResult.data) {
    return NextResponse.json(
      { error: "Canal não encontrado." },
      { status: 404 },
    );
  }

  const { error: insertError } = await supabase
    .from("application_channel_assignments")
    .insert({
      application_id: parsedId.data,
      channel_id: parsedBody.channelId,
      user_id: user.id,
    });
  const associated = !insertError;

  if (insertError && insertError.code !== "23505") {
    console.error("[application-channels:post]", insertError);
    return NextResponse.json(
      { error: "Não foi possível associar o canal à candidatura." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { channel: channelResult.data, associated },
    { status: associated ? 201 : 200 },
  );
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/applications/[id]/channels">,
) {
  const parsedId = idSchema.safeParse((await context.params).id);

  if (!parsedId.success) {
    return NextResponse.json(
      { error: "Identificador da candidatura inválido." },
      { status: 400 },
    );
  }

  const parsedBody = await parseAssociationBody(request);

  if ("error" in parsedBody) {
    return NextResponse.json({ error: parsedBody.error }, { status: 400 });
  }

  const { supabase, user } = await authenticatedClient();

  if (!user) {
    return NextResponse.json(
      { error: "Sessão não autenticada." },
      { status: 401 },
    );
  }

  const [applicationResult, channelResult] = await Promise.all([
    findOwnedApplication(supabase, user.id, parsedId.data),
    findOwnedChannel(supabase, user.id, parsedBody.channelId),
  ]);

  if (applicationResult.error || channelResult.error) {
    console.error("[application-channels:delete:ownership]", {
      applicationError: applicationResult.error,
      channelError: channelResult.error,
    });
    return NextResponse.json(
      { error: "Não foi possível verificar a candidatura e o canal." },
      { status: 500 },
    );
  }

  if (!applicationResult.data) {
    return NextResponse.json(
      { error: "Candidatura não encontrada." },
      { status: 404 },
    );
  }

  if (!channelResult.data) {
    return NextResponse.json(
      { error: "Canal não encontrado." },
      { status: 404 },
    );
  }

  const { data: removedAssignments, error: deleteError } = await supabase
    .from("application_channel_assignments")
    .delete()
    .eq("application_id", parsedId.data)
    .eq("channel_id", parsedBody.channelId)
    .eq("user_id", user.id)
    .select("id");

  if (deleteError) {
    console.error("[application-channels:delete]", deleteError);
    return NextResponse.json(
      { error: "Não foi possível remover o canal da candidatura." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    channel_id: parsedBody.channelId,
    removed: removedAssignments.length > 0,
  });
}
