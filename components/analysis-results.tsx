"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Mail01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CopyButton } from "@/components/copy-button";
import { PdfDownloadButton } from "@/components/pdf-download-button";
import { buildGmailComposeUrl, buildMailtoUrl } from "@/lib/email-utils";
import { triggerBlobDownload } from "@/lib/browser/download";

function downloadFile(content: string, filename: string, type: string) {
  triggerBlobDownload(new Blob([content], { type }), filename);
}

export function AnalysisResults({
  curriculum,
  emailSubject,
  emailBody,
  cartaApresentacao,
  recruiterEmail,
}: {
  curriculum: string;
  emailSubject: string;
  emailBody: string;
  cartaApresentacao: string;
  recruiterEmail: string | null;
}) {
  const [to, setTo] = useState(recruiterEmail ?? "");
  const formattedEmail = `Assunto: ${emailSubject}\n\n${emailBody}`;

  function openGmail() {
    const url = buildGmailComposeUrl({
      to,
      subject: emailSubject,
      body: emailBody,
    });
    window.open(url, "_blank");
  }

  function openMailClient() {
    const url = buildMailtoUrl({ to, subject: emailSubject, body: emailBody });
    window.location.href = url;
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
        <div className="overflow-x-auto pb-1">
          <TabsList>
            <TabsTrigger value="curriculum">📄 Currículo</TabsTrigger>
            <TabsTrigger value="email">✉️ E-mail</TabsTrigger>
            <TabsTrigger value="cover-letter">
              📝 Carta de Apresentação
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="curriculum">
          <div className="grid gap-8 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardContent className="p-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-bold">CURRICULO-OTIMIZADO.md</span>
                  <CopyButton
                    text={curriculum}
                    size="sm"
                    variant="outline"
                    aria-label="Copiar currículo otimizado"
                  />
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
                <CopyButton
                  text={curriculum}
                  variant="outline"
                  label="Copiar Markdown"
                />
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
                <PdfDownloadButton
                  content={curriculum}
                  documentType="resume"
                  filename="curriculo-otimizado"
                  variant="outline"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="email">
          <div className="grid gap-8 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardContent className="p-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-bold">EMAIL.md</span>
                  <CopyButton
                    text={formattedEmail}
                    label="Copiar e-mail"
                    size="sm"
                    variant="outline"
                  />
                </div>
                <div className="divider my-4 border-t" />
                <p className="mb-2 text-sm font-medium">
                  Assunto: {emailSubject}
                </p>
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

                <Button
                  variant="outline"
                  onClick={openMailClient}
                  disabled={!to}
                >
                  Abrir cliente de e-mail padrão
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="cover-letter">
          <Card>
            <CardContent className="p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-bold">CARTA DE APRESENTAÇÃO</span>
                <div className="flex flex-wrap gap-2">
                  <CopyButton
                    text={cartaApresentacao}
                    label="Copiar carta"
                    size="sm"
                    variant="outline"
                  />
                  <PdfDownloadButton
                    content={cartaApresentacao}
                    documentType="cover-letter"
                    filename="carta-de-apresentacao"
                    label="Baixar PDF"
                    size="sm"
                    variant="outline"
                    successMessage="Carta exportada em PDF."
                  />
                </div>
              </div>
              <div className="divider my-4 border-t" />
              <article className="whitespace-pre-wrap leading-7">
                {cartaApresentacao}
              </article>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  );
}
