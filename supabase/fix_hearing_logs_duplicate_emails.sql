-- =====================================================================
-- CORREÇÃO: Disparo múltiplo de emails de audiências
-- Execute este script no SQL Editor do Supabase.
-- =====================================================================

-- 1. Limpar logs duplicados existentes, mantendo apenas o mais recente
DELETE FROM public.hearing_logs
WHERE id NOT IN (
  SELECT DISTINCT ON (hearing_id, notification_type) id
  FROM public.hearing_logs
  ORDER BY hearing_id, notification_type, sent_at DESC
);

-- 2. Adicionar constraint UNIQUE como proteção definitiva no banco
--    Garante que nunca existirão dois logs do mesmo tipo para a mesma audiência
--    (proteção em nível de banco independente da Edge Function)
ALTER TABLE public.hearing_logs
  DROP CONSTRAINT IF EXISTS hearing_logs_unique_notification;

ALTER TABLE public.hearing_logs
  ADD CONSTRAINT hearing_logs_unique_notification
  UNIQUE (hearing_id, notification_type);

-- 3. Garantir que o service_role pode INSERIR logs de notificação
--    (sem esta política, o log nunca é salvo e o email é reenviado a cada execução)
DROP POLICY IF EXISTS "Service can insert hearing logs" ON public.hearing_logs;
CREATE POLICY "Service can insert hearing logs" ON public.hearing_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 4. Verificação: listar audiências com múltiplos logs do mesmo tipo (diagnóstico)
-- Execute para verificar se ainda existem duplicatas no banco:
-- SELECT hearing_id, notification_type, COUNT(*) as total
-- FROM public.hearing_logs
-- GROUP BY hearing_id, notification_type
-- HAVING COUNT(*) > 1;
