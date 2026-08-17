-- =====================================================================
-- SCRIPT DE BANCO DE DADOS: POLÍTICAS DE AUDIÊNCIAS — SEGURANÇA
-- Guia de Segurança BMCRM2 — Item 5
-- Execute este script no SQL Editor do seu Dashboard do Supabase.
-- PRÉ-REQUISITO: execute fix_email_notification_settings_policies.sql
--               antes deste (para criar a função is_approved_admin).
-- =====================================================================

-- ─── PASSO 1: Remover políticas globais permissivas de hearings ───────

DROP POLICY IF EXISTS "Users can manage their own hearings"      ON public.hearings;
DROP POLICY IF EXISTS "Authenticated users can view all hearings" ON public.hearings;
DROP POLICY IF EXISTS "Authenticated users can insert hearings"  ON public.hearings;
DROP POLICY IF EXISTS "Authenticated users can update hearings"  ON public.hearings;
DROP POLICY IF EXISTS "Authenticated users can delete hearings"  ON public.hearings;

-- ─── PASSO 2: Habilitar RLS (caso não esteja) ────────────────────────

ALTER TABLE public.hearings ENABLE ROW LEVEL SECURITY;

-- ─── PASSO 3: Visualização — apenas usuários aprovados ───────────────

CREATE POLICY "Usuários aprovados podem visualizar audiências"
  ON public.hearings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND is_approved = true
    )
  );

-- ─── PASSO 4: Insert — usuário aprovado cria audiência vinculada a si ─

CREATE POLICY "Usuários aprovados podem inserir audiências"
  ON public.hearings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND is_approved = true
    )
  );

-- ─── PASSO 5: Update — dono ou admin ─────────────────────────────────

CREATE POLICY "Usuários autorizados podem atualizar audiências"
  ON public.hearings
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_approved_admin()
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_approved_admin()
  );

-- ─── PASSO 6: Delete — somente admin ─────────────────────────────────

CREATE POLICY "Administradores podem excluir audiências"
  ON public.hearings
  FOR DELETE
  TO authenticated
  USING (public.is_approved_admin());

-- ─── PASSO 7: Hearing logs — visualização para aprovados ─────────────

DROP POLICY IF EXISTS "Users can view logs of their own hearings"       ON public.hearing_logs;
DROP POLICY IF EXISTS "Authenticated users can view all hearing logs"   ON public.hearing_logs;

ALTER TABLE public.hearing_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários aprovados visualizam logs de audiências"
  ON public.hearing_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND is_approved = true
    )
  );

-- Somente o sistema (service_role via Edge Function) pode inserir logs
-- Não criar política de INSERT para authenticated.

