import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";

import { buildAnalysisPrompt } from "@/lib/prompts";

const DEFAULT_GEMINI_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash",
] as const;
const GEMINI_MODELS = resolveGeminiModels();
const GEMINI_TIMEOUT_MS = parsePositiveInteger(
  process.env.GEMINI_TIMEOUT_MS,
  25_000,
);

// Default worst case: 3 models * 25s per-model timeout = about 75 seconds.

const analysisResponseSchema = {
  type: Type.OBJECT,
  properties: {
    vagaTitulo: {
      type: Type.STRING,
      description:
        "Título curto e profissional da vaga. Retorne uma string vazia quando não houver evidência suficiente.",
    },
    empresa: {
      type: Type.STRING,
      description:
        "Nome da empresa contratante. Retorne uma string vazia quando não houver evidência suficiente.",
    },
    curriculoOriginalTexto: {
      type: Type.STRING,
      description:
        "Transcrição fiel e completa do currículo quando a entrada for PDF. Para uma entrada textual, retorne uma string vazia.",
    },
    curriculoMarkdown: {
      type: Type.STRING,
      description: "Currículo completo otimizado para a vaga em Markdown.",
    },
    email: {
      type: Type.OBJECT,
      properties: {
        assunto: {
          type: Type.STRING,
          description: "Assunto do e-mail, sem o prefixo 'Assunto:'.",
        },
        corpo: {
          type: Type.STRING,
          description: "Corpo completo do e-mail em texto simples.",
        },
      },
      required: ["assunto", "corpo"],
    },
  },
  required: [
    "vagaTitulo",
    "empresa",
    "curriculoOriginalTexto",
    "curriculoMarkdown",
    "email",
  ],
};

const analysisResultSchema = z
  .object({
    vagaTitulo: z.string().trim().max(180),
    empresa: z.string().trim().max(180),
    curriculoOriginalTexto: z.string().trim(),
    curriculoMarkdown: z.string().trim().min(100),
    email: z
      .object({
        assunto: z.string().trim().min(4).max(180),
        corpo: z.string().trim().min(80),
      })
      .strict(),
  })
  .strict();

const pdfAnalysisResultSchema = analysisResultSchema.extend({
  curriculoOriginalTexto: z.string().trim().min(50),
});

export type CurriculumInput =
  | {
      kind: "text";
      content: string;
    }
  | {
      kind: "pdf";
      data: string;
      mimeType: "application/pdf";
      filename: string;
    };

type AnalyzeWithGeminiInput = {
  description: string;
  vagaTitulo: string;
  empresa: string;
  curriculum: CurriculumInput;
};

type AnalysisProgressLogger = (
  step: string,
  details?: Record<string, unknown>,
) => void;

type AnalyzeWithGeminiOptions = {
  onProgress?: AnalysisProgressLogger;
};

type GeminiRequestPart =
  | { text: string }
  | {
      inlineData: {
        data: string;
        mimeType: "application/pdf";
      };
    };

export class GeminiApiError extends Error {
  constructor(
    readonly status: number,
    readonly responseBody: string,
    readonly attempts: number,
    cause?: unknown,
  ) {
    super(`Gemini API error: ${status} ${responseBody}`);
    this.name = "GeminiApiError";

    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

export class InvalidGeminiResponseError extends Error {
  constructor(
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "InvalidGeminiResponseError";
  }
}

class GeminiTimeoutError extends Error {
  constructor(
    readonly timeoutMs: number,
    cause?: unknown,
  ) {
    super("Tempo limite excedido ao chamar o Gemini.");
    this.name = "GeminiTimeoutError";

    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

function uniqueModels(models: Array<string | undefined>) {
  return Array.from(
    new Set(
      models
        .map((model) => model?.trim())
        .filter((model): model is string => Boolean(model)),
    ),
  );
}

function resolveGeminiModels() {
  const configuredModels = uniqueModels(
    process.env.GEMINI_MODELS?.split(",") ?? [],
  );

  if (configuredModels.length > 0) {
    return configuredModels;
  }

  // Keep deployments using the previous variables working while ensuring
  // they also receive the new default fallback chain.
  return uniqueModels([
    process.env.GEMINI_MODEL,
    process.env.GEMINI_FALLBACK_MODEL,
    ...DEFAULT_GEMINI_MODELS,
  ]);
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  if (
    Number.isSafeInteger(parsed) &&
    parsed > 0 &&
    parsed <= 2_147_483_647
  ) {
    return parsed;
  }

  return fallback;
}

function isAbortOrTimeoutError(error: unknown) {
  if (error instanceof GeminiTimeoutError) {
    return true;
  }

  if (typeof error !== "object" || error === null || !("name" in error)) {
    return false;
  }

  return error.name === "AbortError" || error.name === "TimeoutError";
}

function getErrorStatus(error: unknown) {
  if (isAbortOrTimeoutError(error)) {
    return null;
  }

  if (
    typeof error !== "object" ||
    error === null ||
    !("status" in error) ||
    typeof error.status !== "number"
  ) {
    return null;
  }

  return error.status;
}

function getErrorMessage(error: unknown) {
  if (isAbortOrTimeoutError(error)) {
    return "Tempo limite excedido ao chamar o Gemini.";
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Falha de rede ao chamar o Gemini.";
}

function canTryNextGeminiModel(error: unknown) {
  if (isAbortOrTimeoutError(error)) {
    return true;
  }

  const status = getErrorStatus(error);

  if (status === null) {
    return true;
  }

  return (
    status === 404 ||
    status === 408 ||
    status === 429 ||
    (status >= 500 && status <= 599)
  );
}

function createRequestParts(input: AnalyzeWithGeminiInput) {
  const prompt = buildAnalysisPrompt({
    description: input.description,
    vagaTitulo: input.vagaTitulo,
    empresa: input.empresa,
    curriculumKind: input.curriculum.kind,
  });
  const parts: GeminiRequestPart[] = [{ text: prompt }];

  if (input.curriculum.kind === "pdf") {
    parts.push({
      inlineData: {
        data: input.curriculum.data,
        mimeType: input.curriculum.mimeType,
      },
    });
  } else {
    parts.push({
      text: `## Conteúdo do currículo original

${input.curriculum.content}`,
    });
  }

  return parts;
}

async function generateAnalysis(
  ai: GoogleGenAI,
  contents: GeminiRequestPart[],
  curriculumKind: CurriculumInput["kind"],
  onProgress?: AnalysisProgressLogger,
) {
  for (const [modelIndex, model] of GEMINI_MODELS.entries()) {
    const attempts = modelIndex + 1;
    const hasModelsLeft = modelIndex < GEMINI_MODELS.length - 1;
    const nextModel = hasModelsLeft
      ? GEMINI_MODELS[modelIndex + 1]
      : null;
    const attemptStartedAt = performance.now();
    const abortController = new AbortController();
    let timedOut = false;

    onProgress?.("attempt:start", {
      attempt: attempts,
      maxAttempts: GEMINI_MODELS.length,
      model,
      isFallbackModel: modelIndex > 0,
      timeoutMs: GEMINI_TIMEOUT_MS,
    });

    const timeoutId = setTimeout(() => {
      timedOut = true;
      abortController.abort();
    }, GEMINI_TIMEOUT_MS);

    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          abortSignal: abortController.signal,
          responseMimeType: "application/json",
          responseSchema: analysisResponseSchema,
        },
      });

      onProgress?.("attempt:response-received", {
        attempt: attempts,
        durationMs: Math.round(performance.now() - attemptStartedAt),
        model,
        responseChars: response.text?.length ?? 0,
      });

      onProgress?.("response:validation:start", {
        attempt: attempts,
        model,
      });

      try {
        const result = parseAnalysisResult(response.text, curriculumKind);

        onProgress?.("response:validation:complete", {
          attempt: attempts,
          model,
        });

        return { result, attempts, model };
      } catch (error) {
        onProgress?.("response:validation:error", {
          attempt: attempts,
          model,
          message: getErrorMessage(error),
        });

        if (hasModelsLeft) {
          onProgress?.("model:fallback", {
            fromModel: model,
            toModel: nextModel,
            reason: "invalid-response",
          });
          continue;
        }

        throw error;
      }
    } catch (error) {
      if (error instanceof InvalidGeminiResponseError) {
        throw error;
      }

      const normalizedError = timedOut
        ? new GeminiTimeoutError(GEMINI_TIMEOUT_MS, error)
        : error;
      const canTryNextModel = canTryNextGeminiModel(normalizedError);
      const status = getErrorStatus(normalizedError);

      if (timedOut) {
        onProgress?.("attempt:timeout", {
          attempt: attempts,
          timeoutMs: GEMINI_TIMEOUT_MS,
          model,
        });
      }

      onProgress?.("attempt:error", {
        attempt: attempts,
        durationMs: Math.round(performance.now() - attemptStartedAt),
        status,
        retryable: canTryNextModel,
        model,
        message: getErrorMessage(normalizedError),
      });

      if (hasModelsLeft && canTryNextModel) {
        onProgress?.("model:fallback", {
          fromModel: model,
          toModel: nextModel,
          reason: "request-error",
          status,
        });
      } else {
        throw new GeminiApiError(
          status ?? 503,
          getErrorMessage(normalizedError),
          attempts,
          normalizedError,
        );
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new GeminiApiError(
    503,
    "A chamada ao Gemini terminou sem resposta.",
    GEMINI_MODELS.length,
  );
}

function parseAnalysisResult(
  responseText: string | undefined,
  curriculumKind: CurriculumInput["kind"],
) {
  if (!responseText?.trim()) {
    throw new InvalidGeminiResponseError(
      "O Gemini retornou uma resposta vazia.",
    );
  }

  let rawResult: unknown;

  try {
    rawResult = JSON.parse(responseText);
  } catch (error) {
    throw new InvalidGeminiResponseError(
      "O Gemini retornou um JSON inválido.",
      error,
    );
  }

  const schema =
    curriculumKind === "pdf"
      ? pdfAnalysisResultSchema
      : analysisResultSchema;
  const parsedResult = schema.safeParse(rawResult);

  if (!parsedResult.success) {
    throw new InvalidGeminiResponseError(
      "A resposta do Gemini não contém todos os dados válidos da análise.",
      parsedResult.error.issues,
    );
  }

  return parsedResult.data;
}

export async function analyzeWithGemini(
  input: AnalyzeWithGeminiInput,
  { onProgress }: AnalyzeWithGeminiOptions = {},
) {
  onProgress?.("configuration:start");
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    onProgress?.("configuration:error", {
      message: "GEMINI_API_KEY ausente.",
    });
    throw new GeminiApiError(
      500,
      "A variável GEMINI_API_KEY não está configurada.",
      0,
    );
  }

  onProgress?.("configuration:complete", {
    models: GEMINI_MODELS,
  });
  onProgress?.("client:create:start");
  const ai = new GoogleGenAI({ apiKey });
  onProgress?.("client:create:complete");

  onProgress?.("request:prepare:start", {
    inputType: input.curriculum.kind,
  });
  const contents = createRequestParts(input);
  onProgress?.("request:prepare:complete", {
    parts: contents.length,
    inputChars:
      input.curriculum.kind === "text"
        ? input.curriculum.content.length
        : input.curriculum.data.length,
  });

  const { result, attempts, model } = await generateAnalysis(
    ai,
    contents,
    input.curriculum.kind,
    onProgress,
  );

  return { result, attempts, model };
}
