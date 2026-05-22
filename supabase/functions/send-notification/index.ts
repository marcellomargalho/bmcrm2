import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  type: 'task_created' | 'task_assigned' | 'status_change' | 'deadline_approaching' | 'overdue' | 'needs_review'
  processId?: string
  taskId?: string
  recipients: string[]
  data: {
    processNumber?: string
    clientName?: string
    responsible?: string
    oldStatus?: string
    newStatus?: string
    lastMovement?: string
    nextAction?: string
    deadline?: string
    observations?: string
    systemUrl?: string
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Load email settings
    const { data: settings } = await supabase
      .from('email_notification_settings')
      .select('*')
      .limit(1)
      .maybeSingle()

    if (!settings?.api_key) {
      return new Response(JSON.stringify({ error: 'API Key do Resend não configurada' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const payload: NotificationPayload = await req.json()
    const { type, data, recipients } = payload

    const typeLabels: Record<string, string> = {
      task_created: 'Nova Tarefa Criada',
      task_assigned: 'Tarefa Atribuída',
      status_change: 'Status Atualizado',
      deadline_approaching: '⚠️ Prazo Se Aproximando',
      overdue: '🔴 Tarefa Atrasada',
      needs_review: '⭐ Revisão Necessária',
    }

    const subject = `${typeLabels[type] || type} – ${data.clientName || data.processNumber || 'Sistema'}`

    const systemUrl = data.systemUrl || Deno.env.get('SYSTEM_URL') || 'https://bmcrm.com.br'
    const processUrl = payload.processId ? `${systemUrl}/processos/${payload.processId}` : systemUrl

    const htmlBody = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Inter, Arial, sans-serif; background: #0f1117; color: #e2e8f0; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background: #161b27; border-radius: 16px; overflow: hidden; border: 1px solid #1e2433; }
  .header { background: linear-gradient(135deg, #1a1f2e, #0f1117); padding: 32px; border-bottom: 1px solid #1e2433; }
  .header h1 { margin: 0; font-size: 20px; font-weight: 800; color: #f1f5f9; }
  .header p { margin: 4px 0 0; font-size: 12px; color: #64748b; }
  .badge { display: inline-block; padding: 4px 12px; background: rgba(202,168,113,0.15); color: #caa871; border: 1px solid rgba(202,168,113,0.25); border-radius: 999px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 16px; }
  .body { padding: 32px; }
  .row { display: flex; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #1e2433; }
  .row:last-child { border-bottom: none; margin-bottom: 0; }
  .label { width: 150px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.1em; padding-top: 2px; flex-shrink: 0; }
  .value { font-size: 13px; color: #cbd5e1; flex: 1; font-weight: 500; }
  .btn { display: block; margin: 24px auto 0; width: fit-content; padding: 14px 32px; background: #caa871; color: #0f1117; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 13px; text-align: center; }
  .footer { padding: 16px 32px; text-align: center; font-size: 10px; color: #334155; border-top: 1px solid #1e2433; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <span class="badge">${typeLabels[type] || type}</span>
    <h1>${data.clientName || 'Sistema CRM'}</h1>
    <p>Notificação automática do CRM Advocacia</p>
  </div>
  <div class="body">
    ${data.processNumber ? `<div class="row"><div class="label">Processo</div><div class="value">${data.processNumber}</div></div>` : ''}
    ${data.clientName ? `<div class="row"><div class="label">Cliente</div><div class="value">${data.clientName}</div></div>` : ''}
    ${data.responsible ? `<div class="row"><div class="label">Responsável</div><div class="value">${data.responsible}</div></div>` : ''}
    ${data.oldStatus ? `<div class="row"><div class="label">Status Anterior</div><div class="value">${data.oldStatus}</div></div>` : ''}
    ${data.newStatus ? `<div class="row"><div class="label">Novo Status</div><div class="value">${data.newStatus}</div></div>` : ''}
    ${data.lastMovement ? `<div class="row"><div class="label">Últ. Movimentação</div><div class="value">${data.lastMovement}</div></div>` : ''}
    ${data.nextAction ? `<div class="row"><div class="label">Próxima Providência</div><div class="value">${data.nextAction}</div></div>` : ''}
    ${data.deadline ? `<div class="row"><div class="label">Prazo</div><div class="value">${data.deadline}</div></div>` : ''}
    ${data.observations ? `<div class="row"><div class="label">Observações</div><div class="value">${data.observations}</div></div>` : ''}
    <a href="${processUrl}" class="btn">Abrir no Sistema →</a>
  </div>
  <div class="footer">CRM Advocacia — Mensagem automática. Não responda este e-mail.</div>
</div>
</body>
</html>`

    // Send via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${settings.from_name} <${settings.from_email}>`,
        to: recipients,
        subject,
        html: htmlBody,
      }),
    })

    const resendData = await resendRes.json()

    // Log to audit
    if (payload.processId) {
      await supabase.from('process_audit_log').insert([{
        process_id: payload.processId,
        task_id: payload.taskId,
        action: type,
        new_value: `E-mail enviado para: ${recipients.join(', ')}`,
        email_sent: resendRes.ok,
      }])
    }

    return new Response(JSON.stringify({ success: resendRes.ok, resend: resendData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: resendRes.ok ? 200 : 400,
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
