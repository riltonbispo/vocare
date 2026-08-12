"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, Plus } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { userApplicationsKeys } from "@/hooks/use-user-applications";
import {
  APPLICATION_COMPANY_MAX_LENGTH,
  APPLICATION_DESCRIPTION_MAX_LENGTH,
  APPLICATION_NOTES_MAX_LENGTH,
  APPLICATION_TITLE_MAX_LENGTH,
  quickApplicationSchema,
  type QuickApplicationInput,
} from "@/lib/application-registration";
import { APPLICATION_STATUSES } from "@/lib/applications";

type RegisterApplicationDialogProps = {
  userId: string | null;
  disabled?: boolean;
  triggerVariant?: ComponentProps<typeof Button>["variant"];
};

const defaultValues: QuickApplicationInput = {
  empresa: "",
  vaga_titulo: "",
  status: "aplicado",
  descricao_vaga: "",
  notas: "",
};

async function createApplication(input: QuickApplicationInput) {
  const response = await fetch("/api/applications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  if (!response.ok) {
    throw new Error(body?.error ?? "Não foi possível registrar a candidatura.");
  }
}

export function RegisterApplicationDialog({
  userId,
  disabled = false,
  triggerVariant = "default",
}: RegisterApplicationDialogProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<QuickApplicationInput>({
    resolver: zodResolver(quickApplicationSchema),
    defaultValues,
  });
  const mutation = useMutation({
    mutationFn: createApplication,
    async onSuccess(_data, application) {
      setOpen(false);
      reset(defaultValues);
      toast.success(
        `Candidatura para “${application.vaga_titulo}” registrada.`,
      );

      if (userId) {
        await queryClient.invalidateQueries({
          queryKey: userApplicationsKeys.byUser(userId),
        });
      }
    },
    onError(error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar a candidatura.",
      );
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (mutation.isPending) {
      return;
    }

    setOpen(nextOpen);

    if (!nextOpen) {
      reset(defaultValues);
      mutation.reset();
    }
  }

  const formDisabled = mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant={triggerVariant}
            className="w-full sm:w-auto"
            disabled={disabled}
          />
        }
      >
        <Plus aria-hidden="true" />
        Registrar candidatura
      </DialogTrigger>

      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl"
        showCloseButton={!formDisabled}
      >
        <DialogHeader>
          <DialogTitle>Registrar candidatura</DialogTitle>
          <DialogDescription>
            Adicione uma oportunidade sem precisar gerar ou analisar um
            currículo.
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-5"
          noValidate
          onSubmit={handleSubmit((application) =>
            mutation.mutate(application),
          )}
        >
          <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
            <Field data-invalid={Boolean(errors.empresa)}>
              <FieldLabel htmlFor="quick-application-company">
                Empresa <span aria-hidden="true">*</span>
              </FieldLabel>
              <Input
                id="quick-application-company"
                autoComplete="organization"
                placeholder="Ex.: Acme"
                maxLength={APPLICATION_COMPANY_MAX_LENGTH}
                required
                disabled={formDisabled}
                aria-invalid={Boolean(errors.empresa)}
                aria-describedby={
                  errors.empresa ? "quick-application-company-error" : undefined
                }
                {...register("empresa")}
              />
              <FieldError
                id="quick-application-company-error"
                errors={[errors.empresa]}
              />
            </Field>

            <Field data-invalid={Boolean(errors.vaga_titulo)}>
              <FieldLabel htmlFor="quick-application-title">
                Cargo ou vaga <span aria-hidden="true">*</span>
              </FieldLabel>
              <Input
                id="quick-application-title"
                placeholder="Ex.: Desenvolvedor Front-end"
                maxLength={APPLICATION_TITLE_MAX_LENGTH}
                required
                disabled={formDisabled}
                aria-invalid={Boolean(errors.vaga_titulo)}
                aria-describedby={
                  errors.vaga_titulo
                    ? "quick-application-title-error"
                    : undefined
                }
                {...register("vaga_titulo")}
              />
              <FieldError
                id="quick-application-title-error"
                errors={[errors.vaga_titulo]}
              />
            </Field>
          </div>

          <Controller
            name="status"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="quick-application-status">
                  Status inicial <span aria-hidden="true">*</span>
                </FieldLabel>
                <Select
                  name={field.name}
                  value={field.value}
                  disabled={formDisabled}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    id="quick-application-status"
                    className="w-full"
                    aria-invalid={fieldState.invalid}
                    aria-required="true"
                    aria-describedby={
                      fieldState.error
                        ? "quick-application-status-error"
                        : undefined
                    }
                  >
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
                <FieldError
                  id="quick-application-status-error"
                  errors={[fieldState.error]}
                />
              </Field>
            )}
          />

          <Field data-invalid={Boolean(errors.descricao_vaga)}>
            <FieldLabel htmlFor="quick-application-description">
              Descrição ou link da vaga
            </FieldLabel>
            <Textarea
              id="quick-application-description"
              className="min-h-24"
              placeholder="Cole o link ou escreva os principais detalhes da vaga."
              maxLength={APPLICATION_DESCRIPTION_MAX_LENGTH}
              disabled={formDisabled}
              aria-invalid={Boolean(errors.descricao_vaga)}
              aria-describedby={
                errors.descricao_vaga
                  ? "quick-application-description-error"
                  : undefined
              }
              {...register("descricao_vaga")}
            />
            <FieldError
              id="quick-application-description-error"
              errors={[errors.descricao_vaga]}
            />
          </Field>

          <Field data-invalid={Boolean(errors.notas)}>
            <FieldLabel htmlFor="quick-application-notes">
              Observações
            </FieldLabel>
            <Textarea
              id="quick-application-notes"
              className="min-h-24"
              placeholder="Contatos, próximos passos, prazos..."
              maxLength={APPLICATION_NOTES_MAX_LENGTH}
              disabled={formDisabled}
              aria-invalid={Boolean(errors.notas)}
              aria-describedby={
                errors.notas ? "quick-application-notes-error" : undefined
              }
              {...register("notas")}
            />
            <FieldError
              id="quick-application-notes-error"
              errors={[errors.notas]}
            />
          </Field>

          {mutation.error && (
            <p className="text-sm text-destructive" role="alert">
              {mutation.error instanceof Error
                ? mutation.error.message
                : "Não foi possível registrar a candidatura."}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={formDisabled}
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={formDisabled || !userId}>
              {formDisabled ? (
                <>
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                  Registrando...
                </>
              ) : (
                "Registrar candidatura"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
