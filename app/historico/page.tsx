"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase01Icon,
  Delete01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Button, buttonVariants } from "@/components/ui/button";
import { ConversionBanner } from "@/components/conversion-banner";
import { useAnonymousSession } from "@/hooks/use-anonymous-session";
import { createClient } from "@/lib/supabase/client";
import type { Candidatura } from "@/lib/supabase/database.types";
import { applicationStatusLabels } from "@/lib/applications";

type CandidaturaResumo = Pick<
  Candidatura,
  "id" | "vaga_titulo" | "empresa" | "status" | "created_at"
>;

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
});

async function deleteCandidatura(id: string) {
  const response = await fetch(`/api/applications/${id}`, {
    method: "DELETE",
  });
  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  if (!response.ok) {
    throw new Error(
      body?.error ?? "Não foi possível excluir a candidatura.",
    );
  }
}

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
  const [candidaturaParaExcluir, setCandidaturaParaExcluir] =
    useState<CandidaturaResumo | null>(null);
  const [excluindo, setExcluindo] = useState(false);

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

  async function handleDelete() {
    if (!candidaturaParaExcluir) return;

    setExcluindo(true);

    try {
      await deleteCandidatura(candidaturaParaExcluir.id);
      setCandidaturas((current) =>
        current.filter(
          (candidatura) => candidatura.id !== candidaturaParaExcluir.id,
        ),
      );
      setCandidaturaParaExcluir(null);
      toast.success("Candidatura excluída do histórico.");
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : "Não foi possível excluir a candidatura.",
      );
    } finally {
      setExcluindo(false);
    }
  }

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
            <Card
              key={candidatura.id}
              className="relative h-full transition-colors hover:bg-muted/40"
            >
              <Link
                href={`/historico/${candidatura.id}`}
                className="absolute inset-0 rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                aria-label={`Ver detalhes de ${
                  candidatura.vaga_titulo || "vaga sem título"
                }`}
              />
              <CardHeader className="pointer-events-none relative">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate">
                      {candidatura.vaga_titulo || "Vaga sem título"}
                    </CardTitle>
                    <CardDescription className="mt-1 truncate">
                      {candidatura.empresa || "Empresa não informada"}
                    </CardDescription>
                  </div>
                  <div className="relative z-10 flex items-center gap-1">
                    <Badge variant="secondary">
                      {applicationStatusLabels[candidatura.status]}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="pointer-events-auto text-muted-foreground hover:text-destructive"
                      aria-label={`Excluir candidatura ${
                        candidatura.vaga_titulo || "sem título"
                      }`}
                      title="Excluir candidatura"
                      onClick={() => setCandidaturaParaExcluir(candidatura)}
                    >
                      <HugeiconsIcon icon={Delete01Icon} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pointer-events-none relative text-sm text-muted-foreground">
                Analisado em{" "}
                {dateFormatter.format(new Date(candidatura.created_at))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog
        open={Boolean(candidaturaParaExcluir)}
        onOpenChange={(open) => {
          if (!open && !excluindo) setCandidaturaParaExcluir(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <HugeiconsIcon icon={Delete01Icon} />
            </AlertDialogMedia>
            <AlertDialogTitle>Excluir candidatura?</AlertDialogTitle>
            <AlertDialogDescription>
              A candidatura para{" "}
              <strong>
                {candidaturaParaExcluir?.vaga_titulo || "vaga sem título"}
              </strong>{" "}
              será removida permanentemente do histórico. Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluindo}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={excluindo}
              onClick={() => void handleDelete()}
            >
              {excluindo ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
