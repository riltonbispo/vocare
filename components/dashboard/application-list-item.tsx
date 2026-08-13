import { ArrowRight, Zap, Trash2 } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  hiringModelLabels,
  normalizeSkillTags,
} from "@/lib/application-job-details";
import { applicationStatusLabels } from "@/lib/applications";
import type {
  AnalysisStatus,
  ApplicationStatus,
  HiringModel,
} from "@/lib/supabase/database.types";

type ApplicationListItemProps = {
  id: string;
  title: string | null;
  company: string | null;
  status: ApplicationStatus;
  createdAt: string;
  analysisStatus?: AnalysisStatus;
  salary?: string | null;
  hiringModel?: HiringModel | null;
  missingSkills?: string[] | null;
  onDelete?: () => void;
  deleting?: boolean;
};

const MAX_VISIBLE_MISSING_SKILLS = 3;

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

function getStatusPresentation(
  status: ApplicationStatus,
  analysisStatus: AnalysisStatus | undefined,
) {
  if (analysisStatus === "pending") {
    return {
      label: "Analisando",
      className: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    };
  }

  if (analysisStatus === "failed") {
    return {
      label: "Falhou",
      className: "bg-destructive/10 text-destructive",
    };
  }

  return {
    label: applicationStatusLabels[status],
    className: "bg-muted text-muted-foreground",
  };
}

export function ApplicationListItem({
  id,
  title,
  company,
  status,
  createdAt,
  analysisStatus,
  salary,
  hiringModel,
  missingSkills,
  onDelete,
  deleting = false,
}: ApplicationListItemProps) {
  const statusPresentation = getStatusPresentation(status, analysisStatus);
  const isQuickRegistration = analysisStatus === "nao_aplicavel";
  const applicationTitle = title ?? "Vaga sem título";
  const normalizedSalary = salary?.trim() ?? "";
  const normalizedMissingSkills = normalizeSkillTags(missingSkills ?? []);
  const visibleMissingSkills = normalizedMissingSkills.slice(
    0,
    MAX_VISIBLE_MISSING_SKILLS,
  );
  const hiddenMissingSkillsCount =
    normalizedMissingSkills.length - visibleMissingSkills.length;
  const hasJobDetails = Boolean(
    normalizedSalary || hiringModel || normalizedMissingSkills.length,
  );
  const accessibilityDetails = [
    `Ver detalhes de ${applicationTitle}`,
    company ? `empresa ${company}` : "empresa não informada",
    `status ${statusPresentation.label}`,
    hiringModel ? `modelo ${hiringModelLabels[hiringModel]}` : null,
    normalizedSalary ? "salário informado" : null,
    normalizedMissingSkills.length > 0
      ? `${normalizedMissingSkills.length} ${normalizedMissingSkills.length === 1 ? "skill não dominada" : "skills não dominadas"}`
      : null,
    isQuickRegistration ? "registro rápido sem análise" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex min-w-0 items-center rounded-2xl border bg-card transition-colors hover:bg-muted/40">
      <Link
        href={`/historico/${id}`}
        className="group flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-4 sm:p-4"
        aria-label={accessibilityDetails}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">
            {applicationTitle}
          </p>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {company ?? "Empresa não informada"}
          </p>
          {hasJobDetails && (
            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
              {hiringModel && (
                <Badge
                  variant="outline"
                  className="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/60 dark:text-violet-300"
                >
                  {hiringModelLabels[hiringModel]}
                </Badge>
              )}
              {normalizedSalary && (
                <Badge
                  variant="outline"
                  className="max-w-full border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 sm:max-w-72"
                  title={`Salário: ${normalizedSalary}`}
                >
                  <span className="shrink-0">Salário:</span>
                  <span className="min-w-0 truncate">{normalizedSalary}</span>
                </Badge>
              )}
              {normalizedMissingSkills.length > 0 && (
                <>
                  <span className="text-xs font-medium text-red-700 dark:text-red-300">
                    Não domina:
                  </span>
                  {visibleMissingSkills.map((skill) => (
                    <Badge
                      key={skill.toLocaleLowerCase("pt-BR")}
                      variant="outline"
                      className="max-w-full border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300 sm:max-w-48"
                      title={`Skill não dominada: ${skill}`}
                    >
                      <span className="min-w-0 truncate">{skill}</span>
                    </Badge>
                  ))}
                  {hiddenMissingSkillsCount > 0 && (
                    <Badge
                      variant="outline"
                      className="border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300"
                      title={`${hiddenMissingSkillsCount} ${hiddenMissingSkillsCount === 1 ? "skill adicional" : "skills adicionais"}`}
                    >
                      +{hiddenMissingSkillsCount}
                    </Badge>
                  )}
                </>
              )}
            </div>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1.5 sm:hidden">
            <Badge className={statusPresentation.className}>
              {statusPresentation.label}
            </Badge>
            {isQuickRegistration && (
              <Badge
                variant="outline"
                className="border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300"
              >
                <Zap aria-hidden="true" />
                Registro rápido
              </Badge>
            )}
            <span className="truncate text-xs text-muted-foreground">
              {dateFormatter.format(new Date(createdAt))}
            </span>
          </div>
        </div>

        <div className="hidden shrink-0 space-y-1.5 text-right sm:block">
          <div className="flex flex-wrap justify-end gap-1.5">
            <Badge className={statusPresentation.className}>
              {statusPresentation.label}
            </Badge>
            {isQuickRegistration && (
              <Badge
                variant="outline"
                className="border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300"
              >
                <Zap aria-hidden="true" />
                Registro rápido
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {dateFormatter.format(new Date(createdAt))}
          </p>
        </div>

        <ArrowRight
          className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
          aria-hidden="true"
        />
      </Link>

      {onDelete && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="mr-3 text-muted-foreground hover:text-destructive sm:mr-4"
          aria-label={`Excluir candidatura ${applicationTitle}`}
          title="Excluir candidatura"
          disabled={deleting}
          onClick={onDelete}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
