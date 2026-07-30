-- Catálogo reutilizável de canais e associações muitos-para-muitos.
-- A normalização fica no banco para que a unicidade não dependa do cliente.
create or replace function public.canonicalize_application_channel_name(value text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select pg_catalog.regexp_replace(
    pg_catalog.btrim(normalize(value, NFC)),
    '[[:space:]]+',
    ' ',
    'g'
  );
$$;

create or replace function public.normalize_application_channel_name(value text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select pg_catalog.translate(
    pg_catalog.lower(public.canonicalize_application_channel_name(value)),
    'áàâãäéèêëíìîïóòôõöúùûüçñ',
    'aaaaaeeeeiiiiooooouuuucn'
  );
$$;

-- Necessária para a chave estrangeira composta que fixa a propriedade da
-- candidatura no próprio relacionamento.
alter table public.candidaturas
  add constraint candidaturas_id_user_id_key unique (id, user_id);

create table public.application_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  normalized_name text generated always as (
    public.normalize_application_channel_name(name)
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint application_channels_name_length_check
    check (char_length(name) between 1 and 50),
  constraint application_channels_name_canonical_check
    check (name = public.canonicalize_application_channel_name(name)),
  constraint application_channels_name_control_characters_check
    check (name !~ '[[:cntrl:]]'),
  constraint application_channels_name_normalized_check
    check (name is NFC normalized),
  constraint application_channels_normalized_name_check
    check (char_length(normalized_name) between 1 and 50),
  constraint application_channels_user_normalized_name_key
    unique (user_id, normalized_name),
  constraint application_channels_id_user_id_key
    unique (id, user_id)
);

create index application_channels_user_id_name_idx
  on public.application_channels (user_id, name);

create or replace function public.set_application_channels_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_application_channels_updated_at
before update on public.application_channels
for each row
execute function public.set_application_channels_updated_at();

create table public.application_channel_assignments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null,
  channel_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  constraint application_channel_assignments_application_channel_key
    unique (application_id, channel_id),
  constraint application_channel_assignments_application_owner_fkey
    foreign key (application_id, user_id)
    references public.candidaturas (id, user_id)
    on update cascade
    on delete cascade,
  constraint application_channel_assignments_channel_owner_fkey
    foreign key (channel_id, user_id)
    references public.application_channels (id, user_id)
    on update cascade
    on delete cascade
);

create index application_channel_assignments_user_application_idx
  on public.application_channel_assignments (user_id, application_id);

create index application_channel_assignments_user_channel_idx
  on public.application_channel_assignments (user_id, channel_id);

create index application_channel_assignments_channel_owner_idx
  on public.application_channel_assignments (channel_id, user_id);

alter table public.application_channels enable row level security;
alter table public.application_channel_assignments enable row level security;

create policy "usuario ve seus proprios canais"
  on public.application_channels
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "usuario cria seus proprios canais"
  on public.application_channels
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "usuario atualiza seus proprios canais"
  on public.application_channels
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "usuario remove seus proprios canais"
  on public.application_channels
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "usuario ve suas proprias associacoes de canais"
  on public.application_channel_assignments
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "usuario cria suas proprias associacoes de canais"
  on public.application_channel_assignments
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "usuario remove suas proprias associacoes de canais"
  on public.application_channel_assignments
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.application_channels from anon, authenticated;
revoke all on table public.application_channel_assignments from anon, authenticated;
grant select, insert, update, delete
  on table public.application_channels
  to authenticated;
grant select, insert, delete
  on table public.application_channel_assignments
  to authenticated;

revoke all on function public.canonicalize_application_channel_name(text)
  from public;
revoke all on function public.normalize_application_channel_name(text)
  from public;
grant execute
  on function public.canonicalize_application_channel_name(text)
  to authenticated;
grant execute
  on function public.normalize_application_channel_name(text)
  to authenticated;
