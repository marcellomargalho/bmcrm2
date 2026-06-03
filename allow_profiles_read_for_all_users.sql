-- ============================================================
-- Permite que todos os usuários autenticados (incluindo estagiários)
-- possam ler os perfis aprovados da equipe.
-- Isso é necessário para que estagiários possam delegar tarefas
-- a outros membros da equipe no modal de criação de tarefas.
-- ============================================================

-- Verifica se já existe uma policy de leitura para profiles
-- Se não existir, cria uma.

-- Remover policy antiga de SELECT (se existir com nome conflitante)
DROP POLICY IF EXISTS "Authenticated users can view approved profiles" ON public.profiles;

-- Criar policy: qualquer usuário autenticado pode ver profiles aprovados
CREATE POLICY "Authenticated users can view approved profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (is_approved = true);
