import type { AnalysisStatus } from "@/lib/supabase/database.types";

export const REANALYSIS_ACTIVE_WINDOW_MS = 4 * 60 * 1_000;
export const REANALYSIS_MAX_CURRICULUM_FILE_SIZE = 10 * 1024 * 1024;
export const REANALYSIS_MAX_DESCRIPTION_LENGTH = 100_000;
export const REANALYSIS_MAX_CURRICULUM_LENGTH = 500_000;
export const REANALYSIS_MAX_REQUEST_SIZE =
  REANALYSIS_MAX_CURRICULUM_FILE_SIZE + 2 * 1024 * 1024;
export const ORIGINAL_CURRICULUM_BUCKET = "curriculos-originais";

export function isActiveReanalysis({
  analysisStatus,
  updatedAt,
  now = Date.now(),
}: {
  analysisStatus: AnalysisStatus;
  updatedAt: string;
  now?: number;
}) {
  if (analysisStatus !== "pending") return false;

  const updatedAtTime = Date.parse(updatedAt);

  return (
    !Number.isFinite(updatedAtTime) ||
    Math.max(now, updatedAtTime) - updatedAtTime <
      REANALYSIS_ACTIVE_WINDOW_MS
  );
}
