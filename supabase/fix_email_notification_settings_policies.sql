-- =====================================================================
-- SCRIPT DE BANCO DE DADOS: CORREÇÃO DE POLÍTICAS DE RLS (SETTINGS)
-- Execute este script no SQL Editor do seu Dashboard do Supabase.
-- =====================================================================

-- 1. Habilitar RLS (Row Level Security) na tabela se não estiver habilitado
ALTER TABLE public.email_notification_settings ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas para evitar duplicação ou conflitos
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON public.email_notification_settings;
DROP POLICY IF EXISTS "Permitir atualização para usuários autenticados" ON public.email_notification_settings;
DROP POLICY IF EXISTS "Permitir inserção para usuários autenticados" ON public.email_notification_settings;
DROP POLICY IF EXISTS "Users can read email settings" ON public.email_notification_settings;
DROP POLICY IF EXISTS "Users can update email settings" ON public.email_notification_settings;
DROP POLICY IF EXISTS "Users can insert email settings" ON public.email_notification_settings;

-- 3. Criar nova política de SELECT: Permite que usuários autenticados leiam as configurações
CREATE POLICY "Permitir leitura para usuários autenticados"
  ON public.email_notification_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- 4. Criar nova política de UPDATE: Permite que usuários autenticados atualizem as configurações
CREATE POLICY "Permitir atualização para usuários autenticados"
  ON public.email_notification_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Criar nova política de INSERT: Permite que usuários autenticados insiram configurações se necessário
CREATE POLICY "Permitir inserção para usuários autenticados"
  ON public.email_notification_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 6. Garantir que a linha de configuração padrão existe
INSERT INTO public.email_notification_settings (
  senior_email,
  daily_summary_enabled,
  notify_on_task_created,
  notify_on_task_assigned,
  notify_on_status_change,
  notify_on_deadline_approaching,
  notify_on_overdue,
  notify_on_needs_review,
  from_email,
  from_name,
  api_key
)
SELECT 
  'brendamargalho.adv@gmail.com',
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  'sistema@escritorio.com.br',
  'CRM Advocacia',
  ''
WHERE NOT EXISTS (
  SELECT 1 FROM public.email_notification_settings LIMIT 1
);
