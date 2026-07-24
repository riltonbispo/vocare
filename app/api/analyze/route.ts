import { NextRequest, NextResponse } from "next/server";
import { extractEmailFromText } from "@/lib/email-utils";
import {
  analyzeWithGemini,
  GeminiApiError,
  InvalidGeminiResponseError,
  type CurriculumInput,
} from "@/lib/gemini/analyze";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { classifyCurriculumFile } from "@/lib/curriculum-files";

const MAX_CURRICULUM_FILE_SIZE = 10 * 1024 * 1024;
const RETRYABLE_GEMINI_STATUSES = new Set([
  408, 429, 500, 502, 503, 504,
]);

class BadRequestError extends Error {}

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
    };
  }

  const body = await req.json();

  return {
    vagaTitulo: typeof body.vagaTitulo === "string" ? body.vagaTitulo : "",
    empresa: typeof body.empresa === "string" ? body.empresa : "",
    description: typeof body.description === "string" ? body.description : "",
    curriculum: {
      kind: "text" as const,
      content: typeof body.curriculum === "string" ? body.curriculum : "",
    },
  };
}

function optionalText(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized || null;
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
}: {
  vagaTitulo: string | null;
  empresa: string | null;
  description: string;
  curriculum: string;
  optimizedCurriculum: string;
  outreachEmail: string;
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
    const { vagaTitulo, empresa, description, curriculum } =
      await parseAnalysisRequest(req);

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
    });

    return NextResponse.json({
      curriculum: result.curriculoMarkdown,
      email: outreachEmail,
      emailSubject: result.email.assunto,
      emailBody: result.email.corpo,
      recruiterEmail,
      vagaTitulo: resolvedJobTitle,
      empresa: resolvedCompany,
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
