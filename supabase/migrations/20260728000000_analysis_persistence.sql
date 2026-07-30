-- Separa o ciclo de geração da IA do status de negócio da candidatura.
alter table public.candidaturas
  add column analysis_status text,
  add column last_error text,
  add column error_code text,
  add column retry_count integer not null default 0,
  add column curriculo_input_kind text,
  add column curriculo_arquivo_path text,
  add column curriculo_arquivo_nome text;
-- Registros existentes só foram criados depois de uma análise bem-sucedida.
update public.candidaturas
set analysis_status = 'completed'
where analysis_status is null;
alter table public.candidaturas
  alter column analysis_status set default 'completed',
  alter column analysis_status set not null,
  add constraint candidaturas_analysis_status_check
    check (analysis_status in ('pending', 'completed', 'failed')),
  add constraint candidaturas_retry_count_check
    check (retry_count >= 0),
  add constraint candidaturas_curriculo_input_kind_check
    check (
      curriculo_input_kind is null
      or curriculo_input_kind in ('text', 'pdf')
    );
create index candidaturas_user_analysis_status_updated_at_idx
  on public.candidaturas (user_id, analysis_status, updated_at desc);
-- PDFs precisam sobreviver à primeira chamada ao Gemini para poderem ser
-- reprocessados. O bucket é privado e cada usuário só acessa sua própria pasta.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'curriculos-originais',
  'curriculos-originais',
  false,
  10485760,
  array['application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
create policy "usuario envia seus curriculos originais"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'curriculos-originais'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "usuario le seus curriculos originais"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'curriculos-originais'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "usuario remove seus curriculos originais"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'curriculos-originais'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
