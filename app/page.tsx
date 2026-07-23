"use client";

import { useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnalysisResults } from "@/components/analysis-results";
import { useAnonymousSession } from "@/hooks/use-anonymous-session";

interface AnalysisResult {
  curriculum: string;
  email: string;
  emailSubject: string;
  emailBody: string;
  recruiterEmail: string | null;
  vagaTitulo: string | null;
  empresa: string | null;
}

export default function Home() {
  const {
    session,
    loading: sessionLoading,
    error: sessionError,
  } = useAnonymousSession();
  const [vagaTitulo, setVagaTitulo] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [description, setDescription] = useState("");
  const [curriculum, setCurriculum] = useState("");
  const [curriculumFile, setCurriculumFile] = useState<File | null>(null);
  const [curriculumFileInputKey, setCurriculumFileInputKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasCurriculum = Boolean(curriculum.trim() || curriculumFile);

  function resetCurriculumFile() {
    setCurriculumFile(null);
    setCurriculumFileInputKey((key) => key + 1);
  }

  async function handleCurriculumFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0] ?? null;

    setError(null);

    if (!file) {
      resetCurriculumFile();
      return;
    }

    if (
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf")
    ) {
      setCurriculumFile(file);
      return;
    }

    if (
      ["text/markdown", "text/plain"].includes(file.type) ||
      /\.(md|markdown|txt)$/i.test(file.name)
    ) {
      try {
        setCurriculum(await file.text());
        resetCurriculumFile();
      } catch {
        setError("Não foi possível ler o arquivo selecionado.");
      }

      return;
    }

    setError("Envie um currículo em PDF, Markdown ou TXT.");
    resetCurriculumFile();
  }

  async function handleSubmit() {
    if (!session) {
      setError(sessionError ?? "Aguarde enquanto preparamos sua sessão.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("vagaTitulo", vagaTitulo);
      formData.append("empresa", empresa);
      formData.append("description", description);
      formData.append("curriculum", curriculum);

      if (curriculumFile) {
        formData.append("curriculumFile", curriculumFile);
      }

      const res = curriculumFile
        ? await fetch("/api/analyze", {
            method: "POST",
            body: formData,
          })
        : await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              vagaTitulo,
              empresa,
              description,
              curriculum,
            }),
          });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao processar.");
      }

      const data: AnalysisResult = await res.json();
      setResult(data);
      setVagaTitulo((current) => current.trim() || data.vagaTitulo || "");
      setEmpresa((current) => current.trim() || data.empresa || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container mx-auto max-w-7xl py-10 px-6">
      <div className="mb-8 flex flex-col gap-3">
        <Badge className="w-fit">TalentFlow AI</Badge>
        <h1 className="text-4xl font-bold tracking-tight">
          Otimize seu currículo para qualquer vaga.
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Cole a descrição da vaga e envie seu currículo em PDF ou Markdown. A
          IA irá adaptar seu currículo mantendo sua experiência verdadeira e
          aumentar sua aderência à vaga.
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="vaga-titulo">Título da vaga (opcional)</Label>
          <Input
            id="vaga-titulo"
            value={vagaTitulo}
            onChange={(event) => setVagaTitulo(event.target.value)}
            placeholder="Ex.: Desenvolvedor Full Stack"
          />
          <p className="text-xs text-muted-foreground">
            Se ficar vazio, será identificado pela descrição.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="empresa">Empresa (opcional)</Label>
          <Input
            id="empresa"
            value={empresa}
            onChange={(event) => setEmpresa(event.target.value)}
            placeholder="Ex.: Acme"
          />
          <p className="text-xs text-muted-foreground">
            Se ficar vazio, será identificado pela descrição.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Descrição da vaga</CardTitle>
            <CardDescription>
              Cole aqui o texto completo da vaga.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Cole aqui a descrição da vaga..."
              className="min-h-[420px] max-h-72 resize-none"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Currículo</CardTitle>
            <CardDescription>
              Cole em Markdown ou selecione um arquivo PDF.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium">Arquivo</p>
                <p className="truncate text-sm text-muted-foreground">
                  {curriculumFile
                    ? curriculumFile.name
                    : "PDF, Markdown ou TXT"}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:w-64">
                <Input
                  key={curriculumFileInputKey}
                  type="file"
                  accept=".pdf,.md,.markdown,.txt,application/pdf,text/markdown,text/plain"
                  onChange={handleCurriculumFileChange}
                />
                {curriculumFile && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={resetCurriculumFile}
                  >
                    Remover PDF
                  </Button>
                )}
              </div>
            </div>
            <Textarea
              value={curriculumFile ? "" : curriculum}
              onChange={(e) => setCurriculum(e.target.value)}
              placeholder={
                curriculumFile
                  ? "PDF selecionado para análise."
                  : `# João Silva\n\n## Experiência\n\n### Desenvolvedor Full Stack\n- Ruby on Rails\n- React\n- PostgreSQL`
              }
              disabled={Boolean(curriculumFile)}
              className="min-h-[420px] max-h-72 resize-none font-mono disabled:opacity-60"
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 flex flex-col items-end gap-2">
        {(error || sessionError) && (
          <p className="text-sm text-destructive">{error ?? sessionError}</p>
        )}
        <Button
          size="lg"
          className="gap-2"
          onClick={handleSubmit}
          disabled={
            loading || sessionLoading || !description.trim() || !hasCurriculum
          }
        >
          <HugeiconsIcon icon={SparklesIcon} />
          {sessionLoading
            ? "Preparando sessão..."
            : loading
              ? "Analisando..."
              : "Analisar com IA"}
        </Button>
      </div>

      {result && (
        <AnalysisResults
          curriculum={result.curriculum}
          emailSubject={result.emailSubject}
          emailBody={result.emailBody}
          recruiterEmail={result.recruiterEmail}
        />
      )}
    </main>
  );
}
