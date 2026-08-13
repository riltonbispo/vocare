import { z } from "zod";

import { APPLICATION_STATUSES } from "@/lib/applications";
import { applicationJobDetailsSchema } from "@/lib/application-job-details";
import type { ApplicationStatus } from "@/lib/supabase/database.types";

export const APPLICATION_TITLE_MAX_LENGTH = 200;
export const APPLICATION_COMPANY_MAX_LENGTH = 200;
export const APPLICATION_DESCRIPTION_MAX_LENGTH = 100_000;
export const APPLICATION_NOTES_MAX_LENGTH = 10_000;

const applicationStatusValues = APPLICATION_STATUSES.map(
  ({ value }) => value,
) as [ApplicationStatus, ...ApplicationStatus[]];

export const quickApplicationSchema = z
  .object({
    empresa: z
      .string()
      .trim()
      .min(1, "Informe a empresa.")
      .max(
        APPLICATION_COMPANY_MAX_LENGTH,
        `A empresa deve ter no máximo ${APPLICATION_COMPANY_MAX_LENGTH} caracteres.`,
      ),
    vaga_titulo: z
      .string()
      .trim()
      .min(1, "Informe o cargo ou a vaga.")
      .max(
        APPLICATION_TITLE_MAX_LENGTH,
        `O cargo ou a vaga deve ter no máximo ${APPLICATION_TITLE_MAX_LENGTH} caracteres.`,
      ),
    status: z.enum(applicationStatusValues),
    descricao_vaga: z
      .string()
      .trim()
      .max(
        APPLICATION_DESCRIPTION_MAX_LENGTH,
        `A descrição da vaga deve ter no máximo ${APPLICATION_DESCRIPTION_MAX_LENGTH} caracteres.`,
      )
      .optional(),
    notas: z
      .string()
      .trim()
      .max(
        APPLICATION_NOTES_MAX_LENGTH,
        `As observações devem ter no máximo ${APPLICATION_NOTES_MAX_LENGTH} caracteres.`,
      )
      .optional(),
    ...applicationJobDetailsSchema.shape,
  })
  .strict();

export type QuickApplicationFormInput = z.input<
  typeof quickApplicationSchema
>;
export type QuickApplicationInput = z.output<typeof quickApplicationSchema>;
