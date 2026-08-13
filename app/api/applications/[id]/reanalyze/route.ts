import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  isActiveReanalysis,
  ORIGINAL_CURRICULUM_BUCKET,
  REANALYSIS_MAX_CURRICULUM_FILE_SIZE,
  REANALYSIS_MAX_CURRICULUM_LENGTH,
  REANALYSIS_MAX_DESCRIPTION_LENGTH,
  REANALYSIS_MAX_REQUEST_SIZE,
} from "@/lib/application-reanalysis";
import { normalizeSkillTags } from "@/lib/application-job-details";
import { classifyCurriculumFile } from "@/lib/curriculum-files";
import { formatOutreachEmail } from "@/lib/email-utils";
import {
  analyzeWithGemini,
  GeminiApiError,
  InvalidGeminiResponseError,
  type CurriculumInput,
} from "@/lib/gemini/analyze";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 180;

const RETRYABLE_GEMINI_STATUSES = new Set([
  408, 429, 500, 502, 503, 504,
]);

const idSchema = z.string().uuid();
const jsonRequestSchema = z
  .object({
    description: z
      .string()
      .max(
        REANALYSIS_MAX_DESCRIPTION_LENGTH,
        "A descrição da vaga excede o limite permitido.",
      )
      .optional(),
    curriculum: z
      .string()
      .max(
        REANALYSIS_MAX_CURRICULUM_LENGTH,
        "O conteúdo do currículo excede o limite permitido.",
      )
      .optional(),
  })
  .strict();

class BadRequestError extends Error {}
class AnalysisConflictError extends Error {}

type ParsedReanalysisRequest = {
  description?: string;
  curriculum?: CurriculumInput;
};

type PublicError = {
  code: string;
  message: string;
  status: number;
  retryAfter?: string;
};

async function removeStoredCurriculum(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string,
) {
  try {
    const { error } = await supabase.storage
      .from(ORIGINAL_CURRICULUM_BUCKET)
      .remove([path]);

    if (error) {
      console.warn(
        "[applications:reanalyze:remove-stored-curriculum]",
        error,
      );
    }
  } catch (error) {
    console.warn(
      "[applications:reanalyze:remove-stored-curriculum]",
      error,
    );
  }
}

function firstNonBlank(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (value?.trim()) return value.trim();
  }

  return "";
}

function hasCurriculum(curriculum: CurriculumInput) {
  return curriculum.kind === "pdf" || Boolean(curriculum.content.trim());
}

async function readCurriculumFile(file: File): Promise<CurriculumInput> {
  if (file.size === 0) {
    throw new BadRequestError("O arquivo de currículo está vazio.");
  }

  if (file.size > REANALYSIS_MAX_CURRICULUM_FILE_SIZE) {
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
    const content = await file.text();

    if (content.length > REANALYSIS_MAX_CURRICULUM_LENGTH) {
      throw new BadRequestError(
        "O conteúdo do currículo excede o limite permitido.",
      );
    }

    if (!content.trim()) {
      throw new BadRequestError("O arquivo de currículo está vazio.");
    }

    return { kind: "text", content };
  }

  throw new BadRequestError("Envie um currículo em PDF, Markdown ou TXT.");
}

async function parseReanalysisRequest(
  request: NextRequest,
): Promise<ParsedReanalysisRequest> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;

    try {
      formData = await request.formData();
    } catch {
      throw new BadRequestError("Formulário inválido.");
    }

    const descriptionValue = formData.get("description");
    const curriculumValue = formData.get("curriculum");
    const curriculumFile = formData.get("curriculumFile");

    if (
      descriptionValue !== null &&
      typeof descriptionValue !== "string"
    ) {
      throw new BadRequestError("Descrição da vaga inválida.");
    }

    if (curriculumValue !== null && typeof curriculumValue !== "string") {
      throw new BadRequestError("Currículo inválido.");
    }

    if (
      typeof descriptionValue === "string" &&
      descriptionValue.length > REANALYSIS_MAX_DESCRIPTION_LENGTH
    ) {
      throw new BadRequestError(
        "A descrição da vaga excede o limite permitido.",
      );
    }

    if (
      typeof curriculumValue === "string" &&
      curriculumValue.length > REANALYSIS_MAX_CURRICULUM_LENGTH
    ) {
      throw new BadRequestError(
        "O conteúdo do currículo excede o limite permitido.",
      );
    }

    if (
      curriculumFile instanceof File &&
      curriculumFile.name &&
      curriculumFile.size === 0
    ) {
      throw new BadRequestError("O arquivo de currículo está vazio.");
    }

    const providedFile =
      curriculumFile instanceof File && curriculumFile.size > 0
        ? curriculumFile
        : null;

    return {
      description:
        typeof descriptionValue === "string" ? descriptionValue : undefined,
      curriculum: providedFile
        ? await readCurriculumFile(providedFile)
        : typeof curriculumValue === "string" && curriculumValue.trim()
          ? { kind: "text", content: curriculumValue }
          : undefined,
    };
  }

  if (!contentType.includes("application/json")) {
    throw new BadRequestError(
      "Envie a requisição como JSON ou multipart/form-data.",
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new BadRequestError("JSON inválido.");
  }

  const parsedBody = jsonRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    throw new BadRequestError(
      parsedBody.error.issues[0]?.message ?? "Dados da análise inválidos.",
    );
  }

  return {
    description: parsedBody.data.description,
    curriculum: parsedBody.data.curriculum?.trim()
      ? { kind: "text", content: parsedBody.data.curriculum }
      : undefined,
  };
}

function publicErrorFor(error: unknown): PublicError {
  if (error instanceof BadRequestError) {
    return { code: "invalid_input", message: error.message, status: 400 };
  }

  if (error instanceof AnalysisConflictError) {
    return { code: "analysis_conflict", message: error.message, status: 409 };
  }

  if (error instanceof InvalidGeminiResponseError) {
    return {
      code: "invalid_ai_response",
      message:
        "O serviço de IA retornou uma análise incompleta. Tente novamente em alguns instantes.",
      status: 502,
    };
  }

  if (error instanceof GeminiApiError) {
    if (error.attempts === 0) {
      return {
        code: "ai_not_configured",
        message: "O serviço de IA não está configurado.",
        status: 500,
      };
    }

    if (error.status === 429) {
      return {
        code: "ai_rate_limited",
        message:
          "O limite temporário do serviço de IA foi atingido. Aguarde alguns instantes e tente novamente.",
        status: 429,
        retryAfter: "5",
      };
    }

    if (RETRYABLE_GEMINI_STATUSES.has(error.status)) {
      return {
        code: "ai_unavailable",
        message:
          "O serviço de IA está temporariamente indisponível. Aguarde alguns instantes e tente novamente.",
        status: 503,
        retryAfter: "5",
      };
    }
  }

  return {
    code: "reanalyze_failed",
    message: "Não foi possível gerar uma nova análise.",
    status: 500,
  };
}

export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/applications/[id]/reanalyze">,
) {
  const parsedId = idSchema.safeParse((await context.params).id);

  if (!parsedId.success) {
    return NextResponse.json(
      { error: "Identificador inválido." },
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

  const { data: analysis, error } = await supabase
    .from("candidaturas")
    .select(
      "analysis_status, retry_count, updated_at, error_code, last_error",
    )
    .eq("id", parsedId.data)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[applications:reanalyze:status]", error);
    return NextResponse.json(
      { error: "Não foi possível consultar a análise." },
      { status: 500 },
    );
  }

  if (!analysis) {
    return NextResponse.json(
      { error: "Candidatura não encontrada." },
      { status: 404 },
    );
  }

  return NextResponse.json(
    { analysis },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/applications/[id]/reanalyze">,
) {
  const parsedId = idSchema.safeParse((await context.params).id);

  if (!parsedId.success) {
    return NextResponse.json(
      { error: "Identificador inválido." },
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

  const { data: application, error: applicationError } = await supabase
    .from("candidaturas")
    .select("*")
    .eq("id", parsedId.data)
    .eq("user_id", user.id)
    .maybeSingle();

  if (applicationError) {
    console.error("[applications:reanalyze:get]", applicationError);
    return NextResponse.json(
      { error: "Não foi possível carregar a candidatura." },
      { status: 500 },
    );
  }

  if (!application) {
    return NextResponse.json(
      { error: "Candidatura não encontrada." },
      { status: 404 },
    );
  }

  if (
    isActiveReanalysis({
      analysisStatus: application.analysis_status,
      updatedAt: application.updated_at,
    })
  ) {
    return NextResponse.json(
      { error: "Já existe uma análise em andamento para esta candidatura." },
      { status: 409 },
    );
  }

  const declaredContentLength = Number(
    request.headers.get("content-length") ?? 0,
  );

  if (
    Number.isFinite(declaredContentLength) &&
    declaredContentLength > REANALYSIS_MAX_REQUEST_SIZE
  ) {
    return NextResponse.json(
      { error: "A requisição excede o limite permitido." },
      { status: 413 },
    );
  }

  let claimedRetryCount: number | null = null;
  let uploadedCurriculumPath: string | null = null;

  try {
    const parsedRequest = await parseReanalysisRequest(request);
    const replacesCurriculum =
      parsedRequest.curriculum !== undefined &&
      !(
        parsedRequest.curriculum.kind === "text" &&
        parsedRequest.curriculum.content === application.curriculo_original
      );
    const description = firstNonBlank(
      parsedRequest.description,
      application.descricao_vaga,
    );
    let curriculum: CurriculumInput | undefined = replacesCurriculum
      ? parsedRequest.curriculum
      : undefined;

    if (
      !curriculum &&
      application.curriculo_input_kind === "pdf" &&
      application.curriculo_arquivo_path
    ) {
      const storedPath = application.curriculo_arquivo_path.trim();
      const hasStoredText = Boolean(application.curriculo_original?.trim());

      if (!storedPath.startsWith(`${user.id}/`)) {
        console.warn(
          "[applications:reanalyze:invalid-curriculum-path]",
          storedPath,
        );

        if (!hasStoredText) {
          throw new BadRequestError(
            "O currículo original não está disponível. Envie outro arquivo.",
          );
        }
      } else {
        const { data: storedFile, error: storedFileError } =
          await supabase.storage
            .from(ORIGINAL_CURRICULUM_BUCKET)
            .download(storedPath);

        if (storedFileError || !storedFile) {
          console.warn(
            "[applications:reanalyze:download-curriculum]",
            storedFileError,
          );

          if (!hasStoredText) {
            throw new BadRequestError(
              "O currículo original não está mais disponível. Envie outro arquivo.",
            );
          }
        } else if (
          storedFile.size === 0 ||
          storedFile.size > REANALYSIS_MAX_CURRICULUM_FILE_SIZE
        ) {
          console.warn(
            "[applications:reanalyze:invalid-stored-curriculum]",
            { size: storedFile.size },
          );

          if (!hasStoredText) {
            throw new BadRequestError(
              "O currículo armazenado é inválido. Envie outro arquivo.",
            );
          }
        } else {
          curriculum = {
            kind: "pdf",
            filename:
              application.curriculo_arquivo_nome ??
              "curriculo-original.pdf",
            mimeType: "application/pdf",
            data: Buffer.from(await storedFile.arrayBuffer()).toString(
              "base64",
            ),
          };
        }
      }
    }

    if (!curriculum && application.curriculo_original?.trim()) {
      curriculum = {
        kind: "text",
        content: application.curriculo_original,
      };
    }

    curriculum ??= { kind: "text", content: "" };

    if (!description) {
      throw new BadRequestError("A descrição da vaga é obrigatória.");
    }

    if (description.length > REANALYSIS_MAX_DESCRIPTION_LENGTH) {
      throw new BadRequestError(
        "A descrição da vaga excede o limite permitido.",
      );
    }

    if (!hasCurriculum(curriculum)) {
      throw new BadRequestError("O currículo é obrigatório.");
    }

    if (
      curriculum.kind === "text" &&
      curriculum.content.length > REANALYSIS_MAX_CURRICULUM_LENGTH
    ) {
      throw new BadRequestError(
        "O conteúdo do currículo excede o limite permitido.",
      );
    }

    const { data: claimedApplication, error: claimError } = await supabase
      .from("candidaturas")
      .update({
        analysis_status: "pending",
        error_code: null,
        last_error: null,
        retry_count: application.retry_count + 1,
      })
      .eq("id", application.id)
      .eq("user_id", user.id)
      .eq("analysis_status", application.analysis_status)
      .eq("updated_at", application.updated_at)
      .select("retry_count, updated_at")
      .maybeSingle();

    if (claimError) {
      console.error("[applications:reanalyze:claim]", claimError);
      throw new Error("Falha ao reservar a candidatura para análise.");
    }

    if (!claimedApplication) {
      throw new AnalysisConflictError(
        "A candidatura foi alterada ou uma nova análise já foi iniciada.",
      );
    }

    claimedRetryCount = claimedApplication.retry_count;
    const storedMissingSkills = normalizeSkillTags(
      application.skills_nao_dominadas ?? [],
    );

    const { result } = await analyzeWithGemini(
      {
        vagaTitulo: application.vaga_titulo ?? "",
        empresa: application.empresa ?? "",
        salario: application.salario,
        modeloContratacao: application.modelo_contratacao,
        skillsNaoDominadas: storedMissingSkills,
        description,
        curriculum,
      },
      {
        onProgress(step, details) {
          console.info(
            `[gemini:reanalyze:${application.id}] ${step}`,
            details ?? {},
          );
        },
      },
    );
    const originalCurriculum =
      curriculum.kind === "pdf"
        ? result.curriculoOriginalTexto.trim()
        : curriculum.content;
    const outreachEmail = formatOutreachEmail({
      subject: result.email.assunto,
      body: result.email.corpo,
    });
    const resolvedSalary = application.salario?.trim() || result.salario;
    const resolvedHiringModel =
      application.modelo_contratacao ?? result.modeloContratacao;
    const resolvedMissingSkills =
      storedMissingSkills.length > 0
        ? storedMissingSkills
        : result.skillsNaoDominadas;

    if (replacesCurriculum && curriculum.kind === "pdf") {
      uploadedCurriculumPath = `${user.id}/${application.id}/${randomUUID()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from(ORIGINAL_CURRICULUM_BUCKET)
        .upload(
          uploadedCurriculumPath,
          Buffer.from(curriculum.data, "base64"),
          {
            contentType: curriculum.mimeType,
            upsert: false,
          },
        );

      if (uploadError) {
        console.error(
          "[applications:reanalyze:upload-curriculum]",
          uploadError,
        );
        throw new Error("Falha ao armazenar o currículo original.");
      }
    }

    const { data: updatedApplication, error: updateError } = await supabase
      .from("candidaturas")
      .update({
        descricao_vaga: description,
        curriculo_original: originalCurriculum,
        curriculo_otimizado: result.curriculoMarkdown,
        email_outreach: outreachEmail,
        carta_apresentacao: result.cartaApresentacao,
        salario: resolvedSalary,
        modelo_contratacao: resolvedHiringModel,
        skills_nao_dominadas: resolvedMissingSkills,
        ...(replacesCurriculum && {
          curriculo_input_kind: curriculum.kind,
          curriculo_arquivo_nome:
            curriculum.kind === "pdf" ? curriculum.filename : null,
          curriculo_arquivo_path:
            curriculum.kind === "pdf" ? uploadedCurriculumPath : null,
          curriculo_original_url: null,
        }),
        analysis_status: "completed",
        error_code: null,
        last_error: null,
      })
      .eq("id", application.id)
      .eq("user_id", user.id)
      .eq("analysis_status", "pending")
      .eq("retry_count", claimedRetryCount)
      .select("*")
      .maybeSingle();

    if (updateError) {
      console.error("[applications:reanalyze:complete]", updateError);
      throw new Error("Falha ao salvar a nova análise.");
    }

    if (!updatedApplication) {
      throw new AnalysisConflictError(
        "Uma análise mais recente substituiu esta solicitação.",
      );
    }

    uploadedCurriculumPath = null;

    if (
      replacesCurriculum &&
      application.curriculo_arquivo_path?.startsWith(`${user.id}/`)
    ) {
      await removeStoredCurriculum(
        supabase,
        application.curriculo_arquivo_path,
      );
    }

    return NextResponse.json({ application: updatedApplication });
  } catch (error) {
    const publicError = publicErrorFor(error);

    if (claimedRetryCount !== null) {
      const { error: failureUpdateError } = await supabase
        .from("candidaturas")
        .update({
          analysis_status: "failed",
          error_code: publicError.code,
          last_error: publicError.message.slice(0, 1_000),
        })
        .eq("id", application.id)
        .eq("user_id", user.id)
        .eq("analysis_status", "pending")
        .eq("retry_count", claimedRetryCount);

      if (failureUpdateError) {
        console.error(
          "[applications:reanalyze:mark-failed]",
          failureUpdateError,
        );
      }
    }

    if (uploadedCurriculumPath) {
      const { data: storedReference, error: storedReferenceError } =
        await supabase
          .from("candidaturas")
          .select("curriculo_arquivo_path")
          .eq("id", application.id)
          .eq("user_id", user.id)
          .maybeSingle();

      if (storedReferenceError) {
        console.warn(
          "[applications:reanalyze:verify-curriculum-reference]",
          storedReferenceError,
        );
      } else if (
        !storedReference ||
        storedReference.curriculo_arquivo_path !== uploadedCurriculumPath
      ) {
        await removeStoredCurriculum(supabase, uploadedCurriculumPath);
      }
    }

    if (
      !(error instanceof BadRequestError) &&
      !(error instanceof AnalysisConflictError) &&
      !(error instanceof GeminiApiError) &&
      !(error instanceof InvalidGeminiResponseError)
    ) {
      console.error("[applications:reanalyze]", error);
    }

    return NextResponse.json(
      { error: publicError.message },
      {
        status: publicError.status,
        ...(publicError.retryAfter && {
          headers: { "Retry-After": publicError.retryAfter },
        }),
      },
    );
  }
}
