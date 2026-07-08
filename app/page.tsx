"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnalysisResults } from "@/components/analysis-results";

interface AnalysisResult {
  curriculum: string;
  email: string;
  emailSubject: string;
  emailBody: string;
  recruiterEmail: string | null;
}

export default function Home() {
  const [description, setDescription] = useState("");
  const [curriculum, setCurriculum] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, curriculum }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao processar.");
      }

      const data: AnalysisResult = await res.json();
      setResult(data);
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
          Cole a descrição da vaga e o seu currículo em Markdown. A IA irá
          adaptar seu currículo mantendo sua experiência verdadeira e
          aumentar sua aderência à vaga.
        </p>
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
              Utilize Markdown para estruturar seu currículo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={curriculum}
              onChange={(e) => setCurriculum(e.target.value)}
              placeholder={`# João Silva\n\n## Experiência\n\n### Desenvolvedor Full Stack\n- Ruby on Rails\n- React\n- PostgreSQL`}
              className="min-h-[420px] max-h-72 resize-none font-mono"
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 flex flex-col items-end gap-2">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          size="lg"
          className="gap-2"
          onClick={handleSubmit}
          disabled={loading || !description.trim() || !curriculum.trim()}
        >
          <HugeiconsIcon icon={SparklesIcon} />
          {loading ? "Analisando..." : "Analisar com IA"}
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