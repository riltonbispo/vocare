"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { userApplicationsKeys } from "@/hooks/use-user-applications";
import {
  REANALYSIS_MAX_CURRICULUM_FILE_SIZE,
  REANALYSIS_MAX_CURRICULUM_LENGTH,
  REANALYSIS_MAX_DESCRIPTION_LENGTH,
} from "@/lib/application-reanalysis";
import {
  classifyCurriculumFile,
  CURRICULUM_FILE_ACCEPT,
} from "@/lib/curriculum-files";
import type { ApplicationDetail } from "@/lib/applications";

const reanalysisSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "Informe a descrição da vaga.")
    .max(
      REANALYSIS_MAX_DESCRIPTION_LENGTH,
      `A descrição deve ter no máximo ${REANALYSIS_MAX_DESCRIPTION_LENGTH} caracteres.`,
    ),
  curriculum: z
    .string()
    .max(
      REANALYSIS_MAX_CURRICULUM_LENGTH,
      `O currículo deve ter no máximo ${REANALYSIS_MAX_CURRICULUM_LENGTH} caracteres.`,
    ),
});

type ReanalysisFormValues = z.infer<typeof reanalysisSchema>;
type ApplicationResponse = { application: ApplicationDetail };

type ApplicationReanalysisDialogProps = {
  application: ApplicationDetail;
  userId: string;
  analysisPending: boolean;
  onPendingChange: (pending: boolean) => void;
  onSuccess: () => void;
};

async function parseResponse(response: Response): Promise<ApplicationResponse> {
  const body = (await response.json().catch(() => null)) as {
    application?: ApplicationDetail;
    error?: string;
  } | null;

  if (!response.ok || !body?.application) {
    throw new Error(body?.error ?? "Não foi possível gerar a nova análise.");
  }

  return { application: body.application };
}

async function reanalyzeApplication({
  id,
  values,
  curriculumFile,
  replacesCurriculum,
}: {
  id: string;
  values: ReanalysisFormValues;
  curriculumFile: File | null;
  replacesCurriculum: boolean;
}) {
  if (curriculumFile) {
    const formData = new FormData();
    formData.append("description", values.description);
    formData.append("curriculumFile", curriculumFile);

    return parseResponse(
      await fetch(`/api/applications/${id}/reanalyze`, {
        method: "POST",
        body: formData,
      }),
    );
  }

  return parseResponse(
    await fetch(`/api/applications/${id}/reanalyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: values.description,
        ...(replacesCurriculum && { curriculum: values.curriculum }),
      }),
    }),
  );
}

export function ApplicationReanalysisDialog({
  application,
  userId,
  analysisPending: applicationAnalysisPending,
  onPendingChange,
  onSuccess,
}: ApplicationReanalysisDialogProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [curriculumFile, setCurriculumFile] = useState<File | null>(null);
  const [curriculumFileError, setCurriculumFileError] = useState<string | null>(
    null,
  );
  const curriculumBeforeFile = useRef<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const detailQueryKey = ["application", userId, application.id] as const;
  const hasStoredCurriculum = Boolean(
    application.curriculo_original?.trim() ||
      application.curriculo_arquivo_path,
  );
  const {
    clearErrors,
    formState: { errors },
    handleSubmit,
    getValues,
    register,
    reset,
    setError,
    setValue,
  } = useForm<ReanalysisFormValues>({
    resolver: zodResolver(reanalysisSchema),
    defaultValues: {
      description: application.descricao_vaga ?? "",
      curriculum: application.curriculo_original ?? "",
    },
  });
  const mutation = useMutation({
    mutationFn: ({
      values,
      file,
      replacesCurriculum,
    }: {
      values: ReanalysisFormValues;
      file: File | null;
      replacesCurriculum: boolean;
    }) =>
      reanalyzeApplication({
        id: application.id,
        values,
        curriculumFile: file,
        replacesCurriculum,
      }),
    async onMutate() {
      onPendingChange(true);
      await queryClient.cancelQueries({ queryKey: detailQueryKey });
      const previous =
        queryClient.getQueryData<ApplicationResponse>(detailQueryKey);

      return { previous };
    },
    onSuccess(data) {
      queryClient.setQueryData<ApplicationResponse>(detailQueryKey, data);
      setOpen(false);
      setCurriculumFile(null);
      setFileInputKey((key) => key + 1);
      reset({
        description: data.application.descricao_vaga ?? "",
        curriculum: data.application.curriculo_original ?? "",
      });
      onSuccess();
      toast.success("Nova análise gerada com sucesso.");
    },
    onError(error, _variables, context) {
      if (context?.previous) {
        queryClient.setQueryData(detailQueryKey, context.previous);
      }

      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível gerar a nova análise.",
      );
    },
    onSettled() {
      onPendingChange(false);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: detailQueryKey }),
        queryClient.invalidateQueries({
          queryKey: userApplicationsKeys.byUser(userId),
        }),
      ]);
    },
  });
  const analysisPending = mutation.isPending || applicationAnalysisPending;

  function resetForm() {
    reset({
      description: application.descricao_vaga ?? "",
      curriculum: application.curriculo_original ?? "",
    });
    curriculumBeforeFile.current = null;
    setCurriculumFile(null);
    setCurriculumFileError(null);
    setFileInputKey((key) => key + 1);
    mutation.reset();
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      resetForm();
    } else if (!mutation.isPending) {
      resetForm();
    }
  }

  function handleCurriculumFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    function rejectFile(message: string) {
      if (curriculumFile && curriculumBeforeFile.current !== null) {
        setValue("curriculum", curriculumBeforeFile.current, {
          shouldDirty: true,
          shouldValidate: true,
        });
        curriculumBeforeFile.current = null;
      }

      setCurriculumFile(null);
      setCurriculumFileError(message);
      setFileInputKey((key) => key + 1);
      setError("curriculum", { type: "manual", message });
    }

    if (file.size === 0) {
      rejectFile("O arquivo de currículo está vazio.");
      return;
    }

    if (file.size > REANALYSIS_MAX_CURRICULUM_FILE_SIZE) {
      rejectFile("O arquivo deve ter no máximo 10 MB.");
      return;
    }

    if (classifyCurriculumFile(file) === "unsupported") {
      rejectFile("Envie um currículo em PDF, Markdown ou TXT.");
      return;
    }

    if (!curriculumFile) {
      curriculumBeforeFile.current = getValues("curriculum");
    }

    setValue("curriculum", "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    setCurriculumFileError(null);
    clearErrors("curriculum");
    setCurriculumFile(file);
  }

  function removeCurriculumFile() {
    setValue(
      "curriculum",
      curriculumBeforeFile.current ?? application.curriculo_original ?? "",
      { shouldDirty: true, shouldValidate: true },
    );
    curriculumBeforeFile.current = null;
    setCurriculumFile(null);
    setCurriculumFileError(null);
    setFileInputKey((key) => key + 1);
    clearErrors("curriculum");
  }

  function submit(values: ReanalysisFormValues) {
    if (analysisPending) return;

    if (curriculumFileError) {
      setError("curriculum", {
        type: "manual",
        message: curriculumFileError,
      });
      return;
    }

    if (!values.curriculum.trim() && !curriculumFile && !hasStoredCurriculum) {
      setError(
        "curriculum",
        {
          type: "manual",
          message: "Cole ou selecione um currículo para gerar a análise.",
        },
        { shouldFocus: true },
      );
      return;
    }

    mutation.mutate({
      values,
      file: curriculumFile,
      replacesCurriculum:
        Boolean(curriculumFile) ||
        values.curriculum !== (application.curriculo_original ?? ""),
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button type="button" className="gap-2" disabled={analysisPending} />
        }
      >
        {analysisPending ? (
          <LoaderCircle className="animate-spin" aria-hidden="true" />
        ) : (
          <HugeiconsIcon icon={SparklesIcon} aria-hidden="true" />
        )}
        {analysisPending ? "Analisando..." : "Reanálise"}
      </DialogTrigger>

      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl"
        aria-busy={analysisPending}
      >
        <DialogHeader>
          <DialogTitle>Reanálise</DialogTitle>
          <DialogDescription>
            Revise a vaga e o currículo que serão enviados para a IA.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertTitle>Os materiais atuais serão substituídos</AlertTitle>
          <AlertDescription>
            Ao concluir, a nova versão substituirá o currículo otimizado, o
            email e a carta de apresentação desta candidatura. Status, notas e
            canais serão preservados.
          </AlertDescription>
        </Alert>

        <form
          className="grid gap-5"
          noValidate
          onSubmit={handleSubmit(submit)}
        >
          <Field data-invalid={Boolean(errors.description)}>
            <FieldLabel htmlFor="reanalysis-description">
              Descrição da vaga <span aria-hidden="true">*</span>
            </FieldLabel>
            <Textarea
              id="reanalysis-description"
              className="min-h-44 resize-y"
              placeholder="Cole o texto completo da vaga..."
              maxLength={REANALYSIS_MAX_DESCRIPTION_LENGTH}
              disabled={analysisPending}
              required
              aria-invalid={Boolean(errors.description)}
              aria-describedby="reanalysis-description-help reanalysis-description-error"
              {...register("description")}
            />
            <FieldDescription id="reanalysis-description-help">
              Cole o texto completo. A análise não acessa o conteúdo de links.
            </FieldDescription>
            <FieldError
              id="reanalysis-description-error"
              errors={[errors.description]}
            />
          </Field>

          <Field data-invalid={Boolean(errors.curriculum)}>
            <FieldLabel htmlFor="reanalysis-curriculum-file">
              Currículo <span aria-hidden="true">*</span>
            </FieldLabel>
            <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium">Arquivo</p>
                <p className="truncate text-sm text-muted-foreground">
                  {curriculumFile
                    ? curriculumFile.name
                    : hasStoredCurriculum
                      ? "O currículo salvo será reutilizado"
                      : "PDF, Markdown ou TXT — até 10 MB"}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:w-64">
                <Input
                  key={fileInputKey}
                  id="reanalysis-curriculum-file"
                  type="file"
                  accept={CURRICULUM_FILE_ACCEPT}
                  disabled={analysisPending}
                  aria-invalid={Boolean(errors.curriculum)}
                  aria-describedby="reanalysis-curriculum-help reanalysis-curriculum-error"
                  onChange={handleCurriculumFileChange}
                />
                {curriculumFile && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={analysisPending}
                    onClick={removeCurriculumFile}
                  >
                    Remover arquivo
                  </Button>
                )}
              </div>
            </div>
            <Textarea
              id="reanalysis-curriculum"
              aria-label="Conteúdo do currículo"
              className="min-h-52 resize-y font-mono text-sm read-only:opacity-60"
              placeholder={
                curriculumFile
                  ? "Arquivo selecionado para a nova análise."
                  : "Cole aqui o conteúdo do currículo..."
              }
              maxLength={REANALYSIS_MAX_CURRICULUM_LENGTH}
              disabled={analysisPending}
              readOnly={Boolean(curriculumFile)}
              aria-invalid={Boolean(errors.curriculum)}
              aria-describedby="reanalysis-curriculum-help reanalysis-curriculum-error"
              onInput={() => {
                if (curriculumFileError) {
                  setCurriculumFileError(null);
                  clearErrors("curriculum");
                }
              }}
              {...register("curriculum")}
            />
            <FieldDescription id="reanalysis-curriculum-help">
              Selecione outro arquivo ou revise o conteúdo salvo antes de
              gerar.
            </FieldDescription>
            <FieldError
              id="reanalysis-curriculum-error"
              errors={[errors.curriculum]}
            />
          </Field>

          {mutation.error && (
            <p className="text-sm text-destructive" role="alert">
              {mutation.error instanceof Error
                ? mutation.error.message
                : "Não foi possível gerar a nova análise."}
            </p>
          )}

          {analysisPending && (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Gerando currículo, email e carta. Você pode fechar esta janela;
              a análise continuará em andamento.
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {analysisPending ? "Fechar" : "Cancelar"}
            </Button>
            <Button type="submit" disabled={analysisPending}>
              {analysisPending ? (
                <>
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                  Gerando análise...
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={SparklesIcon} aria-hidden="true" />
                  Substituir e gerar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
