import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  APPLICATION_CHANNEL_NAME_MAX_LENGTH,
  cleanApplicationChannelName,
  normalizeApplicationChannelKey,
} from "@/lib/application-channels";
import { createClient } from "@/lib/supabase/server";

const createChannelSchema = z
  .object({
    name: z.string().max(500),
  })
  .strict();
const forbiddenNameCharacterPattern = /[\p{C}]/u;

async function authenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return { supabase, user: error ? null : user };
}

function validateName(value: string) {
  const name = cleanApplicationChannelName(value);

  if (!name) {
    return { error: "Informe o nome do canal." } as const;
  }

  if (Array.from(name).length > APPLICATION_CHANNEL_NAME_MAX_LENGTH) {
    return {
      error: `O nome do canal deve ter no máximo ${APPLICATION_CHANNEL_NAME_MAX_LENGTH} caracteres.`,
    } as const;
  }

  if (
    forbiddenNameCharacterPattern.test(name) ||
    !normalizeApplicationChannelKey(name)
  ) {
    return { error: "Informe um nome de canal válido." } as const;
  }

  return {
    name,
    normalizedName: normalizeApplicationChannelKey(name),
  } as const;
}

export async function GET() {
  const { supabase, user } = await authenticatedClient();

  if (!user) {
    return NextResponse.json(
      { error: "Sessão não autenticada." },
      { status: 401 },
    );
  }

  const { data, error } = await supabase
    .from("application_channels")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (error) {
    console.error("[application-channels:get]", error);
    return NextResponse.json(
      { error: "Não foi possível carregar os canais." },
      { status: 500 },
    );
  }

  return NextResponse.json({ channels: data });
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsedBody = createChannelSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Informe um nome de canal válido." },
      { status: 400 },
    );
  }

  const validatedName = validateName(parsedBody.data.name);

  if ("error" in validatedName) {
    return NextResponse.json(
      { error: validatedName.error },
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

  const { data, error } = await supabase
    .from("application_channels")
    .insert({
      user_id: user.id,
      name: validatedName.name,
    })
    .select("id, name")
    .single();

  if (!error) {
    return NextResponse.json(
      { channel: data, created: true },
      { status: 201 },
    );
  }

  if (error.code === "23505") {
    const { data: existingChannel, error: existingError } = await supabase
      .from("application_channels")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("normalized_name", validatedName.normalizedName)
      .maybeSingle();

    if (!existingError && existingChannel) {
      return NextResponse.json({
        channel: existingChannel,
        created: false,
      });
    }

    console.error("[application-channels:post:existing]", existingError);
  } else {
    console.error("[application-channels:post]", error);
  }

  return NextResponse.json(
    { error: "Não foi possível criar o canal." },
    { status: 500 },
  );
}
