"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConversionBanner } from "@/components/conversion-banner";
import { useAnonymousSession } from "@/hooks/use-anonymous-session";
import type { ApplicationChannel } from "@/lib/application-channels";
import { createClient } from "@/lib/supabase/client";
import type { Candidatura } from "@/lib/supabase/database.types";
import { applicationStatusLabels } from "@/lib/applications";

type CandidaturaResumo = Pick<
  Candidatura,
  "id" | "vaga_titulo" | "empresa" | "status" | "created_at"
> & {
  channels: ApplicationChannel[];
};

type HistoryData = {
  applications: CandidaturaResumo[];
  channels: ApplicationChannel[];
  channelsAvailable: boolean;
};

type HistoryQueryKey = readonly ["application-history", string];

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
});

function isMissingChannelTableError(
  error: { code?: string; message?: string } | null,
  table: "application_channel_assignments" | "application_channels",
) {
  return (
    error?.code === "PGRST205" &&
    error.message?.includes(`public.${table}`)
  );
}

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

async function fetchHistory(userId: string): Promise<HistoryData> {
  const supabase = createClient();
  const [applicationsResult, assignmentsResult, channelsResult] =
    await Promise.all([
      supabase
        .from("candidaturas")
        .select("id, vaga_titulo, empresa, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("application_channel_assignments")
        .select("application_id, channel_id")
        .eq("user_id", userId),
      supabase
        .from("application_channels")
        .select("id, name")
        .eq("user_id", userId)
        .order("name", { ascending: true }),
    ]);

  if (applicationsResult.error) throw applicationsResult.error;
  const assignmentsTableMissing = isMissingChannelTableError(
    assignmentsResult.error,
    "application_channel_assignments",
  );
  const channelsTableMissing = isMissingChannelTableError(
    channelsResult.error,
    "application_channels",
  );

  if (assignmentsResult.error && !assignmentsTableMissing) {
    throw assignmentsResult.error;
  }
  if (channelsResult.error && !channelsTableMissing) {
    throw channelsResult.error;
  }

  const channelsAvailable =
    !assignmentsTableMissing && !channelsTableMissing;
  const channels = channelsAvailable ? (channelsResult.data ?? []) : [];
  const assignments = channelsAvailable
    ? (assignmentsResult.data ?? [])
    : [];
  const channelById = new Map(
    channels.map((channel) => [channel.id, channel]),
  );
  const channelsByApplication = new Map<string, ApplicationChannel[]>();

  for (const assignment of assignments) {
    const channel = channelById.get(assignment.channel_id);
    if (!channel) continue;

    const applicationChannels =
      channelsByApplication.get(assignment.application_id) ?? [];
    applicationChannels.push(channel);
    channelsByApplication.set(assignment.application_id, applicationChannels);
  }

  return {
    applications: applicationsResult.data.map((application) => ({
      ...application,
      channels: (channelsByApplication.get(application.id) ?? [])
        .slice()
        .sort((first, second) =>
          first.name.localeCompare(second.name, "pt-BR"),
        ),
    })),
    channels,
    channelsAvailable,
  };
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
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  const historyQueryKey: HistoryQueryKey = [
    "application-history",
    userId ?? "sem-sessao",
  ];
  const historyQuery = useQuery({
    queryKey: historyQueryKey,
    queryFn: () => fetchHistory(userId ?? ""),
    enabled: Boolean(userId),
  });
  const [candidaturaParaExcluir, setCandidaturaParaExcluir] =
    useState<CandidaturaResumo | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState("all");
  const candidaturas = historyQuery.data?.applications ?? [];
  const channels = historyQuery.data?.channels ?? [];
  const effectiveChannelId =
    selectedChannelId === "all" ||
    channels.some((channel) => channel.id === selectedChannelId)
      ? selectedChannelId
      : "all";
  const filteredCandidaturas =
    effectiveChannelId === "all"
      ? candidaturas
      : candidaturas.filter((candidatura) =>
          candidatura.channels.some(
            (channel) => channel.id === effectiveChannelId,
          ),
        );

  async function handleDelete() {
    if (!candidaturaParaExcluir) return;

    const deletedId = candidaturaParaExcluir.id;
    setExcluindo(true);

    try {
      await queryClient.cancelQueries({
        queryKey: historyQueryKey,
        exact: true,
      });
      await deleteCandidatura(deletedId);
      queryClient.setQueryData<HistoryData>(historyQueryKey, (current) =>
        current
          ? {
              ...current,
              applications: current.applications.filter(
                (candidatura) => candidatura.id !== deletedId,
              ),
            }
          : current,
      );
      void queryClient.invalidateQueries({
        queryKey: historyQueryKey,
        exact: true,
      });
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

  const visibleError =
    sessionError ??
    (historyQuery.error instanceof Error
      ? historyQuery.error.message
      : historyQuery.error
        ? "Não foi possível carregar o histórico."
        : null);

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

      {historyQuery.data && !historyQuery.data.channelsAvailable && (
        <Alert className="mb-6">
          <AlertTitle>Histórico carregado sem canais</AlertTitle>
          <AlertDescription>
            Os canais de candidatura ainda não estão disponíveis neste
            ambiente. O restante do histórico continua acessível.
          </AlertDescription>
        </Alert>
      )}

      {visibleError && historyQuery.data && (
        <p className="mb-6 text-sm text-destructive">{visibleError}</p>
      )}

      {!sessionLoading && historyQuery.data?.channelsAvailable && (
        <div className="mb-6 grid max-w-sm gap-2">
          <Label htmlFor="history-channel-filter">Filtrar por canal</Label>
          <Select
            value={effectiveChannelId}
            onValueChange={(value) => setSelectedChannelId(value ?? "all")}
          >
            <SelectTrigger
              id="history-channel-filter"
              className="w-full"
              aria-label="Filtrar histórico por canal"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os canais</SelectItem>
              {channels.map((channel) => (
                <SelectItem key={channel.id} value={channel.id}>
                  {channel.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {sessionLoading || (Boolean(userId) && historyQuery.isPending) ? (
        <HistorySkeleton />
      ) : visibleError && !historyQuery.data ? (
        <Empty className="min-h-80 border" role="alert">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={Briefcase01Icon} />
            </EmptyMedia>
            <EmptyTitle>Não foi possível carregar o histórico</EmptyTitle>
            <EmptyDescription>{visibleError}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (userId) {
                  void historyQuery.refetch();
                } else {
                  window.location.reload();
                }
              }}
            >
              Tentar novamente
            </Button>
          </EmptyContent>
        </Empty>
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
      ) : filteredCandidaturas.length === 0 ? (
        <Empty className="min-h-80 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={Briefcase01Icon} />
            </EmptyMedia>
            <EmptyTitle>Nenhuma candidatura neste canal</EmptyTitle>
            <EmptyDescription>
              Selecione outro canal para consultar o restante do histórico.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedChannelId("all")}
            >
              Mostrar todos os canais
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCandidaturas.map((candidatura) => (
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
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <CardTitle
                      className="truncate"
                      title={candidatura.vaga_titulo || "Vaga sem título"}
                    >
                      {candidatura.vaga_titulo || "Vaga sem título"}
                    </CardTitle>
                    <CardDescription className="mt-1 truncate">
                      {candidatura.empresa || "Empresa não informada"}
                    </CardDescription>
                  </div>
                  <div className="relative z-10 flex shrink-0 items-center gap-1">
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
              <CardContent className="pointer-events-none relative grid gap-3 text-sm text-muted-foreground">
                {candidatura.channels.length > 0 && (
                  <ul
                    className="flex flex-wrap gap-1"
                    aria-label="Canais de candidatura"
                  >
                    {candidatura.channels.map((channel) => (
                      <li key={channel.id}>
                        <Badge variant="outline">{channel.name}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
                <p>
                  Analisado em{" "}
                  {dateFormatter.format(new Date(candidatura.created_at))}
                </p>
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
