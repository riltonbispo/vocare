"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BriefcaseBusiness, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ApplicationListItem } from "@/components/dashboard/application-list-item";
import { EmptyState } from "@/components/dashboard/empty-state";
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useUserApplications,
  userApplicationsKeys,
  type UserApplication,
} from "@/hooks/use-user-applications";

function ApplicationsSkeleton() {
  return (
    <div
      className="space-y-3"
      role="status"
      aria-live="polite"
      aria-label="Carregando candidaturas"
    >
      <span className="sr-only">Carregando candidaturas...</span>
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 rounded-2xl border bg-card p-4"
        >
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3 max-w-72" />
            <Skeleton className="h-3 w-1/3 max-w-40" />
          </div>
          <Skeleton className="hidden h-4 w-24 sm:block" />
        </div>
      ))}
    </div>
  );
}

async function deleteApplication(id: string) {
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

export default function CandidaturasPage() {
  const queryClient = useQueryClient();
  const [applicationToDelete, setApplicationToDelete] =
    useState<UserApplication | null>(null);
  const applicationsQuery = useUserApplications({
    pageSize: 10,
    analysisStatus: "all",
  });
  const totalQuery = useUserApplications({
    pageSize: 1,
    analysisStatus: "all",
  });
  const totalApplications = totalQuery.error
    ? applicationsQuery.total
    : totalQuery.total;
  const deleteMutation = useMutation({
    mutationFn: (application: UserApplication) =>
      deleteApplication(application.id),
    async onSuccess(_data, application) {
      setApplicationToDelete(null);
      if (applicationsQuery.userId) {
        await queryClient.invalidateQueries({
          queryKey: userApplicationsKeys.byUser(applicationsQuery.userId),
        });
      }
      toast.success(
        `Candidatura “${application.vaga_titulo || "Vaga sem título"}” excluída.`,
      );
    },
    onError(error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir a candidatura.",
      );
    },
  });

  return (
    <div className="space-y-7">
      <header>
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            Histórico de análises
          </p>
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              Candidaturas
            </h1>
            {totalQuery.isLoading ? (
              <Skeleton className="h-5 w-20" />
            ) : (
              <span className="text-sm text-muted-foreground">
                {totalApplications}{" "}
                {totalApplications === 1 ? "análise" : "análises"}
              </span>
            )}
          </div>
          <p className="mt-2 text-muted-foreground">
            Consulte todas as vagas que você já comparou com seu currículo.
          </p>
        </div>
      </header>

      {applicationsQuery.isLoading ? (
        <ApplicationsSkeleton />
      ) : applicationsQuery.error &&
        applicationsQuery.applications.length === 0 ? (
        <div
          className="flex min-h-72 flex-col items-center justify-center rounded-2xl border bg-card px-5 py-10 text-center"
          role="alert"
        >
          <BriefcaseBusiness
            className="mb-4 size-7 text-muted-foreground"
            aria-hidden="true"
          />
          <h2 className="font-heading text-lg font-medium">
            Não foi possível carregar suas candidaturas
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            {applicationsQuery.error.message}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-6"
            onClick={() => {
              if (applicationsQuery.authError) {
                window.location.reload();
              } else {
                void applicationsQuery.refetch();
              }
            }}
          >
            Tentar novamente
          </Button>
        </div>
      ) : applicationsQuery.applications.length === 0 ? (
        <EmptyState
          icon={BriefcaseBusiness}
          title="Nenhuma candidatura ainda"
          description="Quando você concluir uma análise, a vaga aparecerá aqui para consulta."
          actionLabel="Criar primeira análise"
          href="/nova-analise"
        />
      ) : (
        <div className="space-y-4">
          {applicationsQuery.error && (
            <div
              className="flex flex-col gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"
              role="alert"
            >
              <p>Não foi possível atualizar a lista. Tente novamente.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (applicationsQuery.authError) {
                    window.location.reload();
                  } else {
                    void applicationsQuery.refetch();
                  }
                }}
              >
                Tentar novamente
              </Button>
            </div>
          )}

          <div className="space-y-3">
            {applicationsQuery.applications.map((application) => (
              <ApplicationListItem
                key={application.id}
                id={application.id}
                title={application.vaga_titulo}
                company={application.empresa}
                status={application.status}
                createdAt={application.created_at}
                analysisStatus={application.analysis_status}
                deleting={
                  deleteMutation.isPending &&
                  deleteMutation.variables?.id === application.id
                }
                onDelete={() => setApplicationToDelete(application)}
              />
            ))}
          </div>

          {applicationsQuery.hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => void applicationsQuery.fetchNextPage()}
                disabled={applicationsQuery.isFetchingNextPage}
              >
                {applicationsQuery.isFetchingNextPage
                  ? "Carregando..."
                  : "Carregar mais"}
              </Button>
            </div>
          )}
        </div>
      )}

      <AlertDialog
        open={Boolean(applicationToDelete)}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) {
            setApplicationToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2 aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle>Excluir candidatura?</AlertDialogTitle>
            <AlertDialogDescription>
              A candidatura para{" "}
              <strong>
                {applicationToDelete?.vaga_titulo || "vaga sem título"}
              </strong>{" "}
              será removida permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (applicationToDelete) {
                  deleteMutation.mutate(applicationToDelete);
                }
              }}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
