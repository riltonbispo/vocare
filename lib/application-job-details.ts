import { z } from "zod";

import type { HiringModel } from "@/lib/supabase/database.types";

export const APPLICATION_SALARY_MAX_LENGTH = 500;
export const APPLICATION_SKILL_MAX_LENGTH = 100;
export const APPLICATION_SKILLS_MAX_COUNT = 50;

export const HIRING_MODELS = [
  { value: "clt", label: "CLT" },
  { value: "pj", label: "PJ" },
  { value: "freelancer", label: "Freelancer" },
  { value: "estagio", label: "Estágio" },
  { value: "temporario", label: "Temporário" },
  { value: "outro", label: "Outro" },
] as const satisfies ReadonlyArray<{
  value: HiringModel;
  label: string;
}>;

export const HIRING_MODEL_VALUES = HIRING_MODELS.map(
  ({ value }) => value,
) as [HiringModel, ...HiringModel[]];

export const hiringModelLabels = Object.fromEntries(
  HIRING_MODELS.map(({ value, label }) => [value, label]),
) as Record<HiringModel, string>;

export const salarySchema = z
  .string()
  .trim()
  .max(
    APPLICATION_SALARY_MAX_LENGTH,
    `O salário deve ter no máximo ${APPLICATION_SALARY_MAX_LENGTH} caracteres.`,
  );

export const hiringModelSchema = z.enum(HIRING_MODEL_VALUES);

const skillSchema = z
  .string()
  .trim()
  .min(1, "Informe uma skill válida.")
  .max(
    APPLICATION_SKILL_MAX_LENGTH,
    `Cada skill deve ter no máximo ${APPLICATION_SKILL_MAX_LENGTH} caracteres.`,
  );

export function normalizeSkillTags(skills: string[]) {
  const normalizedKeys = new Set<string>();
  const normalizedSkills: string[] = [];

  for (const rawSkill of skills) {
    const skill = rawSkill.trim();
    const key = skill.toLocaleLowerCase("pt-BR");

    if (!skill || normalizedKeys.has(key)) continue;

    normalizedKeys.add(key);
    normalizedSkills.push(skill);
  }

  return normalizedSkills;
}

export const skillsNotMasteredSchema = z
  .array(skillSchema)
  .max(
    APPLICATION_SKILLS_MAX_COUNT,
    `Informe no máximo ${APPLICATION_SKILLS_MAX_COUNT} skills.`,
  )
  .transform(normalizeSkillTags);

export const applicationJobDetailsSchema = z
  .object({
    salario: salarySchema.optional(),
    modelo_contratacao: hiringModelSchema.optional(),
    skills_nao_dominadas: skillsNotMasteredSchema.default([]),
  })
  .strict();

export type ApplicationJobDetailsInput = z.infer<
  typeof applicationJobDetailsSchema
>;
