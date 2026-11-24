import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Escapa caracteres HTML para evitar injeção no corpo do e-mail
function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface NotificationPayload {
  type: 'task_created' | 'task_assigned' | 'status_change' | 'deadline_approaching' | 'overdue' | 'needs_review'
  processId?: string
  taskId?: string
  fromEmail?: string // Permite customizar ou testar outro remetente (ex: intimacao@brendamargalho.com)
  recipients?: string[] // Destinatários específicos selecionados na criação da tarefa
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
    taskType?: string
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // ─── 1. Validar JWT / Autorização ──────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized: cabeçalho de autorização ausente' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const isServiceRole = Boolean(serviceRoleKey && token === serviceRoleKey.trim())

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    serviceRoleKey!
  )

  let callerId = 'service-role'

  if (!isServiceRole) {
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    const { data: { user }, error: userError } = await userClient.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    callerId = user.id

    // ─── 2. Verificar perfil aprovado ──────────────────────────────────
    const { data: profile } = await adminClient
      .from('profiles')
      .select('is_approved, role')
      .eq('id', user.id)
      .single()

    if (!profile?.is_approved) {
      return new Response(JSON.stringify({ error: 'Forbidden: usuário não aprovado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  try {
    // ─── 3. Carregar chave do Resend e configurações no servidor ───────
    const apiKey = Deno.env.get('RESEND_API_KEY')

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY não configurada no ambiente' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const { data: settings } = await adminClient
      .from('email_notification_settings')
      .select('from_name, from_email, team_emails, senior_email, notify_on_task_created, notify_on_task_assigned, notify_on_status_change, notify_on_deadline_approaching, notify_on_overdue, notify_on_needs_review')
      .limit(1)
      .maybeSingle()

    // ─── 4. URL do sistema sempre do ambiente ─────────────────────────
    const systemUrl = Deno.env.get('SYSTEM_URL') || 'https://crm.bmjuris.com.br'

    // ─── 5. Ler payload ────────────────────────────────────────────────
    const payload: NotificationPayload = await req.json()
    const { type, data, recipients: requestedRecipients, fromEmail: requestedFromEmail } = payload

    // ─── 6. Carregar destinatários ─────────────────────────────────────
    // Se foram informados destinatários específicos (ex: responsáveis selecionados na criação da tarefa),
    // o e-mail será enviado ESTRITAMENTE para eles (não para toda a equipe).
    let recipients: string[] = []

    if (requestedRecipients && Array.isArray(requestedRecipients) && requestedRecipients.length > 0) {
      recipients = [...new Set(
        requestedRecipients
          .filter(e => typeof e === 'string' && e.includes('@'))
          .map(e => e.trim().toLowerCase())
      )]
    }

    // Apenas se NENHUM destinatário foi passado (ex: alertas globais de sistema / rotinas automáticas)
    // usa a lista global de configurações como fallback.
    if (recipients.length === 0) {
      const seniorEmail: string = settings?.senior_email || ''
      const teamEmails: string[] = settings?.team_emails || []
      recipients = [...new Set([seniorEmail, ...teamEmails].filter(e => typeof e === 'string' && e.includes('@')).map(e => e.trim().toLowerCase()))]
    }

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhum destinatário configurado ou selecionado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const typeLabels: Record<string, string> = {
      task_created: 'Nova Tarefa Criada',
      task_assigned: 'Tarefa Atribuída',
      status_change: 'Status Atualizado',
      deadline_approaching: '⚠️ Prazo Se Aproximando',
      overdue: '🔴 Tarefa Atrasada',
      needs_review: '⭐ Revisão Necessária',
    }

    // Escapar todos os valores antes de inserir no HTML
    const safeClientName  = escapeHtml(data.clientName)
    const safeProcessNum  = escapeHtml(data.processNumber)
    const safeResponsible = escapeHtml(data.responsible)
    const safeOldStatus   = escapeHtml(data.oldStatus)
    const safeNewStatus   = escapeHtml(data.newStatus)
    const safeLastMove    = escapeHtml(data.lastMovement)
    const safeNextAction  = escapeHtml(data.nextAction)
    const safeDeadline    = escapeHtml(data.deadline)
    const safeTaskType    = escapeHtml(data.taskType)
    const safeObs         = escapeHtml(data.observations)

    const subjectPrefix = safeTaskType ? `[${safeTaskType}] ` : `${typeLabels[type] || type} - `
    const subject = `${subjectPrefix}${safeClientName || safeProcessNum || 'Sistema'}`

    const processUrl = payload.processId
      ? `${systemUrl}/processos/${encodeURIComponent(payload.processId)}`
      : systemUrl

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
    <span class="badge">${escapeHtml(typeLabels[type] || type)}</span>
    <h1>${safeClientName || 'Sistema CRM'}</h1>
    <p>Notificação automática do CRM Advocacia</p>
  </div>
  <div class="body">
    ${safeProcessNum  ? `<div class="row"><div class="label">Processo</div><div class="value">${safeProcessNum}</div></div>`         : ''}
    ${safeClientName  ? `<div class="row"><div class="label">Cliente</div><div class="value">${safeClientName}</div></div>`          : ''}
    ${safeResponsible ? `<div class="row"><div class="label">Responsável</div><div class="value">${safeResponsible}</div></div>`      : ''}
    ${safeOldStatus   ? `<div class="row"><div class="label">Status Anterior</div><div class="value">${safeOldStatus}</div></div>`    : ''}
    ${safeNewStatus   ? `<div class="row"><div class="label">Novo Status</div><div class="value">${safeNewStatus}</div></div>`        : ''}
    ${safeLastMove    ? `<div class="row"><div class="label">Últ. Movimentação</div><div class="value">${safeLastMove}</div></div>`   : ''}
    ${safeNextAction  ? `<div class="row"><div class="label">Próxima Providência</div><div class="value">${safeNextAction}</div></div>` : ''}
    ${safeDeadline    ? `<div class="row"><div class="label">Prazo</div><div class="value">${safeDeadline}</div></div>`              : ''}
    ${safeTaskType    ? `<div class="row"><div class="label">Tipo de Tarefa</div><div class="value">${safeTaskType}</div></div>`      : ''}
    ${safeObs         ? `<div class="row"><div class="label">Observações</div><div class="value">${safeObs}</div></div>`             : ''}
    <a href="${processUrl}" class="btn">Abrir no Sistema →</a>
  </div>
  <div class="footer">CRM Advocacia — Mensagem automática. Não responda este e-mail.</div>
</div>
</body>
</html>`

    // Remetente: prioridade para requestedFromEmail > settings.from_email > notificacao@brendamargalho.com
    const fromEmail = (requestedFromEmail && typeof requestedFromEmail === 'string' && requestedFromEmail.includes('@'))
      ? requestedFromEmail.trim().toLowerCase()
      : (settings?.from_email || 'notificacao@brendamargalho.com')
    const fromName = settings?.from_name || 'Brenda Margalho Advocacia'

    console.log(`[send-notification] Remetente: "${fromName}" <${fromEmail}>`)
    console.log(`[send-notification] Destinatários:`, recipients)
    console.log(`[send-notification] Assunto: ${subject}`)

    // ─── 7. Enviar via Resend ──────────────────────────────────────────
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: recipients,
        subject,
        html: htmlBody,
      }),
    })

    const resendData = await resendRes.json()
    console.log(`[send-notification] Resposta Resend (${resendRes.status}):`, JSON.stringify(resendData))

    // ─── 8. Log de auditoria — registra ID do chamador ─────────────────
    if (payload.processId) {
      await adminClient.from('process_audit_log').insert([{
        process_id: payload.processId,
        task_id: payload.taskId,
        action: type,
        new_value: `E-mail enviado por ${callerId} para: ${recipients.join(', ')} (Status: ${resendRes.status})`,
        email_sent: resendRes.ok,
      }])
    }

    return new Response(JSON.stringify({ 
      success: resendRes.ok, 
      resend: resendData,
      from: fromEmail,
      recipients 
    }), {
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
