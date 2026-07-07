import { NextRequest, NextResponse } from "next/server";
import { buildResumeHtml } from "@/lib/pdf-template";

export async function POST(req: NextRequest) {
  try {
    const { markdown, filename = "curriculo" } = await req.json();

    if (!markdown?.trim()) {
      return NextResponse.json(
        { error: "Markdown é obrigatório." },
        { status: 400 }
      );
    }

    const html = buildResumeHtml(markdown);
    const isLocal = process.env.NODE_ENV === "development";

    let browser;

    if (isLocal) {
      // Dev: usa o puppeteer completo (Chromium próprio baixado localmente)
      const puppeteer = await import("puppeteer");
      browser = await puppeteer.launch({ headless: true });
    } else {
      // Produção/serverless: puppeteer-core + chromium otimizado pra Lambda
      const puppeteer = await import("puppeteer-core");
      const chromium = (await import("@sparticuz/chromium")).default;

      browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
      });
    }

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0px", bottom: "0px", left: "0px", right: "0px" },
    });

    await browser.close();

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
  }
}