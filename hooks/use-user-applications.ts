"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { useAnonymousSession } from "@/hooks/use-anonymous-session";
import { createClient } from "@/lib/supabase/client";
import type {
  AnalysisStatus,
  Candidatura,
} from "@/lib/supabase/database.types";

export const DEFAULT_USER_APPLICATIONS_PAGE_SIZE = 20;
export const MAX_USER_APPLICATIONS_PAGE_SIZE = 100;

export type UserApplication = Pick<
  Candidatura,
  | "id"
  | "vaga_titulo"
  | "empresa"
  | "match_score"
  | "status"
  | "analysis_status"
  | "created_at"
  | "updated_at"
>;

export type MatchFilter =
  | "all"
  | "good"
  | "medium"
  | "weak"
  | "unscored";

export type AnalysisStatusFilter = AnalysisStatus | "all";

export type UseUserApplicationsOptions = {
  pageSize?: number;
  matchFilter?: MatchFilter;
  analysisStatus?: AnalysisStatusFilter;
};

export type FetchUserApplicationsPageOptions =
  UseUserApplicationsOptions & {
    userId: string;
    offset?: number;
  };

export type UserApplicationsPage = {
  applications: UserApplication[];
  total: number;
  nextOffset: number | null;
};

type NormalizedUserApplicationsOptions = {
  pageSize: number;
  matchFilter: MatchFilter;
  analysisStatus: AnalysisStatusFilter;
};

export const userApplicationsKeys = {
  all: ["user-applications"] as const,
  byUser(userId: string) {
    return [...this.all, userId] as const;
  },
  list(
    userId: string,
    options: NormalizedUserApplicationsOptions,
  ) {
    return [...this.byUser(userId), "list", options] as const;
  },
};

const USER_APPLICATIONS_SELECT =
  "id, vaga_titulo, empresa, match_score, status, analysis_status, created_at, updated_at" as const;

function normalizePageSize(pageSize: number | undefined) {
  if (pageSize === undefined || !Number.isFinite(pageSize)) {
    return DEFAULT_USER_APPLICATIONS_PAGE_SIZE;
  }

  return Math.min(
    MAX_USER_APPLICATIONS_PAGE_SIZE,
    Math.max(1, Math.trunc(pageSize)),
  );
}

function normalizeOffset(offset: number | undefined) {
  if (offset === undefined || !Number.isFinite(offset)) {
    return 0;
  }

  return Math.max(0, Math.trunc(offset));
}

function normalizeOptions(
  options: UseUserApplicationsOptions,
): NormalizedUserApplicationsOptions {
  return {
    pageSize: normalizePageSize(options.pageSize),
    matchFilter: options.matchFilter ?? "all",
    analysisStatus: options.analysisStatus ?? "all",
  };
}

export async function fetchUserApplicationsPage({
  userId,
  offset,
  ...options
}: FetchUserApplicationsPageOptions): Promise<UserApplicationsPage> {
  if (!userId) {
    throw new Error("Sessão não autenticada.");
  }

  const safeOffset = normalizeOffset(offset);
  const { pageSize, matchFilter, analysisStatus } =
    normalizeOptions(options);
  const supabase = createClient();
  let request = supabase
    .from("candidaturas")
    .select(USER_APPLICATIONS_SELECT, { count: "exact" })
    .eq("user_id", userId);

  if (analysisStatus !== "all") {
    request = request.eq("analysis_status", analysisStatus);
  }

  switch (matchFilter) {
    case "good":
      request = request.gte("match_score", 80);
      break;
    case "medium":
      request = request.gte("match_score", 60).lt("match_score", 80);
      break;
    case "weak":
      request = request.lt("match_score", 60);
      break;
    case "unscored":
      request = request.is("match_score", null);
      break;
    case "all":
      break;
  }

  const primaryOrder =
    analysisStatus === "pending" ? "updated_at" : "created_at";
  const { data, error, count } = await request
    .order(primaryOrder, { ascending: false })
    .order("id", { ascending: false })
    .range(safeOffset, safeOffset + pageSize - 1);

  if (error) {
    throw error;
  }

  const applications: UserApplication[] = data ?? [];
  const total = count ?? safeOffset + applications.length;
  const loadedThrough = safeOffset + applications.length;
  const hasMore =
    count === null
      ? applications.length === pageSize
      : loadedThrough < count;

  return {
    applications,
    total,
    nextOffset: hasMore ? loadedThrough : null,
  };
}

export function useUserApplications(
  options: UseUserApplicationsOptions = {},
) {
  const {
    user,
    isAnonymous,
    loading: authLoading,
    error: authError,
  } = useAnonymousSession();
  const userId = user?.id ?? null;
  const normalizedOptions = normalizeOptions(options);
  const queryKey = userApplicationsKeys.list(
    userId ?? "sem-sessao",
    normalizedOptions,
  );
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => {
      if (!userId) {
        throw new Error("Sessão não autenticada.");
      }

      return fetchUserApplicationsPage({
        userId,
        offset: pageParam,
        ...normalizedOptions,
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    enabled: Boolean(userId) && !authLoading,
  });
  const applications =
    query.data?.pages.flatMap((page) => page.applications) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;
  const combinedError = authError ? new Error(authError) : query.error;
  const isLoading =
    authLoading || (Boolean(userId) && query.isPending);

  return {
    ...query,
    applications,
    total,
    userId,
    isAnonymous,
    authLoading,
    authError,
    isLoading,
    error: combinedError,
  };
}

export type UseUserApplicationsResult = ReturnType<
  typeof useUserApplications
>;
