import { ArrowRight, Trash2 } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AnalysisStatus } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

type ApplicationListItemProps = {
  id: string;
  title: string | null;
  company: string | null;
  matchScore: number | null;
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

function getMatchPresentation(
  score: number | null,
  analysisStatus: AnalysisStatus | undefined,
) {
  if (analysisStatus === "pending") {
    return {
      badge: "…",
      label: "Análise em andamento",
      className: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    };
  }

  if (analysisStatus === "failed") {
    return {
      badge: "!",
      label: "Análise interrompida",
      className: "bg-destructive/10 text-destructive",
    };
  }

  if (score === null) {
    return {
      badge: "—",
      label: "Score indisponível",
      className: "bg-muted text-muted-foreground",
    };
  }

  if (score >= 80) {
    return {
      badge: String(score),
      label: "Match bom",
      className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    };
  }

  if (score >= 60) {
    return {
      badge: String(score),
      label: "Match médio",
      className: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    };
  }

  return {
    badge: String(score),
    label: "Match fraco",
    className: "bg-muted text-muted-foreground",
  };
}

export function ApplicationListItem({
  id,
  title,
  company,
  matchScore,
  createdAt,
  analysisStatus,
  onDelete,
  deleting = false,
}: ApplicationListItemProps) {
  const match = getMatchPresentation(matchScore, analysisStatus);
  const applicationTitle = title ?? "Vaga sem título";

  return (
    <div className="flex min-w-0 items-center rounded-2xl border bg-card transition-colors hover:bg-muted/40">
      <Link
        href={`/historico/${id}`}
        className="group flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-4 sm:p-4"
        aria-label={`Ver detalhes de ${applicationTitle}`}
      >
        <Badge
          className={cn(
            "h-12 min-w-12 rounded-xl px-2 text-sm tabular-nums sm:h-14 sm:min-w-14 sm:text-base",
            match.className,
          )}
        >
          {match.badge}
        </Badge>

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">
            {applicationTitle}
          </p>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {company ?? "Empresa não informada"}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground sm:hidden">
            {match.label} · {dateFormatter.format(new Date(createdAt))}
          </p>
        </div>

        <div className="hidden shrink-0 text-right sm:block">
          <p className="text-sm font-medium">{match.label}</p>
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
