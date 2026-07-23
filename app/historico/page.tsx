"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { ConversionBanner } from "@/components/conversion-banner";
import { useAnonymousSession } from "@/hooks/use-anonymous-session";
import { createClient } from "@/lib/supabase/client";
import type { Candidatura } from "@/lib/supabase/database.types";

type CandidaturaResumo = Pick<
  Candidatura,
  "id" | "vaga_titulo" | "empresa" | "status" | "created_at"
>;

const statusLabels: Record<string, string> = {
  gerado: "Gerado",
  enviado: "Enviado",
  entrevista: "Entrevista",
  rejeitado: "Rejeitado",
  oferta: "Oferta",
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
});

function HistorySkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }, (_, index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function HistoricoPage() {
  const { session, isAnonymous, loading: sessionLoading, error: sessionError } =
    useAnonymousSession();
  const [candidaturas, setCandidaturas] = useState<CandidaturaResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    let active = true;

    async function loadCandidaturas() {
      try {
        const supabase = createClient();
        const { data, error: queryError } = await supabase
          .from("candidaturas")
          .select("id, vaga_titulo, empresa, status, created_at")
          .order("created_at", { ascending: false });

        if (queryError) throw queryError;
        if (active) setCandidaturas(data);
      } catch (queryError) {
        if (!active) return;
        setError(
          queryError instanceof Error
            ? queryError.message
            : "Não foi possível carregar o histórico."
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadCandidaturas();

    return () => {
      active = false;
    };
  }, [session, sessionLoading]);

  const visibleError = error ?? sessionError;

  return (
    <main className="container mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Histórico</h1>
        <p className="mt-2 text-muted-foreground">
          Acompanhe os materiais gerados para cada candidatura.
        </p>
      </div>

      {isAnonymous && candidaturas.length > 0 && (
        <div className="mb-6">
          <ConversionBanner />
        </div>
      )}

      {visibleError && (
        <p className="mb-6 text-sm text-destructive">{visibleError}</p>
      )}

      {sessionLoading || (session !== null && loading) ? (
        <HistorySkeleton />
      ) : candidaturas.length === 0 ? (
        <Empty className="min-h-80 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={Briefcase01Icon} />
            </EmptyMedia>
            <EmptyTitle>Nenhuma candidatura ainda</EmptyTitle>
            <EmptyDescription>
              Sua próxima análise aparecerá aqui automaticamente.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href="/" className={buttonVariants()}>
              Gerar primeira análise
            </Link>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {candidaturas.map((candidatura) => (
            <Card key={candidatura.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate">
                      {candidatura.vaga_titulo || "Vaga sem título"}
                    </CardTitle>
                    <CardDescription className="mt-1 truncate">
                      {candidatura.empresa || "Empresa não informada"}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {statusLabels[candidatura.status] ?? candidatura.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Gerado em {dateFormatter.format(new Date(candidatura.created_at))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
