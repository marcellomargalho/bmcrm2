-- =====================================================================
-- SCRIPT DE BANCO DE DADOS: CONTROLE DE JOBS AGENDADOS
-- Guia de Segurança BMCRM2 — Item 6
-- Execute este script no SQL Editor do seu Dashboard do Supabase.
-- =====================================================================

-- ─── PASSO 1: Criar tabela de controle de execuções ──────────────────
-- Garante que o resumo diário seja enviado no máximo uma vez por dia,
-- mesmo que a função seja chamada mais de uma vez.

CREATE TABLE IF NOT EXISTS public.scheduled_job_runs (
  job_name    text        NOT NULL,
  run_date    date        NOT NULL,
  started_at  timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status      text        NOT NULL DEFAULT 'started',
  PRIMARY KEY (job_name, run_date)
);

ALTER TABLE public.scheduled_job_runs ENABLE ROW LEVEL SECURITY;

-- Somente o service_role (Edge Functions) acessa esta tabela.
-- Nenhuma política para authenticated — acesso vetado para usuários comuns.

-- ─── PASSO 2: Comentário explicativo ─────────────────────────────────

COMMENT ON TABLE public.scheduled_job_runs IS
  'Registra a execução diária de jobs agendados para garantir idempotência. '
  'Inserir uma linha para (job_name, run_date) antes de executar o job. '
  'Se a linha já existir, o job deve ser ignorado (envio duplicado evitado).';
