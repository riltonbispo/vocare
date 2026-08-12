-- Permite registrar candidaturas que não passam pelo pipeline de análise.
-- analysis_status é text com CHECK (não um enum nativo do PostgreSQL).
alter table public.candidaturas
  drop constraint if exists candidaturas_analysis_status_check,
  add constraint candidaturas_analysis_status_check
    check (
      analysis_status in (
        'pending',
        'completed',
        'failed',
        'nao_aplicavel'
      )
    );

-- Rollback (execute somente depois de publicar uma versão da aplicação que não
-- crie mais registros com analysis_status = 'nao_aplicavel'):
--
-- 1. Confirme a pré-condição:
--    select count(*)
--    from public.candidaturas
--    where analysis_status = 'nao_aplicavel';
--
-- 2. Se houver registros, escolha conscientemente uma estratégia antes de
--    restaurar o CHECK. Para preservá-los no schema antigo, remapeie-os para
--    'completed' (isso perde a distinção semântica de "sem análise"):
--    update public.candidaturas
--    set analysis_status = 'completed'
--    where analysis_status = 'nao_aplicavel';
--
-- 3. Quando a consulta do passo 1 retornar zero, restaure a constraint:
--    alter table public.candidaturas
--      drop constraint if exists candidaturas_analysis_status_check,
--      add constraint candidaturas_analysis_status_check
--        check (analysis_status in ('pending', 'completed', 'failed'));
--
-- O default permanece 'completed' tanto no upgrade quanto no rollback, pois o
-- fluxo existente de análise depende dele.
