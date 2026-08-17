-- =====================================================================
-- SCRIPT DE BANCO DE DADOS: CORREÇÃO DE POLÍTICAS DE RLS (SETTINGS)
-- Guia de Segurança BMCRM2 — Itens 1 e 2
-- Execute este script no SQL Editor do seu Dashboard do Supabase.
-- ATENÇÃO: Execute APÓS revogar a chave antiga do Resend e configurar
--          a nova via: supabase secrets set RESEND_API_KEY="nova-chave"
-- =====================================================================

-- ─── PASSO 1: Função auxiliar de verificação de admin ────────────────

CREATE OR REPLACE FUNCTION public.is_approved_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_approved = true
      AND role IN ('Administrador', 'Advogado com Controladoria')
  );
$$;

REVOKE ALL ON FUNCTION public.is_approved_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_approved_admin() TO authenticated;

-- ─── PASSO 2: Habilitar RLS ───────────────────────────────────────────

ALTER TABLE public.email_notification_settings ENABLE ROW LEVEL SECURITY;

-- ─── PASSO 3: Remover políticas permissivas existentes ───────────────

DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados"    ON public.email_notification_settings;
DROP POLICY IF EXISTS "Permitir atualização para usuários autenticados" ON public.email_notification_settings;
DROP POLICY IF EXISTS "Permitir inserção para usuários autenticados"   ON public.email_notification_settings;
DROP POLICY IF EXISTS "Users can read email settings"                  ON public.email_notification_settings;
DROP POLICY IF EXISTS "Users can update email settings"                ON public.email_notification_settings;
DROP POLICY IF EXISTS "Users can insert email settings"                ON public.email_notification_settings;
DROP POLICY IF EXISTS "Administradores podem ler configurações"        ON public.email_notification_settings;
DROP POLICY IF EXISTS "Administradores podem atualizar configurações"  ON public.email_notification_settings;
DROP POLICY IF EXISTS "Administradores podem inserir configurações"    ON public.email_notification_settings;

-- ─── PASSO 4: Criar políticas restritas a administradores ────────────

CREATE POLICY "Administradores podem ler configurações"
  ON public.email_notification_settings
  FOR SELECT
  TO authenticated
  USING (public.is_approved_admin());

CREATE POLICY "Administradores podem atualizar configurações"
  ON public.email_notification_settings
  FOR UPDATE
  TO authenticated
  USING (public.is_approved_admin())
  WITH CHECK (public.is_approved_admin());

CREATE POLICY "Administradores podem inserir configurações"
  ON public.email_notification_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_approved_admin());

-- ─── PASSO 5: Garantir linha de configuração padrão (sem api_key) ────

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
  from_name
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
  'CRM Advocacia'
WHERE NOT EXISTS (
  SELECT 1 FROM public.email_notification_settings LIMIT 1
);

-- ─── PASSO 6: Remover coluna api_key (execute após atualizar as Edge Functions) ──
-- ATENÇÃO: só execute esta linha depois de fazer deploy das Edge Functions
--          atualizadas que usam RESEND_API_KEY do ambiente (não da tabela).
--
-- ALTER TABLE public.email_notification_settings DROP COLUMN IF EXISTS api_key;

