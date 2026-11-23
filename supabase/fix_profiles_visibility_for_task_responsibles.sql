-- =====================================================================
-- CORREÇÃO: Visibilidade de Perfis para Responsáveis em Tarefas
-- Problema: Advogados não conseguem ver outros usuários ao adicionar
--           responsáveis em tarefas, pois a política RLS de 'profiles'
--           impede a leitura de perfis de outros usuários.
-- Solução:  Permitir que qualquer usuário aprovado leia os dados
--           básicos (id, name, role, email) de outros usuários aprovados.
-- Execute este script no SQL Editor do seu Dashboard do Supabase.
-- =====================================================================

-- 1. Habilitar RLS na tabela profiles (se ainda não estiver)
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas existentes de SELECT em profiles para evitar conflito
DROP POLICY IF EXISTS "Usuários podem ver seus próprios perfis" ON public.profiles;
DROP POLICY IF EXISTS "Perfis próprios visíveis" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Usuários aprovados podem ver perfis" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem ver perfis aprovados" ON public.profiles;
DROP POLICY IF EXISTS "Approved users can view all approved profiles" ON public.profiles;
DROP POLICY IF EXISTS "Usuários aprovados podem ver outros perfis aprovados" ON public.profiles;

-- 3. Criar política: qualquer usuário aprovado pode ler perfis de outros usuários aprovados
--    Isso é necessário para que a lista de responsáveis em tarefas funcione para todos os roles.
CREATE POLICY "Usuários aprovados podem ver outros perfis aprovados"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    -- O próprio perfil do usuário é sempre visível
    id = auth.uid()
    OR
    -- Usuários aprovados podem ver perfis de outros usuários aprovados
    (
      is_approved = true
      AND EXISTS (
        SELECT 1 FROM public.profiles AS me
        WHERE me.id = auth.uid()
          AND me.is_approved = true
      )
    )
  );

-- 4. Política: cada usuário pode atualizar apenas o próprio perfil
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios perfis" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Usuários podem atualizar seus próprios perfis"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 5. Política: Administradores podem atualizar qualquer perfil (aprovação, role, etc.)
DROP POLICY IF EXISTS "Administradores podem atualizar qualquer perfil" ON public.profiles;
CREATE POLICY "Administradores podem atualizar qualquer perfil"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS me
      WHERE me.id = auth.uid()
        AND me.is_approved = true
        AND me.role IN ('Administrador', 'Advogado com Controladoria')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles AS me
      WHERE me.id = auth.uid()
        AND me.is_approved = true
        AND me.role IN ('Administrador', 'Advogado com Controladoria')
    )
  );

-- 6. Política: INSERT de novo perfil (cadastro inicial)
DROP POLICY IF EXISTS "Usuários podem inserir seus próprios perfis" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Usuários podem inserir seus próprios perfis"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

