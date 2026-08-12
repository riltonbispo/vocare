-- Mantém candidaturas existentes compatíveis sem exigir reprocessamento.
alter table public.candidaturas
  add column if not exists carta_apresentacao text;
