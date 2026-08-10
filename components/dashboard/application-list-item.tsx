import { ArrowRight, Trash2 } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { applicationStatusLabels } from "@/lib/applications";
import type {
  AnalysisStatus,
  ApplicationStatus,
} from "@/lib/supabase/database.types";

type ApplicationListItemProps = {
  id: string;
  title: string | null;
  company: string | null;
  status: ApplicationStatus;
  createdAt: string;
  analysisStatus?: AnalysisStatus;
  onDelete?: () => void;
  deleting?: boolean;
};

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
  onDelete,
  deleting = false,
}: ApplicationListItemProps) {
  const statusPresentation = getStatusPresentation(status, analysisStatus);
  const applicationTitle = title ?? "Vaga sem título";

  return (
    <div className="flex min-w-0 items-center rounded-2xl border bg-card transition-colors hover:bg-muted/40">
      <Link
        href={`/historico/${id}`}
        className="group flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-4 sm:p-4"
        aria-label={`Ver detalhes de ${applicationTitle}`}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">
            {applicationTitle}
          </p>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {company ?? "Empresa não informada"}
          </p>
          <div className="mt-1 flex items-center gap-2 sm:hidden">
            <Badge className={statusPresentation.className}>
              {statusPresentation.label}
            </Badge>
            <span className="truncate text-xs text-muted-foreground">
              {dateFormatter.format(new Date(createdAt))}
            </span>
          </div>
        </div>

        <div className="hidden shrink-0 space-y-1.5 text-right sm:block">
          <Badge className={statusPresentation.className}>
            {statusPresentation.label}
          </Badge>
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
