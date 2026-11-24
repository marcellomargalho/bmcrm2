-- =====================================================================
-- OTIMIZAÇÃO DE PERFORMANCE: ÍNDICES NAS TABELAS PRINCIPAIS DO CRM
-- Execute no SQL Editor do Supabase (100% seguro, sem alterar dados)
-- =====================================================================

-- Tarefas (Dashboard, Processos e Agenda)
CREATE INDEX IF NOT EXISTS idx_tasks_status_fatal_date ON public.tasks (status, fatal_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status_updated_at ON public.tasks (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_process_id ON public.tasks (process_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks (user_id);

-- Processos e vínculos com clientes
CREATE INDEX IF NOT EXISTS idx_processes_status_created_at ON public.processes (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_processes_created_at ON public.processes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_processes_client_id ON public.processes (client_id);

DO $$
BEGIN
  IF to_regclass('public.process_clients') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_process_clients_process_id ON public.process_clients (process_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_process_clients_client_id ON public.process_clients (client_id)';
  END IF;

  IF to_regclass('public.process_movements') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_process_movements_process_date ON public.process_movements (process_id, date DESC)';
  END IF;
END $$;

-- Clientes
CREATE INDEX IF NOT EXISTS idx_clients_status_created_at ON public.clients (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON public.clients (created_at DESC);

-- Audiências, Agenda e Notificações
CREATE INDEX IF NOT EXISTS idx_hearings_date_status ON public.hearings (hearing_date, status);
CREATE INDEX IF NOT EXISTS idx_appointments_source_status ON public.appointments (source, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_created ON public.notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_approved_name ON public.profiles (is_approved, name);
