import { NextRequest, NextResponse } from "next/server";
import { buildCurriculumPrompt, buildEmailPrompt } from "@/lib/prompts";
import { parseGeneratedEmail, extractEmailFromText } from "@/lib/email-utils";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const MAX_CURRICULUM_FILE_SIZE = 10 * 1024 * 1024;

type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

class BadRequestError extends Error {}

async function callGemini(promptOrParts: string | GeminiPart[]) {
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
    const description = formData.get("description");
    const curriculum = formData.get("curriculum");
    const curriculumFile = formData.get("curriculumFile");

    if (curriculumFile instanceof File && curriculumFile.size > 0) {
      return {
        description: typeof description === "string" ? description : "",
        curriculum: await readCurriculumFile(curriculumFile),
      };
    }

    return {
      description: typeof description === "string" ? description : "",
      curriculum: typeof curriculum === "string" ? curriculum : "",
    };
  }

  const body = await req.json();

  return {
    description: typeof body.description === "string" ? body.description : "",
    curriculum: typeof body.curriculum === "string" ? body.curriculum : "",
  };
}

export async function POST(req: NextRequest) {
  try {
    const { description, curriculum } = await parseAnalysisRequest(req);

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

    const { subject, body } = parseGeneratedEmail(resultEmail);
    const recruiterEmail = extractEmailFromText(description);

    return NextResponse.json({
      curriculum: resultCurriculum,
      email: resultEmail,
      emailSubject: subject,
      emailBody: body,
      recruiterEmail,
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
