import { NextRequest, NextResponse } from "next/server";
import { applicationJobDetailsSchema } from "@/lib/application-job-details";
import { extractEmailFromText } from "@/lib/email-utils";
import {
  analyzeWithGemini,
  GeminiApiError,
  InvalidGeminiResponseError,
  type CurriculumInput,
} from "@/lib/gemini/analyze";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { classifyCurriculumFile } from "@/lib/curriculum-files";
import type { HiringModel } from "@/lib/supabase/database.types";

const MAX_CURRICULUM_FILE_SIZE = 10 * 1024 * 1024;
const RETRYABLE_GEMINI_STATUSES = new Set([
  408, 429, 500, 502, 503, 504,
]);

class BadRequestError extends Error {}

function parseJobDetails(input: unknown) {
  const parsed = applicationJobDetailsSchema.safeParse(input);

  if (!parsed.success) {
    throw new BadRequestError(
      parsed.error.issues[0]?.message ?? "Dados da vaga inválidos.",
    );
  }

  return parsed.data;
}

async function readCurriculumFile(file: File): Promise<CurriculumInput> {
  if (file.size > MAX_CURRICULUM_FILE_SIZE) {
    throw new BadRequestError("O arquivo deve ter no máximo 10 MB.");
  }

  const fileKind = classifyCurriculumFile(file);

  if (fileKind === "pdf") {
    return {
      kind: "pdf",
      filename: file.name,
      mimeType: "application/pdf",
      data: Buffer.from(await file.arrayBuffer()).toString("base64"),
    };
  }

  if (fileKind === "text") {
    return { kind: "text", content: await file.text() };
  }

  throw new BadRequestError("Envie um currículo em PDF, Markdown ou TXT.");
}

async function parseAnalysisRequest(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const vagaTitulo = formData.get("vagaTitulo");
    const empresa = formData.get("empresa");
    const description = formData.get("description");
    const curriculum = formData.get("curriculum");
    const curriculumFile = formData.get("curriculumFile");
    const salario = formData.get("salario");
    const modeloContratacao = formData.get("modelo_contratacao");
    const skillsNaoDominadas = formData.getAll("skills_nao_dominadas");
    const jobDetails = parseJobDetails({
      salario: typeof salario === "string" ? salario : undefined,
      modelo_contratacao:
        typeof modeloContratacao === "string" && modeloContratacao
          ? modeloContratacao
          : undefined,
      skills_nao_dominadas: skillsNaoDominadas,
    });

    return {
      vagaTitulo: typeof vagaTitulo === "string" ? vagaTitulo : "",
      empresa: typeof empresa === "string" ? empresa : "",
      description: typeof description === "string" ? description : "",
      curriculum:
        curriculumFile instanceof File && curriculumFile.size > 0
          ? await readCurriculumFile(curriculumFile)
          : {
              kind: "text" as const,
              content: typeof curriculum === "string" ? curriculum : "",
            },
      ...jobDetails,
    };
  }

  const body = (await req.json()) as unknown;

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new BadRequestError("JSON inválido.");
  }

  const rawBody = body as Record<string, unknown>;
  const jobDetails = parseJobDetails({
    salario: rawBody.salario,
    modelo_contratacao: rawBody.modelo_contratacao,
    skills_nao_dominadas: rawBody.skills_nao_dominadas,
  });

  return {
    vagaTitulo:
      typeof rawBody.vagaTitulo === "string" ? rawBody.vagaTitulo : "",
    empresa: typeof rawBody.empresa === "string" ? rawBody.empresa : "",
    description:
      typeof rawBody.description === "string" ? rawBody.description : "",
    curriculum: {
      kind: "text" as const,
      content:
        typeof rawBody.curriculum === "string" ? rawBody.curriculum : "",
    },
    ...jobDetails,
  };
}

function optionalText(value: string | null | undefined) {
  return value?.trim() || null;
}

function hasCurriculum(curriculum: CurriculumInput) {
  return curriculum.kind === "pdf" || Boolean(curriculum.content.trim());
}

function formatGeneratedEmail({
  assunto,
  corpo,
}: {
  assunto: string;
  corpo: string;
}) {
  return `Assunto: ${assunto}\n\n${corpo}`;
}

async function saveCandidatura({
  vagaTitulo,
  empresa,
  description,
  curriculum,
  optimizedCurriculum,
  outreachEmail,
  cartaApresentacao,
  salario,
  modeloContratacao,
  skillsNaoDominadas,
}: {
  vagaTitulo: string | null;
  empresa: string | null;
  description: string;
  curriculum: string;
  optimizedCurriculum: string;
  outreachEmail: string;
  cartaApresentacao: string;
  salario: string | null;
  modeloContratacao: HiringModel | null;
  skillsNaoDominadas: string[];
}) {
  try {
    const supabase = await createSupabaseClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "[candidaturas] Análise concluída sem sessão autenticada; registro não salvo.",
        userError
      );
      return;
    }

    const { error: insertError } = await supabase.from("candidaturas").insert({
      user_id: user.id,
      vaga_titulo: vagaTitulo,
      empresa,
      descricao_vaga: description,
      curriculo_original: curriculum,
      curriculo_otimizado: optimizedCurriculum,
      email_outreach: outreachEmail,
      carta_apresentacao: cartaApresentacao,
      salario,
      modelo_contratacao: modeloContratacao,
      skills_nao_dominadas: skillsNaoDominadas,
    });

    if (insertError) {
      console.error(
        "[candidaturas] Não foi possível salvar a análise no histórico.",
        insertError
      );
      return;
    }
  } catch (saveError) {
    console.error(
      "[candidaturas] Erro inesperado ao salvar a análise no histórico.",
      saveError
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      vagaTitulo,
      empresa,
      description,
      curriculum,
      salario,
      modelo_contratacao: modeloContratacao,
      skills_nao_dominadas: skillsNaoDominadas,
    } = await parseAnalysisRequest(req);

    if (!description.trim() || !hasCurriculum(curriculum)) {
      return NextResponse.json(
        { error: "Descrição da vaga e currículo são obrigatórios." },
        { status: 400 }
      );
    }

    const { result } = await analyzeWithGemini(
      {
        vagaTitulo,
        empresa,
        salario: optionalText(salario),
        modeloContratacao: modeloContratacao ?? null,
        skillsNaoDominadas,
        description,
        curriculum,
      },
      {
        onProgress(step, details) {
          console.info(`[gemini] ${step}`, details ?? {});
        },
      },
    );

    const resolvedJobTitle =
      optionalText(vagaTitulo) ?? optionalText(result.vagaTitulo);
    const resolvedCompany =
      optionalText(empresa) ?? optionalText(result.empresa);
    const resolvedSalary =
      optionalText(salario) ?? optionalText(result.salario);
    const resolvedHiringModel =
      modeloContratacao ?? result.modeloContratacao;
    const resolvedMissingSkills =
      skillsNaoDominadas.length > 0
        ? skillsNaoDominadas
        : result.skillsNaoDominadas;
    const originalCurriculum =
      curriculum.kind === "pdf"
        ? result.curriculoOriginalTexto.trim()
        : curriculum.content;
    const outreachEmail = formatGeneratedEmail(result.email);
    const recruiterEmail = extractEmailFromText(description);

    await saveCandidatura({
      vagaTitulo: resolvedJobTitle,
      empresa: resolvedCompany,
      description,
      curriculum: originalCurriculum,
      optimizedCurriculum: result.curriculoMarkdown,
      outreachEmail,
      cartaApresentacao: result.cartaApresentacao,
      salario: resolvedSalary,
      modeloContratacao: resolvedHiringModel,
      skillsNaoDominadas: resolvedMissingSkills,
    });

    return NextResponse.json({
      curriculum: result.curriculoMarkdown,
      email: outreachEmail,
      emailSubject: result.email.assunto,
      emailBody: result.email.corpo,
      cartaApresentacao: result.cartaApresentacao,
      recruiterEmail,
      vagaTitulo: resolvedJobTitle,
      empresa: resolvedCompany,
      salario: resolvedSalary,
      modeloContratacao: resolvedHiringModel,
      skillsNaoDominadas: resolvedMissingSkills,
    });
  } catch (error) {
    if (error instanceof BadRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof InvalidGeminiResponseError) {
      return NextResponse.json(
        {
          error:
            "O serviço de IA retornou uma análise incompleta. Tente novamente em alguns instantes.",
        },
        { status: 502 }
      );
    }

    if (error instanceof GeminiApiError) {
      if (error.attempts === 0) {
        return NextResponse.json(
          { error: "O serviço de IA não está configurado." },
          { status: 500 }
        );
      }

      if (error.status === 429) {
        return NextResponse.json(
          {
            error:
              "O limite temporário do serviço de IA foi atingido. Aguarde alguns instantes e tente novamente.",
          },
          { status: 429, headers: { "Retry-After": "5" } }
        );
      }

      if (RETRYABLE_GEMINI_STATUSES.has(error.status)) {
        return NextResponse.json(
          {
            error:
              "O serviço de IA está temporariamente indisponível. Aguarde alguns instantes e tente novamente.",
          },
          { status: 503, headers: { "Retry-After": "5" } }
        );
      }
    }

    console.error(error);
    return NextResponse.json(
      { error: "Falha ao gerar análise." },
      { status: 500 }
    );
  }
}
