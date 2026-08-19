-- =====================================================================
-- SCRIPT DE BANCO DE DADOS: POLÍTICAS RLS PARA TAREFAS E PROCESSOS (BMCRM2)
-- Execute este script no SQL Editor do seu Dashboard do Supabase.
-- =====================================================================

-- 1. Habilitar RLS nas tabelas essenciais
ALTER TABLE IF EXISTS public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.process_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.process_clients ENABLE ROW LEVEL SECURITY;

-- 2. Limpar políticas antigas de tasks
DROP POLICY IF EXISTS "Usuários aprovados podem ver tarefas" ON public.tasks;
DROP POLICY IF EXISTS "Usuários aprovados podem criar tarefas" ON public.tasks;
DROP POLICY IF EXISTS "Usuários aprovados podem atualizar tarefas" ON public.tasks;
DROP POLICY IF EXISTS "Usuários aprovados podem excluir tarefas" ON public.tasks;
DROP POLICY IF EXISTS "Users can manage their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow all authenticated users to read tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow all authenticated users to update tasks" ON public.tasks;

-- 3. Criar políticas completas para TASKS
CREATE POLICY "Usuários aprovados podem ver tarefas"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_approved = true
    )
  );

CREATE POLICY "Usuários aprovados podem criar tarefas"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_approved = true
    )
  );

CREATE POLICY "Usuários aprovados podem atualizar tarefas"
  ON public.tasks FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_approved = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_approved = true
    )
  );

CREATE POLICY "Usuários aprovados podem excluir tarefas"
  ON public.tasks FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_approved = true
    )
  );

-- 4. Limpar e criar políticas para PROCESSES
DROP POLICY IF EXISTS "Usuários aprovados podem ver processos" ON public.processes;
DROP POLICY IF EXISTS "Usuários aprovados podem criar processos" ON public.processes;
DROP POLICY IF EXISTS "Usuários aprovados podem atualizar processos" ON public.processes;
DROP POLICY IF EXISTS "Administradores podem excluir processos" ON public.processes;
DROP POLICY IF EXISTS "Users can manage their own processes" ON public.processes;

CREATE POLICY "Usuários aprovados podem ver processos"
  ON public.processes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_approved = true
    )
  );

CREATE POLICY "Usuários aprovados podem criar processos"
  ON public.processes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_approved = true
    )
  );

CREATE POLICY "Usuários aprovados podem atualizar processos"
  ON public.processes FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_approved = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_approved = true
    )
  );

CREATE POLICY "Administradores podem excluir processos"
  ON public.processes FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
        AND is_approved = true 
        AND role IN ('Administrador', 'Advogado com Controladoria')
    )
  );

-- 5. Políticas para PROCESS_MOVEMENTS
DROP POLICY IF EXISTS "Usuários aprovados podem ver movimentações" ON public.process_movements;
DROP POLICY IF EXISTS "Usuários aprovados podem criar movimentações" ON public.process_movements;
DROP POLICY IF EXISTS "Usuários aprovados podem atualizar movimentações" ON public.process_movements;
DROP POLICY IF EXISTS "Usuários aprovados podem excluir movimentações" ON public.process_movements;

CREATE POLICY "Usuários aprovados podem ver movimentações"
  ON public.process_movements FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approved = true));

CREATE POLICY "Usuários aprovados podem criar movimentações"
  ON public.process_movements FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approved = true));

CREATE POLICY "Usuários aprovados podem atualizar movimentações"
  ON public.process_movements FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approved = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approved = true));

CREATE POLICY "Usuários aprovados podem excluir movimentações"
  ON public.process_movements FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approved = true));

-- 6. Políticas para PROCESS_CLIENTS
DROP POLICY IF EXISTS "Usuários aprovados podem ver vinculos de clientes" ON public.process_clients;
DROP POLICY IF EXISTS "Usuários aprovados podem criar vinculos de clientes" ON public.process_clients;
DROP POLICY IF EXISTS "Usuários aprovados podem atualizar vinculos de clientes" ON public.process_clients;
DROP POLICY IF EXISTS "Usuários aprovados podem excluir vinculos de clientes" ON public.process_clients;

CREATE POLICY "Usuários aprovados podem ver vinculos de clientes"
  ON public.process_clients FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approved = true));

CREATE POLICY "Usuários aprovados podem criar vinculos de clientes"
  ON public.process_clients FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approved = true));

CREATE POLICY "Usuários aprovados podem atualizar vinculos de clientes"
  ON public.process_clients FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approved = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approved = true));

CREATE POLICY "Usuários aprovados podem excluir vinculos de clientes"
  ON public.process_clients FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approved = true));
