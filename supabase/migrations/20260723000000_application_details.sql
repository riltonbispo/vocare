-- Completa o histórico sem reprocessar análises já existentes.
alter table public.candidaturas
  add column if not exists match_score smallint,
  add column if not exists gap_analysis jsonb,
  add column if not exists curriculo_original_url text,
  add column if not exists notas text;

alter table public.candidaturas
  drop constraint if exists candidaturas_status_check;

update public.candidaturas
set status = case status
  when 'entrevista' then 'entrevista'
  when 'rejeitado' then 'rejeitado'
  when 'oferta' then 'em_processo'
  when 'arquivado' then 'arquivado'
  else 'aplicado'
end;

alter table public.candidaturas
  add constraint candidaturas_status_check
    check (
      status in (
        'aplicado',
        'em_processo',
        'entrevista',
        'rejeitado',
        'arquivado'
      )
    ),
  add constraint candidaturas_match_score_check
    check (match_score is null or match_score between 0 and 100);

alter table public.candidaturas
  alter column status set default 'aplicado';

-- As políticas por user_id criadas na migration inicial continuam protegendo
-- SELECT e UPDATE. Reafirmamos RLS para instalações que apliquem esta migration.
alter table public.candidaturas enable row level security;
