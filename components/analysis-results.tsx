"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Mail01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { buildGmailComposeUrl, buildMailtoUrl } from "@/lib/email-utils";

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function AnalysisResults({
  curriculum,
  emailSubject,
  emailBody,
  recruiterEmail,
}: {
  curriculum: string;
  emailSubject: string;
  emailBody: string;
  recruiterEmail: string | null;
}) {
  const [copied, setCopied] = useState<"curriculum" | "email" | null>(null);
  const [to, setTo] = useState(recruiterEmail ?? "");


  async function copy(text: string, which: "curriculum" | "email") {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  }

    function openGmail() {
    const url = buildGmailComposeUrl({ to, subject: emailSubject, body: emailBody });
    window.open(url, "_blank");
  }

  function openMailClient() {
    const url = buildMailtoUrl({ to, subject: emailSubject, body: emailBody });
    window.location.href = url;
  }

  async function downloadPdf() {
    const res = await fetch("/api/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        markdown: curriculum,
        filename: "curriculo-otimizado",
      }),
    });

    if (!res.ok) return;

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "curriculo-otimizado.pdf";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="mt-16">
      <div className="mb-8">
        <h2 className="text-4xl font-bold">Resultados</h2>
        <p className="text-muted-foreground">
          Pronto. Revise, copie ou baixe seu material adaptado.
        </p>
      </div>

      <Tabs defaultValue="curriculum">
        <TabsList>
          <TabsTrigger value="curriculum">📄 Currículo</TabsTrigger>
          <TabsTrigger value="email">✉️ E-mail</TabsTrigger>
        </TabsList>

        <TabsContent value="curriculum">
          <div className="grid gap-8 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <span className="font-bold">CURRICULO-OTIMIZADO.md</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copy(curriculum, "curriculum")}
                  >
                    {copied === "curriculum" ? "Copiado!" : "Copiar"}
                  </Button>
                </div>
                <div className="divider my-4 border-t" />
                <article className="prose max-w-none">
                  <ReactMarkdown>{curriculum}</ReactMarkdown>
                </article>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col gap-2 p-8">
                <h3 className="mb-2 font-bold">Ações</h3>
                <Button
                  variant="outline"
                  onClick={() => copy(curriculum, "curriculum")}
                >
                  Copiar Markdown
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    downloadFile(
                      curriculum,
                      "curriculo-otimizado.md",
                      "text/markdown"
                    )
                  }
                >
                  Baixar Markdown
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      <TabsContent value="email">
        <div className="grid gap-8 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardContent className="p-8">
              <span className="font-bold">EMAIL.md</span>
              <div className="divider my-4 border-t" />
              <p className="mb-2 text-sm font-medium">Assunto: {emailSubject}</p>
              <article className="prose max-w-none whitespace-pre-line">
                {emailBody}
              </article>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-3 p-8">
              <h3 className="font-bold">Enviar</h3>

              <Input
                placeholder="destinatario@empresa.com"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />

              <Button onClick={openGmail} disabled={!to} className="gap-2">
                <HugeiconsIcon icon={Mail01Icon} />
                Abrir no Gmail
              </Button>

              <Button variant="outline" onClick={openMailClient} disabled={!to}>
                Abrir cliente de e-mail padrão
              </Button>

              <Button variant="outline" onClick={downloadPdf}>
                 Baixar PDF
              </Button>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
      </Tabs>
    </section>
  );
}