"use client";

import { useState, type ChangeEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { AnalysisResults } from "@/components/analysis-results";
import { TagsInput } from "@/components/tags-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAnonymousSession } from "@/hooks/use-anonymous-session";
import {
  classifyCurriculumFile,
  CURRICULUM_FILE_ACCEPT,
} from "@/lib/curriculum-files";
import {
  APPLICATION_SALARY_MAX_LENGTH,
  HIRING_MODELS,
} from "@/lib/application-job-details";
import type { HiringModel } from "@/lib/supabase/database.types";

const NO_HIRING_MODEL = "not-informed";

interface AnalysisResult {
  curriculum: string;
  email: string;
  emailSubject: string;
  emailBody: string;
  cartaApresentacao: string;
  recruiterEmail: string | null;
  vagaTitulo: string | null;
  empresa: string | null;
  salario: string | null;
  modeloContratacao: HiringModel | null;
  skillsNaoDominadas: string[];
}

export function AnalysisFlow() {
  const queryClient = useQueryClient();
  const {
    session,
    loading: sessionLoading,
    error: sessionError,
  } = useAnonymousSession();
  const [vagaTitulo, setVagaTitulo] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [salario, setSalario] = useState("");
  const [modeloContratacao, setModeloContratacao] =
    useState<HiringModel | null>(null);
  const [skillsNaoDominadas, setSkillsNaoDominadas] = useState<string[]>([]);
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
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0] ?? null;

    setError(null);

    if (!file) {
      resetCurriculumFile();
      return;
    }

    const fileKind = classifyCurriculumFile(file);

    if (fileKind === "pdf") {
      setCurriculumFile(file);
      return;
    }

    if (fileKind === "text") {
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
      formData.append("salario", salario);

      if (modeloContratacao) {
        formData.append("modelo_contratacao", modeloContratacao);
      }

      for (const skill of skillsNaoDominadas) {
        formData.append("skills_nao_dominadas", skill);
      }

      if (curriculumFile) {
        formData.append("curriculumFile", curriculumFile);
      }

      const response = curriculumFile
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
              salario,
              modelo_contratacao: modeloContratacao ?? undefined,
              skills_nao_dominadas: skillsNaoDominadas,
            }),
          });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Erro ao processar.");
      }

      const data = (await response.json()) as AnalysisResult;
      setResult(data);
      setVagaTitulo((current) => current.trim() || data.vagaTitulo || "");
      setEmpresa((current) => current.trim() || data.empresa || "");
      setSalario((current) => current.trim() || data.salario || "");
      setModeloContratacao(
        (current) => current ?? data.modeloContratacao,
      );
      setSkillsNaoDominadas((current) =>
        current.length > 0 ? current : data.skillsNaoDominadas,
      );
      void queryClient.invalidateQueries({
        queryKey: ["user-applications", session.user.id],
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Erro desconhecido.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-w-0">
      <div className="mb-8 flex flex-col gap-3">
        <Badge className="w-fit">Vocare IA</Badge>
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Otimize seu currículo para qualquer vaga.
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Cole a descrição da vaga e envie seu currículo em PDF ou Markdown. A
          IA irá adaptar seu currículo mantendo sua experiência verdadeira e
          destacar os pontos mais relevantes para a vaga.
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

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="salario">Salário (opcional)</Label>
          <Input
            id="salario"
            value={salario}
            onChange={(event) => setSalario(event.target.value)}
            maxLength={APPLICATION_SALARY_MAX_LENGTH}
            placeholder="Ex.: R$ 8.000 a R$ 10.000"
          />
          <p className="text-xs text-muted-foreground">
            Se ficar vazio, será identificado pela descrição.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="modelo-contratacao">
            Modelo de contratação (opcional)
          </Label>
          <Select
            value={modeloContratacao ?? NO_HIRING_MODEL}
            onValueChange={(value) =>
              setModeloContratacao(
                value === NO_HIRING_MODEL ? null : (value as HiringModel),
              )
            }
          >
            <SelectTrigger id="modelo-contratacao" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_HIRING_MODEL}>Não informado</SelectItem>
              {HIRING_MODELS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Se ficar vazio, será identificado pela descrição.
          </p>
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="skills-nao-dominadas">
            Skills que você ainda não domina (opcional)
          </Label>
          <TagsInput
            id="skills-nao-dominadas"
            value={skillsNaoDominadas}
            onValueChange={setSkillsNaoDominadas}
            placeholder="Ex.: Kubernetes"
            aria-describedby="skills-nao-dominadas-help"
          />
          <p
            id="skills-nao-dominadas-help"
            className="text-xs text-muted-foreground"
          >
            Digite uma skill e pressione Enter ou vírgula. Se ficar vazio, a
            IA identificará requisitos da vaga sem evidência no currículo.
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
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Cole aqui a descrição da vaga..."
              className="min-h-72 resize-y lg:min-h-[420px]"
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
                  accept={CURRICULUM_FILE_ACCEPT}
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
              onChange={(event) => setCurriculum(event.target.value)}
              placeholder={
                curriculumFile
                  ? "PDF selecionado para análise."
                  : `# João Silva\n\n## Experiência\n\n### Desenvolvedor Full Stack\n- Ruby on Rails\n- React\n- PostgreSQL`
              }
              disabled={Boolean(curriculumFile)}
              className="min-h-72 resize-y font-mono disabled:opacity-60 lg:min-h-[420px]"
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 flex flex-col items-end gap-2">
        {(error || sessionError) && (
          <p className="text-sm text-destructive" role="alert">
            {error ?? sessionError}
          </p>
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
          cartaApresentacao={result.cartaApresentacao}
          recruiterEmail={result.recruiterEmail}
        />
      )}
    </div>
  );
}
