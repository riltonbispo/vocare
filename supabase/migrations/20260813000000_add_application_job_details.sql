-- Metadados opcionais da vaga, preenchidos manualmente pelo usuário.
create type public.hiring_model as enum (
  'clt',
  'pj',
  'freelancer',
  'estagio',
  'temporario',
  'outro'
);

comment on type public.hiring_model is
  'Modelos de contratação aceitos em uma candidatura.';

grant usage on type public.hiring_model to authenticated;

alter table public.candidaturas
  add column salario text,
  add column modelo_contratacao public.hiring_model,
  add column skills_nao_dominadas text[] default '{}'::text[];

comment on column public.candidaturas.salario is
  'Faixa ou descrição salarial em texto livre.';
comment on column public.candidaturas.modelo_contratacao is
  'Modelo de contratação informado para a vaga.';
comment on column public.candidaturas.skills_nao_dominadas is
  'Skills da vaga que o candidato informou ainda não dominar.';

-- RLS não precisa de alteração: as policies existentes protegem a linha
-- inteira de candidaturas por auth.uid() = user_id.

-- Rollback (remove também os dados armazenados nessas colunas):
--
-- alter table public.candidaturas
--   drop column if exists skills_nao_dominadas,
--   drop column if exists modelo_contratacao,
--   drop column if exists salario;
--
-- drop type if exists public.hiring_model;
