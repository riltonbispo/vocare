"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  FileText,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { ApplicationListItem } from "@/components/dashboard/application-list-item";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnonymousSession } from "@/hooks/use-anonymous-session";
import { useUserApplications } from "@/hooks/use-user-applications";
import { getUserProfile } from "@/lib/user-profile";
import { cn } from "@/lib/utils";

function ApplicationsSkeleton() {
  return (
    <div
      className="space-y-3"
      role="status"
      aria-live="polite"
      aria-label="Carregando análises recentes"
    >
      <span className="sr-only">Carregando análises recentes...</span>
      {Array.from({ length: 3 }, (_, index) => (
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

export default function InicioPage() {
  const { user, loading: userLoading } = useAnonymousSession();
  const profile = getUserProfile(user);
  const recentQuery = useUserApplications({
    pageSize: 3,
    analysisStatus: "completed",
  });
  const draftQuery = useUserApplications({
    pageSize: 1,
    analysisStatus: "pending",
  });
  const draft = draftQuery.applications[0];
  const lastCompleted = recentQuery.applications[0];

  return (
    <div className="space-y-8 lg:space-y-10">
      <header>
        <p className="mb-2 text-sm font-medium text-muted-foreground">
          Visão geral
        </p>
        {userLoading ? (
          <Skeleton className="h-10 w-64 max-w-full" />
        ) : (
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Olá, {profile.firstName}
          </h1>
        )}
        <p className="mt-2 text-muted-foreground">
          Acompanhe suas análises e prepare-se para a próxima oportunidade.
        </p>
      </header>

      {draftQuery.isLoading ? (
        <Skeleton className="h-48 w-full rounded-3xl" />
      ) : draftQuery.error ? (
        <section
          className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 sm:p-8"
          role="alert"
        >
          <h2 className="font-heading text-xl font-semibold">
            Não foi possível verificar análises em andamento
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {draftQuery.error.message}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-5"
            onClick={() => {
              if (draftQuery.authError) {
                window.location.reload();
              } else {
                void draftQuery.refetch();
              }
            }}
          >
            Tentar novamente
          </Button>
        </section>
      ) : draft ? (
        <section className="overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="mb-3 text-sm font-medium text-primary-foreground/65">
                Continue de onde parou
              </p>
              <h2 className="font-heading text-2xl font-semibold sm:text-3xl">
                Voltar para sua análise de {draft.empresa ?? "uma nova vaga"}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-primary-foreground/70 sm:text-base">
                Sua análise ainda está em andamento. Abra o registro para
                conferir o progresso ou comece uma nova oportunidade.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/nova-analise"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "border-primary-foreground/20 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground",
                )}
              >
                Nova análise
              </Link>
              <Link
                href={`/historico/${draft.id}`}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-primary-foreground text-primary hover:bg-primary-foreground/90",
                )}
              >
                Abrir análise
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border bg-card p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Bem-vindo à sua área Vocare
              </p>
              <h2 className="mt-2 font-heading text-xl font-semibold sm:text-2xl">
                {recentQuery.total > 0
                  ? "Pronto para a próxima oportunidade?"
                  : "Comece sua primeira análise"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Compare seu currículo com uma vaga e receba uma versão
                otimizada para destacar o que você tem de melhor.
              </p>
            </div>
            <Link
              href="/nova-analise"
              className={buttonVariants({ size: "lg", className: "shrink-0" })}
            >
              <Sparkles aria-hidden="true" />
              Começar agora
            </Link>
          </div>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        {recentQuery.isLoading ? (
          <>
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
          </>
        ) : (
          <>
            <StatCard
              title="Seu currículo"
              description="Acesse a versão otimizada mais recente e continue refinando sua apresentação."
              actionLabel="Ver currículo otimizado"
              href={
                lastCompleted ? `/historico/${lastCompleted.id}` : undefined
              }
              icon={FileText}
            />
            <StatCard
              title="Nova análise"
              description="Envie uma vaga e descubra como adaptar seu currículo para destacar sua experiência relevante."
              actionLabel="Começar análise"
              href="/nova-analise"
              icon={Sparkles}
              featured
            />
          </>
        )}
      </section>

      <section aria-labelledby="recent-applications-title">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2
              id="recent-applications-title"
              className="font-heading text-xl font-semibold sm:text-2xl"
            >
              Vagas que você analisou
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Suas análises mais recentes.
            </p>
          </div>
          <Link
            href="/candidaturas"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "shrink-0",
            )}
          >
            Ver todas
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>

        {recentQuery.isLoading ? (
          <ApplicationsSkeleton />
        ) : recentQuery.error ? (
          <div
            className="flex min-h-48 flex-col items-center justify-center rounded-2xl border bg-card px-5 py-8 text-center"
            role="alert"
          >
            <BriefcaseBusiness
              className="mb-4 size-6 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="font-medium">Não foi possível carregar suas análises</p>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {recentQuery.error.message}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-5"
              onClick={() => {
                if (recentQuery.authError) {
                  window.location.reload();
                } else {
                  void recentQuery.refetch();
                }
              }}
            >
              Tentar novamente
            </Button>
          </div>
        ) : recentQuery.applications.length === 0 ? (
          <EmptyState
            icon={BriefcaseBusiness}
            title="Nenhuma análise por aqui ainda"
            description="Crie sua primeira análise e ela aparecerá aqui para você consultar quando quiser."
            actionLabel="Criar primeira análise"
            href="/nova-analise"
            headingLevel="h3"
          />
        ) : (
          <div className="space-y-3">
            {recentQuery.applications.map((application) => (
              <ApplicationListItem
                key={application.id}
                id={application.id}
                title={application.vaga_titulo}
                company={application.empresa}
                status={application.status}
                createdAt={application.created_at}
                analysisStatus={application.analysis_status}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
