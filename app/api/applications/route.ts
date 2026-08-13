import { NextResponse, type NextRequest } from "next/server";

import { quickApplicationSchema } from "@/lib/application-registration";
import { createClient } from "@/lib/supabase/server";

function optionalText(value: string | undefined) {
  return value || null;
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsedBody = quickApplicationSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error:
          parsedBody.error.issues[0]?.message ??
          "Dados da candidatura inválidos.",
      },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "Sessão não autenticada." },
      { status: 401 },
    );
  }

  const { data, error } = await supabase
    .from("candidaturas")
    .insert({
      user_id: user.id,
      empresa: parsedBody.data.empresa,
      vaga_titulo: parsedBody.data.vaga_titulo,
      status: parsedBody.data.status,
      analysis_status: "nao_aplicavel",
      descricao_vaga: optionalText(parsedBody.data.descricao_vaga),
      notas: optionalText(parsedBody.data.notas),
      salario: optionalText(parsedBody.data.salario),
      modelo_contratacao: parsedBody.data.modelo_contratacao ?? null,
      skills_nao_dominadas: parsedBody.data.skills_nao_dominadas,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[applications:post]", error);
    return NextResponse.json(
      { error: "Não foi possível registrar a candidatura." },
      { status: 500 },
    );
  }

  return NextResponse.json({ application: data }, { status: 201 });
}
