import { NextRequest, NextResponse } from "next/server";
import {
  buildApplicationMetadataPrompt,
  buildCurriculumPrompt,
  buildEmailPrompt,
} from "@/lib/prompts";
import { parseGeneratedEmail, extractEmailFromText } from "@/lib/email-utils";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";

const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";
const GEMINI_METADATA_MODEL =
  process.env.GEMINI_METADATA_MODEL?.trim() || "gemini-3.5-flash-lite";
const MAX_CURRICULUM_FILE_SIZE = 10 * 1024 * 1024;
const GEMINI_MAX_RETRIES = 2;
const RETRYABLE_GEMINI_STATUSES = new Set([
  408, 429, 500, 502, 503, 504,
]);

type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

type ApplicationMetadata = {
  vagaTitulo: string | null;
  empresa: string | null;
};

type GeminiCallOptions = {
  generationConfig?: Record<string, unknown>;
  maxRetries?: number;
  model?: string;
  timeoutMs?: number;
};

class BadRequestError extends Error {}

class GeminiApiError extends Error {
  constructor(
    readonly status: number,
    readonly responseBody: string
  ) {
    super(`Gemini API error: ${status} ${responseBody}`);
    this.name = "GeminiApiError";
  }
}

function retryDelayMs(retryAfter: string | null, retryIndex: number) {
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1_000, 10_000);
    }

    const date = Date.parse(retryAfter);
    if (!Number.isNaN(date)) {
      return Math.min(Math.max(date - Date.now(), 0), 10_000);
    }
  }

  const exponentialDelay = 1_000 * 2 ** retryIndex;
  const jitter = Math.floor(Math.random() * 250);
  return exponentialDelay + jitter;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(
  promptOrParts: string | GeminiPart[],
  {
    generationConfig,
    maxRetries = GEMINI_MAX_RETRIES,
    model = GEMINI_MODEL,
    timeoutMs,
  }: GeminiCallOptions = {}
) {
  const apiKey = process.env.GEMINI_API_KEY;
  const parts =
    typeof promptOrParts === "string"
      ? [{ text: promptOrParts }]
      : promptOrParts;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    let res: Response;

    try {
      res = await fetch(`${endpoint}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
        body: JSON.stringify({
          contents: [{ parts }],
          ...(generationConfig ? { generationConfig } : {}),
        }),
      });
    } catch (error) {
      if (attempt === maxRetries) throw error;

      await wait(retryDelayMs(null, attempt));
      continue;
    }

    if (!res.ok) {
      const responseBody = await res.text();
      const retryable = RETRYABLE_GEMINI_STATUSES.has(res.status);

      if (retryable && attempt < maxRetries) {
        await wait(retryDelayMs(res.headers.get("retry-after"), attempt));
        continue;
      }

      throw new GeminiApiError(res.status, responseBody);
    }

    const json = await res.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }

  throw new Error("A chamada ao Gemini terminou sem resposta.");
}

function isPdfFile(file: File) {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}

function isTextCurriculumFile(file: File) {
  return (
    ["text/markdown", "text/plain"].includes(file.type) ||
    /\.(md|markdown|txt)$/i.test(file.name)
  );
}

async function extractTextFromPdf(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const data = buffer.toString("base64");

  return callGemini([
    {
      text: `Extraia todo o conteúdo textual deste currículo em PDF.

Retorne apenas o texto do currículo em Markdown limpo.
Não faça comentários, explicações, resumo das alterações ou observações.
Preserve nomes, cargos, empresas, datas, contatos e seções encontrados no arquivo.`,
    },
    {
      inline_data: {
        mime_type: "application/pdf",
        data,
      },
    },
  ]);
}

async function readCurriculumFile(file: File) {
  if (file.size > MAX_CURRICULUM_FILE_SIZE) {
    throw new BadRequestError("O arquivo deve ter no máximo 10 MB.");
  }

  if (isPdfFile(file)) {
    return extractTextFromPdf(file);
  }

  if (isTextCurriculumFile(file)) {
    return file.text();
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

    if (curriculumFile instanceof File && curriculumFile.size > 0) {
      return {
        vagaTitulo: typeof vagaTitulo === "string" ? vagaTitulo : "",
        empresa: typeof empresa === "string" ? empresa : "",
        description: typeof description === "string" ? description : "",
        curriculum: await readCurriculumFile(curriculumFile),
      };
    }

    return {
      vagaTitulo: typeof vagaTitulo === "string" ? vagaTitulo : "",
      empresa: typeof empresa === "string" ? empresa : "",
      description: typeof description === "string" ? description : "",
      curriculum: typeof curriculum === "string" ? curriculum : "",
    };
  }

  const body = await req.json();

  return {
    vagaTitulo: typeof body.vagaTitulo === "string" ? body.vagaTitulo : "",
    empresa: typeof body.empresa === "string" ? body.empresa : "",
    description: typeof body.description === "string" ? body.description : "",
    curriculum: typeof body.curriculum === "string" ? body.curriculum : "",
  };
}

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed || null;
}

function metadataText(value: unknown) {
  if (typeof value !== "string") return null;

  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized || normalized.toLowerCase() === "null") return null;

  return normalized.slice(0, 180);
}

function parseApplicationMetadata(response: string): ApplicationMetadata {
  const parsed: unknown = JSON.parse(response);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("O Gemini retornou metadados de vaga inválidos.");
  }

  const metadata = parsed as Record<string, unknown>;

  return {
    vagaTitulo: metadataText(metadata.vaga_titulo),
    empresa: metadataText(metadata.empresa),
  };
}

async function resolveApplicationMetadata({
  vagaTitulo,
  empresa,
  description,
}: {
  vagaTitulo: string;
  empresa: string;
  description: string;
}): Promise<ApplicationMetadata> {
  const providedTitle = optionalText(vagaTitulo);
  const providedCompany = optionalText(empresa);

  if (providedTitle && providedCompany) {
    return { vagaTitulo: providedTitle, empresa: providedCompany };
  }

  try {
    const response = await callGemini(
      buildApplicationMetadataPrompt(description),
      {
        model: GEMINI_METADATA_MODEL,
        maxRetries: 0,
        timeoutMs: 15_000,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              vaga_titulo: { type: "STRING", nullable: true },
              empresa: { type: "STRING", nullable: true },
            },
            required: ["vaga_titulo", "empresa"],
          },
        },
      }
    );
    const inferred = parseApplicationMetadata(response);

    return {
      vagaTitulo: providedTitle ?? inferred.vagaTitulo,
      empresa: providedCompany ?? inferred.empresa,
    };
  } catch (metadataError) {
    const reason =
      metadataError instanceof GeminiApiError
        ? `Gemini respondeu com status ${metadataError.status}.`
        : metadataError instanceof Error
          ? metadataError.message
          : "Erro desconhecido.";

    console.warn(
      "[candidaturas] Não foi possível inferir título e empresa da vaga.",
      reason
    );

    return { vagaTitulo: providedTitle, empresa: providedCompany };
  }
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

    if (!description?.trim() || !curriculum?.trim()) {
      return NextResponse.json(
        { error: "Descrição da vaga e currículo são obrigatórios." },
        { status: 400 }
      );
    }

    const resultCurriculum = await callGemini(
      buildCurriculumPrompt(description, curriculum)
    );

    const resultEmail = await callGemini(
      buildEmailPrompt(description, resultCurriculum)
    );

    const metadata = await resolveApplicationMetadata({
      vagaTitulo,
      empresa,
      description,
    });

    const { subject, body } = parseGeneratedEmail(resultEmail);
    const recruiterEmail = extractEmailFromText(description);

    await saveCandidatura({
      vagaTitulo: metadata.vagaTitulo,
      empresa: metadata.empresa,
      description,
      curriculum,
      optimizedCurriculum: resultCurriculum,
      outreachEmail: resultEmail,
    });

    return NextResponse.json({
      curriculum: resultCurriculum,
      email: resultEmail,
      emailSubject: subject,
      emailBody: body,
      recruiterEmail,
      vagaTitulo: metadata.vagaTitulo,
      empresa: metadata.empresa,
    });
  } catch (error) {
    if (error instanceof BadRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof GeminiApiError) {
      console.error("[gemini] Falha após as tentativas de recuperação.", error);

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
