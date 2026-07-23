import type {
  ApplicationStatus,
  Candidatura,
} from "@/lib/supabase/database.types";

export const APPLICATION_STATUSES: {
  value: ApplicationStatus;
  label: string;
}[] = [
  { value: "aplicado", label: "Aplicado" },
  { value: "em_processo", label: "Em processo" },
  { value: "entrevista", label: "Entrevista" },
  { value: "rejeitado", label: "Rejeitado" },
  { value: "arquivado", label: "Arquivado" },
];

export const applicationStatusLabels = Object.fromEntries(
  APPLICATION_STATUSES.map(({ value, label }) => [value, label]),
) as Record<ApplicationStatus, string>;

export type ApplicationDetail = Candidatura;
