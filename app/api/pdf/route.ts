import { renderToBuffer } from "@react-pdf/renderer";
import { NextRequest, NextResponse } from "next/server";

import {
  createCoverLetterPdf,
  createResumePdf,
} from "@/lib/pdf-document";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_CONTENT_LENGTH = 500_000;

type PdfDocumentType = "resume" | "cover-letter";

function isPdfDocumentType(value: unknown): value is PdfDocumentType {
  return value === "resume" || value === "cover-letter";
}

function safeFilename(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;

  const filename = value
    .trim()
    .replace(/\.pdf$/i, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 100);

  return filename || fallback;
}

export async function POST(req: NextRequest) {
  try {
    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Corpo da requisição inválido." },
        { status: 400 },
      );
    }

    const payload = body as Record<string, unknown>;
    const documentType =
      payload.documentType === undefined ? "resume" : payload.documentType;

    if (!isPdfDocumentType(documentType)) {
      return NextResponse.json(
        { error: "Tipo de documento inválido." },
        { status: 400 },
      );
    }

    if (typeof payload.markdown !== "string" || !payload.markdown.trim()) {
      return NextResponse.json(
        { error: "Conteúdo é obrigatório." },
        { status: 400 },
      );
    }

    if (payload.markdown.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: "Conteúdo excede o limite permitido." },
        { status: 400 },
      );
    }

    const fallbackFilename =
      documentType === "cover-letter" ? "carta-de-apresentacao" : "curriculo";
    const filename = safeFilename(payload.filename, fallbackFilename);
    const document =
      documentType === "cover-letter"
        ? createCoverLetterPdf(payload.markdown)
        : createResumePdf(payload.markdown);
    const pdfBuffer = await renderToBuffer(document);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Falha ao gerar PDF." }, { status: 500 });
  }
}
