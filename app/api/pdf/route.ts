import { NextRequest, NextResponse } from "next/server";
import { buildCoverLetterHtml, buildResumeHtml } from "@/lib/pdf-template";

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
  let browser: import("puppeteer-core").Browser | undefined;

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
    const html =
      documentType === "cover-letter"
        ? buildCoverLetterHtml(payload.markdown)
        : buildResumeHtml(payload.markdown);
    const isLocal = process.env.NODE_ENV === "development";

    if (isLocal) {
      // Dev: usa o puppeteer completo (Chromium próprio baixado localmente)
      const puppeteer = await import("puppeteer");
      browser = await puppeteer.launch({ headless: true });
    } else {
      // Produção/serverless: puppeteer-core + chromium otimizado pra Lambda
      const puppeteer = await import("puppeteer-core");
      const chromium = (await import("@sparticuz/chromium")).default;

      browser = await puppeteer.launch({
        args: await puppeteer.defaultArgs({
          args: chromium.args,
          headless: "shell",
        }),
        executablePath: await chromium.executablePath(),
        headless: "shell",
      });
    }

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });

    const pdfBuffer = Buffer.from(
      await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "0px", bottom: "0px", left: "0px", right: "0px" },
      })
    );

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao gerar PDF." },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close().catch((error) => {
        console.error("Falha ao fechar o navegador do gerador de PDF.", error);
      });
    }
  }
}
