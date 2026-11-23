-- =====================================================================
-- ATUALIZAÇÃO DO E-MAIL REMETENTE PADRÃO (DISPARO DE NOTIFICAÇÕES)
-- Define notificacao@brendamargalho.com como remetente oficial do CRM
-- =====================================================================

UPDATE public.email_notification_settings
SET 
  from_email = 'notificacao@brendamargalho.com',
  from_name = 'Brenda Margalho Advocacia',
  updated_at = NOW()
WHERE id IS NOT NULL;

-- Se ainda não houver nenhuma linha cadastrada, cria a linha com os dados oficiais:
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
  'notificacao@brendamargalho.com',
  'Brenda Margalho Advocacia'
WHERE NOT EXISTS (
  SELECT 1 FROM public.email_notification_settings LIMIT 1
);

