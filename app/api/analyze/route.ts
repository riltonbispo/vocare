import { NextRequest, NextResponse } from "next/server";
import {
  buildApplicationMetadataPrompt,
  buildCurriculumPrompt,
  buildEmailPrompt,
} from "@/lib/prompts";
import { parseGeneratedEmail, extractEmailFromText } from "@/lib/email-utils";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";

const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`;
const MAX_CURRICULUM_FILE_SIZE = 10 * 1024 * 1024;

type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

type ApplicationMetadata = {
  vagaTitulo: string | null;
  empresa: string | null;
};

class BadRequestError extends Error {}

async function callGemini(
  promptOrParts: string | GeminiPart[],
  generationConfig?: Record<string, unknown>
) {
  const apiKey = process.env.GEMINI_API_KEY;
  const parts =
    typeof promptOrParts === "string"
      ? [{ text: promptOrParts }]
      : promptOrParts;

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      ...(generationConfig ? { generationConfig } : {}),
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
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
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            vaga_titulo: { type: "STRING", nullable: true },
            empresa: { type: "STRING", nullable: true },
          },
          required: ["vaga_titulo", "empresa"],
        },
      }
    );
    const inferred = parseApplicationMetadata(response);

    return {
      vagaTitulo: providedTitle ?? inferred.vagaTitulo,
      empresa: providedCompany ?? inferred.empresa,
    };
  } catch (metadataError) {
    console.error(
      "[candidaturas] Não foi possível inferir título e empresa da vaga.",
      metadataError
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

    const metadataPromise = resolveApplicationMetadata({
      vagaTitulo,
      empresa,
      description,
    });

    const resultCurriculum = await callGemini(
      buildCurriculumPrompt(description, curriculum)
    );

    const [resultEmail, metadata] = await Promise.all([
      callGemini(buildEmailPrompt(description, resultCurriculum)),
      metadataPromise,
    ]);

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

    console.error(error);
    return NextResponse.json(
      { error: "Falha ao gerar análise." },
      { status: 500 }
    );
  }
}
