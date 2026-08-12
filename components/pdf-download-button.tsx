"use client";

import { useState, type ComponentProps } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { triggerBlobDownload } from "@/lib/browser/download";

type PdfDocumentType = "resume" | "cover-letter";

type PdfDownloadButtonProps = Omit<
  ComponentProps<typeof Button>,
  "children" | "onClick"
> & {
  content: string;
  documentType: PdfDocumentType;
  filename: string;
  label?: string;
  loadingLabel?: string;
  successMessage?: string;
};

export function PdfDownloadButton({
  content,
  documentType,
  filename,
  label = "Baixar PDF",
  loadingLabel = "Gerando PDF...",
  successMessage = "PDF gerado para download.",
  disabled,
  ...props
}: PdfDownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);

  async function downloadPdf() {
    setDownloading(true);

    try {
      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markdown: content,
          filename,
          documentType,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Não foi possível gerar o PDF.");
      }

      triggerBlobDownload(await response.blob(), `${filename}.pdf`);
      toast.success(successMessage);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível gerar o PDF.",
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Button
      type="button"
      aria-live="polite"
      aria-busy={downloading}
      {...props}
      disabled={disabled || downloading || !content.trim()}
      onClick={() => void downloadPdf()}
    >
      {downloading ? loadingLabel : label}
    </Button>
  );
}
