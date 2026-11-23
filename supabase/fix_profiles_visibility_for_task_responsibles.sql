-- =====================================================================
-- CORREÇÃO DEFINITIVA (SEM RECURSÃO INFINITA): RLS EM PROFILES
-- Erro corrigido: "infinite recursion detected in policy for relation 'profiles'"
-- Causa do erro anterior: a política fazia um sub-SELECT na própria tabela
--                         'profiles', gerando um loop infinito no PostgreSQL.
-- Solução: Usar avaliação direta de colunas (sem sub-select) para leitura
--          e função SECURITY DEFINER para checagem de administrador.
--
-- 👉 EXECUTE ESTE SCRIPT NO SQL EDITOR DO SUPABASE DASHBOARD AGORA.
-- =====================================================================

-- 1. Garantir que a função SECURITY DEFINER de admin existe e não causa recursão
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

-- 2. Habilitar RLS na tabela profiles
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Limpar TODAS as políticas antigas de profiles para remover a recursão
DROP POLICY IF EXISTS "Usuários podem ver seus próprios perfis" ON public.profiles;
DROP POLICY IF EXISTS "Perfis próprios visíveis" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Usuários aprovados podem ver perfis" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem ver perfis aprovados" ON public.profiles;
DROP POLICY IF EXISTS "Approved users can view all approved profiles" ON public.profiles;
DROP POLICY IF EXISTS "Usuários aprovados podem ver outros perfis aprovados" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view approved profiles" ON public.profiles;
DROP POLICY IF EXISTS "Usuários autenticados podem ver perfis" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios perfis" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Administradores podem atualizar qualquer perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem inserir seus próprios perfis" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- 4. POLÍTICA DE LEITURA (SELECT):
--    - Cada usuário pode ler seu próprio perfil (id = auth.uid()) -> Permite login mesmo se ainda pendente
--    - Usuários autenticados podem ver perfis aprovados (is_approved = true) -> Lista de responsáveis em tarefas
--    * ATENÇÃO: NÃO HÁ SUBQUERY AQUI! Avaliação direta de colunas -> IMPOSSÍVEL dar recursão infinita!
CREATE POLICY "Usuários autenticados podem ver perfis"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR is_approved = true
  );

-- 5. POLÍTICA DE ATUALIZAÇÃO (UPDATE) - Usuário comum:
--    Cada usuário só pode editar o próprio perfil
CREATE POLICY "Usuários podem atualizar seus próprios perfis"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 6. POLÍTICA DE ATUALIZAÇÃO (UPDATE) - Administrador:
--    Usa a função SECURITY DEFINER is_approved_admin() (bypassa RLS, sem recursão)
CREATE POLICY "Administradores podem atualizar qualquer perfil"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_approved_admin())
  WITH CHECK (public.is_approved_admin());

-- 7. POLÍTICA DE INSERÇÃO (INSERT):
--    Permite criação do próprio perfil ao registrar conta
CREATE POLICY "Usuários podem inserir seus próprios perfis"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());
