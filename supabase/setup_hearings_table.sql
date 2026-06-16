-- =====================================================================
-- SCRIPT DE BANCO DE DADOS: CONTROLE E NOTIFICAÇÃO DE AUDIÊNCIAS
-- Execute este script no SQL Editor do seu Dashboard do Supabase.
-- =====================================================================

-- 1. Criação da tabela de Audiências
CREATE TABLE IF NOT EXISTS public.hearings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES auth.users(id) NOT NULL,
  process_id          uuid REFERENCES public.processes(id) ON DELETE SET NULL,
  process_number      text NOT NULL,
  comarca             text,
  client_name         text NOT NULL,
  subject             text,
  hearing_type        text NOT NULL, -- 'Conciliação' | 'Instrução e Julgamento' | 'Outro'
  custom_hearing_type text,          -- valor preenchido manualmente se for 'Outro'
  hearing_date        date NOT NULL,
  hearing_time        time NOT NULL,
  link                text,
  observations        text,
  status              text NOT NULL DEFAULT 'cadastrada', -- 'cadastrada' | 'notificacao_1dia_enviada' | 'notificacao_15min_enviada' | 'concluida' | 'cancelada'
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- 2. Criação da tabela de Logs de Disparo de Notificações
CREATE TABLE IF NOT EXISTS public.hearing_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hearing_id        uuid REFERENCES public.hearings(id) ON DELETE CASCADE,
  notification_type text NOT NULL, -- '1_day_before' | '15_minutes_before'
  recipient         text NOT NULL, -- e-mail destinatário (pode ser múltiplos separados por vírgula)
  status            text NOT NULL, -- 'success' | 'error'
  error_message     text,
  sent_at           timestamptz DEFAULT now()
);

-- 3. Habilitar RLS (Row Level Security) para garantir privacidade dos dados por advogado
ALTER TABLE public.hearings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own hearings" ON public.hearings;
CREATE POLICY "Users can manage their own hearings" ON public.hearings
  FOR ALL TO authenticated USING (auth.uid() = user_id);

ALTER TABLE public.hearing_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view logs of their own hearings" ON public.hearing_logs;
CREATE POLICY "Users can view logs of their own hearings" ON public.hearing_logs
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.hearings h 
      WHERE h.id = public.hearing_logs.hearing_id 
      AND h.user_id = auth.uid()
    )
  );

-- 4. Garantir que a configuração padrão sênior exista na tabela de e-mails
-- Ajuste/Insira o e-mail padrão se a tabela estiver vazia
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
