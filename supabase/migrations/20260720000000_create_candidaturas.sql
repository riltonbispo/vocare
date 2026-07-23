create table public.candidaturas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  vaga_titulo text,
  empresa text,
  descricao_vaga text,
  curriculo_original text,
  curriculo_otimizado text,
  email_outreach text,
  status text not null default 'gerado'
    check (status in ('gerado', 'enviado', 'entrevista', 'rejeitado', 'oferta')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index candidaturas_user_id_created_at_idx
  on public.candidaturas (user_id, created_at desc);

create or replace function public.set_candidaturas_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_candidaturas_updated_at
before update on public.candidaturas
for each row
execute function public.set_candidaturas_updated_at();

alter table public.candidaturas enable row level security;

create policy "usuario ve suas proprias candidaturas"
  on public.candidaturas
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "usuario insere suas proprias candidaturas"
  on public.candidaturas
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "usuario atualiza suas proprias candidaturas"
  on public.candidaturas
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "usuario deleta suas proprias candidaturas"
  on public.candidaturas
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.candidaturas from anon;
grant select, insert, update, delete on table public.candidaturas to authenticated;
