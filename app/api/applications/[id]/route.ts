import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { APPLICATION_STATUSES } from "@/lib/applications";
import { ORIGINAL_CURRICULUM_BUCKET } from "@/lib/application-reanalysis";
import {
  hiringModelSchema,
  salarySchema,
  skillsNotMasteredSchema,
} from "@/lib/application-job-details";
import type { ApplicationStatus } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();
const statusValues = APPLICATION_STATUSES.map(({ value }) => value) as [
  ApplicationStatus,
  ...ApplicationStatus[],
];
const updateSchema = z
  .object({
    vaga_titulo: z.string().max(200).nullable().optional(),
    empresa: z.string().max(200).nullable().optional(),
    curriculo_otimizado: z.string().max(500_000).nullable().optional(),
    email_outreach: z.string().max(100_000).nullable().optional(),
    salario: salarySchema.nullable().optional(),
    modelo_contratacao: hiringModelSchema.nullable().optional(),
    skills_nao_dominadas: skillsNotMasteredSchema.nullable().optional(),
    status: z.enum(statusValues).optional(),
    notas: z.string().max(10_000).nullable().optional(),
  })
  .strict()
  .refine(
    (update) => Object.values(update).some((value) => value !== undefined),
    "Informe ao menos um campo para atualizar.",
  );

async function authenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return { supabase, user: error ? null : user };
}

export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/applications/[id]">,
) {
  const parsedId = idSchema.safeParse((await context.params).id);

  if (!parsedId.success) {
    return NextResponse.json(
      { error: "Identificador inválido." },
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
    .from("candidaturas")
    .select("*")
    .eq("id", parsedId.data)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[applications:get]", error);
    return NextResponse.json(
      { error: "Não foi possível carregar a candidatura." },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Candidatura não encontrada." },
      { status: 404 },
    );
  }

  return NextResponse.json({ application: data });
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/applications/[id]">,
) {
  const parsedId = idSchema.safeParse((await context.params).id);

  if (!parsedId.success) {
    return NextResponse.json(
      { error: "Identificador inválido." },
      { status: 400 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsedBody = updateSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error:
          parsedBody.error.issues[0]?.message ??
          "Dados de atualização inválidos.",
      },
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

  const update = {
    ...(parsedBody.data.vaga_titulo !== undefined && {
      vaga_titulo: parsedBody.data.vaga_titulo?.trim() || null,
    }),
    ...(parsedBody.data.empresa !== undefined && {
      empresa: parsedBody.data.empresa?.trim() || null,
    }),
    ...(parsedBody.data.curriculo_otimizado !== undefined && {
      curriculo_otimizado:
        parsedBody.data.curriculo_otimizado?.trim() || null,
    }),
    ...(parsedBody.data.email_outreach !== undefined && {
      email_outreach: parsedBody.data.email_outreach?.trim() || null,
    }),
    ...(parsedBody.data.salario !== undefined && {
      salario: parsedBody.data.salario?.trim() || null,
    }),
    ...(parsedBody.data.modelo_contratacao !== undefined && {
      modelo_contratacao: parsedBody.data.modelo_contratacao,
    }),
    ...(parsedBody.data.skills_nao_dominadas !== undefined && {
      skills_nao_dominadas: parsedBody.data.skills_nao_dominadas,
    }),
    ...(parsedBody.data.status !== undefined && {
      status: parsedBody.data.status,
    }),
    ...(parsedBody.data.notas !== undefined && {
      notas: parsedBody.data.notas?.trim() || null,
    }),
  };
  const { data, error } = await supabase
    .from("candidaturas")
    .update(update)
    .eq("id", parsedId.data)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[applications:patch]", error);
    return NextResponse.json(
      { error: "Não foi possível salvar as alterações." },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Candidatura não encontrada." },
      { status: 404 },
    );
  }

  return NextResponse.json({ application: data });
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext<"/api/applications/[id]">,
) {
  const parsedId = idSchema.safeParse((await context.params).id);

  if (!parsedId.success) {
    return NextResponse.json(
      { error: "Identificador inválido." },
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
    .from("candidaturas")
    .delete()
    .eq("id", parsedId.data)
    .eq("user_id", user.id)
    .select("id, curriculo_arquivo_path")
    .maybeSingle();

  if (error) {
    console.error("[applications:delete]", error);
    return NextResponse.json(
      { error: "Não foi possível excluir a candidatura." },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Candidatura não encontrada." },
      { status: 404 },
    );
  }

  if (data.curriculo_arquivo_path?.startsWith(`${user.id}/`)) {
    try {
      const { error: storageError } = await supabase.storage
        .from(ORIGINAL_CURRICULUM_BUCKET)
        .remove([data.curriculo_arquivo_path]);

      if (storageError) {
        console.warn("[applications:delete:curriculum]", storageError);
      }
    } catch (storageError) {
      console.warn("[applications:delete:curriculum]", storageError);
    }
  }

  return new NextResponse(null, { status: 204 });
}
