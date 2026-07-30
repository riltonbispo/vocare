"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import {
  Download01Icon,
  Mail01Icon,
  SaveIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import {
  APPLICATION_STATUSES,
  applicationStatusLabels,
  type ApplicationDetail,
} from "@/lib/applications";
import type {
  ApplicationStatus,
  Json,
} from "@/lib/supabase/database.types";
import { triggerBlobDownload } from "@/lib/browser/download";
import {
  buildGmailComposeUrl,
  extractEmailFromText,
  formatOutreachEmail,
  parseOutreachEmail,
} from "@/lib/email-utils";
import { useAnonymousSession } from "@/hooks/use-anonymous-session";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeStyle: "short",
});

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type ApplicationResponse = { application: ApplicationDetail };
type ApplicationQueryKey = readonly ["application", string];
type ApplicationUpdate = Partial<
  Pick<
    ApplicationDetail,
    | "vaga_titulo"
    | "empresa"
    | "curriculo_otimizado"
    | "email_outreach"
    | "status"
    | "notas"
  >
>;

async function parseResponse(response: Response): Promise<ApplicationResponse> {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
    application?: ApplicationDetail;
  } | null;

  if (!response.ok || !body?.application) {
    throw new ApiError(
      body?.error ?? "Não foi possível carregar a candidatura.",
      response.status,
    );
  }

  return { application: body.application };
}

async function fetchApplication(id: string) {
  const response = await fetch(`/api/applications/${id}`, {
    cache: "no-store",
  });
  return parseResponse(response);
}

async function updateApplication(id: string, update: ApplicationUpdate) {
  const response = await fetch(`/api/applications/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update),
  });
  return parseResponse(response);
}

function useApplicationUpdate(
  id: string,
  queryKey: ApplicationQueryKey,
  successMessage: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (update: ApplicationUpdate) =>
      updateApplication(id, update),
    async onMutate(update) {
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<ApplicationResponse>(queryKey);

      queryClient.setQueryData<ApplicationResponse>(queryKey, (current) =>
        current
          ? {
              application: {
                ...current.application,
                ...update,
              },
            }
          : current,
      );

      return { previous };
    },
    onError(error, _update, context) {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar as alterações.",
      );
    },
    onSuccess(data) {
      queryClient.setQueryData(queryKey, data);
      toast.success(successMessage);
    },
    onSettled() {
      void queryClient.invalidateQueries({ queryKey });
    },
  });
}

function EmptySection({ children }: { children: string }) {
  return (
    <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function GapAnalysis({ value }: { value: Json | null }) {
  if (value === null) {
    return (
      <EmptySection>
        A análise de lacunas não foi salva neste registro.
      </EmptySection>
    );
  }

  if (typeof value === "string") {
    return <div className="whitespace-pre-wrap">{value}</div>;
  }

  if (Array.isArray(value)) {
    return (
      <ul className="list-disc space-y-2 pl-5">
        {value.map((item, index) => (
          <li key={index}>
            {typeof item === "string" ? item : JSON.stringify(item)}
          </li>
        ))}
      </ul>
    );
  }

  if (typeof value === "object") {
    return (
      <dl className="grid gap-4">
        {Object.entries(value).map(([key, item]) => (
          <div key={key}>
            <dt className="font-medium">{key}</dt>
            <dd className="mt-1 whitespace-pre-wrap text-muted-foreground">
              {typeof item === "string"
                ? item
                : JSON.stringify(item, null, 2)}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  return <p>{String(value)}</p>;
}

function DetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Skeleton className="h-96 w-full rounded-2xl" />
      <Skeleton className="h-80 w-full rounded-2xl" />
    </div>
  );
}

function CurriculumEditor({
  application,
  queryKey,
}: {
  application: ApplicationDetail;
  queryKey: ApplicationQueryKey;
}) {
  const [curriculum, setCurriculum] = useState(
    application.curriculo_otimizado ?? "",
  );
  const [downloading, setDownloading] = useState(false);
  const mutation = useApplicationUpdate(
    application.id,
    queryKey,
    "Currículo atualizado.",
  );

  function save() {
    mutation.mutate({
      curriculo_otimizado: curriculum.trim() || null,
    });
  }

  async function downloadPdf() {
    if (!curriculum.trim()) return;

    setDownloading(true);

    try {
      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markdown: curriculum,
          filename: "curriculo-otimizado",
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Não foi possível gerar o PDF.");
      }

      triggerBlobDownload(
        await response.blob(),
        "curriculo-otimizado.pdf",
      );
      toast.success("PDF gerado para download.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível gerar o PDF.",
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Editar currículo otimizado</CardTitle>
          <CardDescription>
            Altere o Markdown e salve a nova versão desta candidatura.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Label htmlFor="optimized-curriculum">Conteúdo em Markdown</Label>
          <Textarea
            id="optimized-curriculum"
            value={curriculum}
            onChange={(event) => setCurriculum(event.target.value)}
            maxLength={500_000}
            placeholder="Edite ou insira o currículo otimizado..."
            className="min-h-[32rem] font-mono text-sm"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={save}
              disabled={mutation.isPending}
              className="gap-2"
            >
              <HugeiconsIcon icon={SaveIcon} />
              {mutation.isPending ? "Salvando..." : "Salvar currículo"}
            </Button>
            <Button
              variant="outline"
              onClick={() => void downloadPdf()}
              disabled={downloading || !curriculum.trim()}
              className="gap-2"
            >
              <HugeiconsIcon icon={Download01Icon} />
              {downloading ? "Gerando PDF..." : "Baixar PDF"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pré-visualização</CardTitle>
          <CardDescription>
            Visualização da versão atualmente no editor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {curriculum.trim() ? (
            <article className="prose max-w-none dark:prose-invert">
              <ReactMarkdown>{curriculum}</ReactMarkdown>
            </article>
          ) : (
            <EmptySection>
              Insira o currículo otimizado para visualizá-lo.
            </EmptySection>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function EmailEditor({
  application,
  queryKey,
}: {
  application: ApplicationDetail;
  queryKey: ApplicationQueryKey;
}) {
  const initialEmail = parseOutreachEmail(
    application.email_outreach ?? "",
  );
  const [to, setTo] = useState(
    extractEmailFromText(application.descricao_vaga ?? "") ?? "",
  );
  const [subject, setSubject] = useState(initialEmail.subject);
  const [body, setBody] = useState(initialEmail.body);
  const mutation = useApplicationUpdate(
    application.id,
    queryKey,
    "Email atualizado.",
  );

  function save() {
    mutation.mutate({
      email_outreach: formatOutreachEmail({ subject, body }) || null,
    });
  }

  function openGmail() {
    const url = buildGmailComposeUrl({ to: to.trim(), subject, body });
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editar email de candidatura</CardTitle>
        <CardDescription>
          Revise a mensagem, salve as alterações ou continue no Gmail.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="email-recipient">Destinatário</Label>
          <Input
            id="email-recipient"
            type="email"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            autoComplete="email"
            placeholder="recrutamento@empresa.com"
          />
          <p className="text-xs text-muted-foreground">
            Usado ao abrir o Gmail; não é salvo na candidatura.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email-subject">Assunto</Label>
          <Input
            id="email-subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            maxLength={500}
            placeholder="Assunto do email"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email-body">Mensagem</Label>
          <Textarea
            id="email-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={99_000}
            placeholder="Escreva a mensagem de candidatura..."
            className="min-h-80"
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={save}
            disabled={mutation.isPending}
            className="gap-2"
          >
            <HugeiconsIcon icon={SaveIcon} />
            {mutation.isPending ? "Salvando..." : "Salvar email"}
          </Button>
          <Button
            variant="outline"
            onClick={openGmail}
            className="gap-2"
          >
            <HugeiconsIcon icon={Mail01Icon} />
            Abrir no Gmail
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ApplicationEditor({
  application,
  queryKey,
}: {
  application: ApplicationDetail;
  queryKey: ApplicationQueryKey;
}) {
  const [vagaTitulo, setVagaTitulo] = useState(
    application.vaga_titulo ?? "",
  );
  const [empresa, setEmpresa] = useState(application.empresa ?? "");
  const [status, setStatus] = useState<ApplicationStatus>(
    application.status,
  );
  const [notas, setNotas] = useState(application.notas ?? "");
  const mutation = useApplicationUpdate(
    application.id,
    queryKey,
    "Candidatura atualizada.",
  );

  function save() {
    mutation.mutate({
      vaga_titulo: vagaTitulo.trim() || null,
      empresa: empresa.trim() || null,
      status,
      notas: notas.trim() || null,
    });
  }

  return (
    <Card className="lg:sticky lg:top-24">
      <CardHeader>
        <CardTitle>Acompanhamento</CardTitle>
        <CardDescription>
          Atualize sem refazer a análise.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="application-title">Título da vaga</Label>
          <Input
            id="application-title"
            value={vagaTitulo}
            onChange={(event) => setVagaTitulo(event.target.value)}
            maxLength={200}
            placeholder="Ex.: Desenvolvedor Front-end"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="application-company">Empresa</Label>
          <Input
            id="application-company"
            value={empresa}
            onChange={(event) => setEmpresa(event.target.value)}
            maxLength={200}
            autoComplete="organization"
            placeholder="Ex.: Acme"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="application-status">Status</Label>
          <Select
            value={status}
            onValueChange={(value) =>
              setStatus(value as ApplicationStatus)
            }
          >
            <SelectTrigger id="application-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {APPLICATION_STATUSES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="application-notes">Notas pessoais</Label>
          <Textarea
            id="application-notes"
            value={notas}
            onChange={(event) => setNotas(event.target.value)}
            maxLength={10_000}
            placeholder="Contatos, próximos passos, feedbacks..."
            className="min-h-40"
          />
        </div>
        <Button onClick={save} disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function ApplicationDetailView({ id }: { id: string }) {
  const { session, loading: sessionLoading, error: sessionError } =
    useAnonymousSession();
  const queryKey = ["application", id] as const;
  const query = useQuery({
    queryKey,
    queryFn: () => fetchApplication(id),
    enabled: Boolean(session),
    retry(failureCount, error) {
      return !(error instanceof ApiError && error.status < 500) &&
        failureCount < 1;
    },
  });
  const application = query.data?.application;

  const visibleError =
    sessionError ??
    (query.error instanceof Error ? query.error.message : null);

  return (
    <main className="container mx-auto max-w-7xl px-6 py-10">
      <Link
        href="/historico"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-4")}
      >
        ← Voltar ao histórico
      </Link>

      {sessionLoading || (session && query.isPending) ? (
        <DetailSkeleton />
      ) : visibleError || !application ? (
        <Alert variant="destructive">
          <AlertTitle>
            {query.error instanceof ApiError && query.error.status === 404
              ? "Candidatura não encontrada"
              : "Não foi possível abrir a candidatura"}
          </AlertTitle>
          <AlertDescription>
            {visibleError ??
              "O registro não existe ou não pertence à sua conta."}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">
                {application.vaga_titulo || "Vaga sem título"}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {application.empresa || "Empresa não informada"} · Analisado em{" "}
                {dateFormatter.format(new Date(application.created_at))}
              </p>
            </div>
            <Badge variant="secondary" className="w-fit">
              {applicationStatusLabels[application.status]}
            </Badge>
          </header>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <Tabs defaultValue="vaga" className="min-w-0">
              <div className="overflow-x-auto pb-1">
                <TabsList>
                  <TabsTrigger value="vaga">Vaga</TabsTrigger>
                  <TabsTrigger value="curriculo">Currículo</TabsTrigger>
                  <TabsTrigger value="resultado">Resultado</TabsTrigger>
                  <TabsTrigger value="email">Email</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="vaga">
                <Card>
                  <CardHeader>
                    <CardTitle>Descrição da vaga</CardTitle>
                    <CardDescription>
                      Texto original usado na análise.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {application.descricao_vaga ? (
                      <div className="whitespace-pre-wrap leading-7">
                        {application.descricao_vaga}
                      </div>
                    ) : (
                      <EmptySection>
                        A descrição da vaga não foi salva neste registro.
                      </EmptySection>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="curriculo">
                <div className="grid gap-6">
                  {application.curriculo_original_url && (
                    <Card>
                      <CardHeader>
                        <CardTitle>PDF original</CardTitle>
                        <CardDescription>
                          Arquivo enviado na análise.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <iframe
                          src={application.curriculo_original_url}
                          title="Currículo original em PDF"
                          className="h-[36rem] w-full rounded-xl border"
                        />
                        <a
                          href={application.curriculo_original_url}
                          target="_blank"
                          rel="noreferrer"
                          className={buttonVariants({ variant: "outline" })}
                        >
                          Abrir ou baixar PDF
                        </a>
                      </CardContent>
                    </Card>
                  )}
                  <Card>
                    <CardHeader>
                      <CardTitle>Currículo enviado</CardTitle>
                      <CardDescription>
                        Texto original ou extraído do PDF.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {application.curriculo_original ? (
                        <div className="whitespace-pre-wrap leading-7">
                          {application.curriculo_original}
                        </div>
                      ) : (
                        <EmptySection>
                          O currículo original não foi salvo neste registro.
                        </EmptySection>
                      )}
                    </CardContent>
                  </Card>
                  <CurriculumEditor
                    application={application}
                    queryKey={queryKey}
                  />
                </div>
              </TabsContent>

              <TabsContent value="resultado">
                <div className="grid gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Match score</CardTitle>
                      <CardDescription>
                        Aderência do currículo à vaga.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {application.match_score === null ? (
                        <EmptySection>
                          O match score não foi salvo neste registro.
                        </EmptySection>
                      ) : (
                        <Progress value={application.match_score}>
                          <ProgressLabel>Aderência</ProgressLabel>
                          <ProgressValue>
                            {() => `${application.match_score}%`}
                          </ProgressValue>
                        </Progress>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Gap analysis</CardTitle>
                      <CardDescription>
                        Competências e requisitos a desenvolver.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <GapAnalysis value={application.gap_analysis} />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="email">
                <EmailEditor
                  application={application}
                  queryKey={queryKey}
                />
              </TabsContent>
            </Tabs>

            <ApplicationEditor
              key={application.updated_at}
              application={application}
              queryKey={queryKey}
            />
          </div>
        </>
      )}
    </main>
  );
}
