-- Remove a avaliação numérica e a análise de lacunas das candidaturas.
alter table public.candidaturas
  drop constraint if exists candidaturas_match_score_check,
  drop column if exists match_score,
  drop column if exists gap_analysis;
