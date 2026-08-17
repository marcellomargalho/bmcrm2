-- =====================================================================
-- SCRIPT DE BANCO DE DADOS: DOCUMENTOS PROCESSUAIS PRIVADOS
-- Guia de Segurança BMCRM2 — Item 3
-- Execute este script no SQL Editor do seu Dashboard do Supabase.
-- =====================================================================

-- ─── PASSO 1: Tornar o bucket privado ────────────────────────────────

UPDATE storage.buckets
SET public = false
WHERE id = 'process_documents';

-- ─── PASSO 2: Remover política de leitura pública ────────────────────

DROP POLICY IF EXISTS "Leitura Pública do Bucket process_documents" ON storage.objects;
DROP POLICY IF EXISTS "Public read process_documents"               ON storage.objects;
DROP POLICY IF EXISTS "Give anon users access to process_documents" ON storage.objects;

-- ─── PASSO 3: Adicionar coluna object_path ───────────────────────────
-- Armazena o caminho interno do objeto no bucket em vez de URLs públicas.
-- O frontend deve usar createSignedUrl() para gerar links temporários.

ALTER TABLE public.process_documents
ADD COLUMN IF NOT EXISTS object_path text;

-- ─── PASSO 4: Criar tabela de membros de processo (autorização granular) ──

CREATE TABLE IF NOT EXISTS public.process_members (
  process_id uuid NOT NULL
    REFERENCES public.processes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (process_id, user_id)
);

ALTER TABLE public.process_members ENABLE ROW LEVEL SECURITY;

-- Somente admins podem gerenciar membros de processo
CREATE POLICY "Administradores gerenciam membros de processo"
  ON public.process_members
  FOR ALL
  TO authenticated
  USING (public.is_approved_admin())
  WITH CHECK (public.is_approved_admin());

-- Usuário pode ver os seus próprios vínculos
CREATE POLICY "Usuário vê seus próprios vínculos"
  ON public.process_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ─── PASSO 5: Políticas de storage para bucket privado ───────────────

-- Upload: somente usuários aprovados (com vínculo ao processo ou admin)
CREATE POLICY "Usuários aprovados podem fazer upload de documentos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'process_documents'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND is_approved = true
    )
  );

-- Download: somente usuários aprovados com acesso ao processo
CREATE POLICY "Usuários aprovados podem baixar documentos de seus processos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'process_documents'
    AND (
      public.is_approved_admin()
      OR EXISTS (
        SELECT 1
        FROM public.process_documents pd
        JOIN public.process_members pm ON pm.process_id = pd.process_id
        WHERE pm.user_id = auth.uid()
          AND pd.object_path = storage.objects.name
      )
    )
  );

-- Delete: somente admins ou dono do upload
CREATE POLICY "Administradores podem deletar documentos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'process_documents'
    AND public.is_approved_admin()
  );
