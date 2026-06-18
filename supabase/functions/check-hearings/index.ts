import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Carrega as configurações de e-mail e Resend
    const { data: settings } = await supabase
      .from('email_notification_settings')
      .select('*')
      .limit(1)
      .maybeSingle()

    const apiKey = settings?.api_key || Deno.env.get('RESEND_API_KEY')
    const seniorEmail = settings?.senior_email || 'brendamargalho.adv@gmail.com'
    const teamEmails = settings?.team_emails || []
    const fromEmail = settings?.from_email || 'sistema@escritorio.com.br'
    const fromName = settings?.from_name || 'CRM Advocacia'

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API Key do Resend não configurada.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Lista consolidada de destinatários globais (fallback) — sem duplicatas
    const globalRecipients = [...new Set([seniorEmail, ...teamEmails].filter(e => typeof e === 'string' && e.includes('@')))]

    // 2. Definir datas/horas locais em America/Sao_Paulo (UTC-3)
    const getLocalDate = (offsetHours = -3) => {
      const utc = new Date()
      return new Date(utc.getTime() + offsetHours * 60 * 60 * 1000)
    }

    const todayLocal = getLocalDate()
    const todayStr = todayLocal.toISOString().split('T')[0]

    const tomorrowLocal = getLocalDate()
    tomorrowLocal.setDate(tomorrowLocal.getDate() + 1)
    const tomorrowStr = tomorrowLocal.toISOString().split('T')[0]

    // 3. Buscar todas as audiências ativas (não concluídas ou canceladas)
    const { data: hearings, error: hearingsError } = await supabase
      .from('hearings')
      .select('*')
      .not('status', 'in', '("concluida","cancelada")')

    if (hearingsError) throw hearingsError

    const processedList = []

    for (const hearing of (hearings || [])) {
      const hearingId = hearing.id
      const hDate = hearing.hearing_date // YYYY-MM-DD
      const hTime = hearing.hearing_time // HH:MM:SS ou HH:MM

      // Determine recipients for this hearing: either specific emails or the global fallback
      let hearingRecipients = globalRecipients
      if (hearing.notification_emails) {
        const customEmails = hearing.notification_emails
          .split(',')
          .map((e: string) => e.trim().toLowerCase())
          .filter((e: string) => e.length > 0 && e.includes('@'))
        if (customEmails.length > 0) {
          // Deduplicate: merge custom emails with global, removing any duplicates
          hearingRecipients = [...new Set(customEmails)]
        }
      }

      if (hearingRecipients.length === 0) {
        processedList.push({ id: hearingId, error: 'Nenhum destinatário de e-mail configurado para esta audiência.' })
        continue
      }

      // ── A. ALERTA DE 01 DIA ANTES ──────────────────────────────────────────
      if (hDate === tomorrowStr) {
        // PROTEÇÃO 1: verifica status da própria audiência (barreira primária)
        const alreadyNotified1Day = [
          'notificacao_1dia_enviada',
          'notificacao_15min_enviada',
          'concluida',
          'cancelada',
        ].includes(hearing.status)

        if (alreadyNotified1Day) {
          processedList.push({ id: hearingId, type: '1_day_before', status: 'skipped', reason: 'status já indica notificação enviada' })
        } else {
          // PROTEÇÃO 2: verifica se já existe log de envio de 1 dia (barreira secundária)
          const { data: logExists } = await supabase
            .from('hearing_logs')
            .select('id')
            .eq('hearing_id', hearingId)
            .eq('notification_type', '1_day_before')
            .maybeSingle()

          if (!logExists) {
            // Dispara e-mail
            const sendResult = await sendEmail({
              apiKey,
              from: `${fromName} <${fromEmail}>`,
              to: hearingRecipients,
              hearing,
              typeLabel: 'Lembrete de Audiência (Amanhã)',
            })

            // Salva log
            await supabase.from('hearing_logs').insert([{
              hearing_id: hearingId,
              notification_type: '1_day_before',
              recipient: hearingRecipients.join(', '),
              status: sendResult.success ? 'success' : 'error',
              error_message: sendResult.error || null,
            }])

            // Se sucesso, atualiza status da audiência
            if (sendResult.success) {
              await supabase
                .from('hearings')
                .update({ status: 'notificacao_1dia_enviada', updated_at: new Date().toISOString() })
                .eq('id', hearingId)
              processedList.push({ id: hearingId, type: '1_day_before', status: 'success' })
            } else {
              processedList.push({ id: hearingId, type: '1_day_before', status: 'error', error: sendResult.error })
            }
          } else {
            processedList.push({ id: hearingId, type: '1_day_before', status: 'skipped', reason: 'log já existe' })
          }
        }
      }

      // ── B. ALERTA DE 15 MINUTOS ANTES ──────────────────────────────────────
      if (hDate === todayStr) {
        // PROTEÇÃO 1: verifica status da própria audiência (barreira primária)
        const alreadyNotified15Min = [
          'notificacao_15min_enviada',
          'concluida',
          'cancelada',
        ].includes(hearing.status)

        if (alreadyNotified15Min) {
          processedList.push({ id: hearingId, type: '15_minutes_before', status: 'skipped', reason: 'status já indica notificação enviada' })
        } else {
          // Converte data/hora da audiência (UTC-3) para timestamp UTC
          const [y, m, d] = hDate.split('-')
          const [hh, mm] = hTime.split(':')
          const hearingUtc = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh) + 3, Number(mm)))
          
          const nowUtc = new Date()
          const diffMs = hearingUtc.getTime() - nowUtc.getTime()
          const diffMins = diffMs / 60000

          // Se a audiência começa nos próximos 15 minutos (margem de 0 a 15)
          if (diffMins >= 0 && diffMins <= 15) {
            // PROTEÇÃO 2: verifica se já existe log de envio de 15 minutos (barreira secundária)
            const { data: logExists } = await supabase
              .from('hearing_logs')
              .select('id')
              .eq('hearing_id', hearingId)
              .eq('notification_type', '15_minutes_before')
              .maybeSingle()

            if (!logExists) {
              // Dispara e-mail
              const sendResult = await sendEmail({
                apiKey,
                from: `${fromName} <${fromEmail}>`,
                to: hearingRecipients,
                hearing,
                typeLabel: 'Lembrete Urgente (Em 15 minutos)',
              })

              // Salva log
              await supabase.from('hearing_logs').insert([{
                hearing_id: hearingId,
                notification_type: '15_minutes_before',
                recipient: hearingRecipients.join(', '),
                status: sendResult.success ? 'success' : 'error',
                error_message: sendResult.error || null,
              }])

              // Se sucesso, atualiza status da audiência
              if (sendResult.success) {
                await supabase
                  .from('hearings')
                  .update({ status: 'notificacao_15min_enviada', updated_at: new Date().toISOString() })
                  .eq('id', hearingId)
                processedList.push({ id: hearingId, type: '15_minutes_before', status: 'success' })
              } else {
                processedList.push({ id: hearingId, type: '15_minutes_before', status: 'error', error: sendResult.error })
              }
            } else {
              processedList.push({ id: hearingId, type: '15_minutes_before', status: 'skipped', reason: 'log já existe' })
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, processed: processedList }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

// Função auxiliar de envio usando a API do Resend
async function sendEmail({
  apiKey,
  from,
  to,
  hearing,
  typeLabel,
}: {
  apiKey: string
  from: string
  to: string[]
  hearing: any
  typeLabel: string
}) {
  try {
    const formattedDate = formatarDataBR(hearing.hearing_date)
    const formattedTime = hearing.hearing_time.slice(0, 5) // HH:MM
    const typeLabelName = hearing.hearing_type === 'Outro' 
      ? hearing.custom_hearing_type || 'Outro' 
      : hearing.hearing_type

    const subject = `Lembrete de audiência - Processo nº ${hearing.process_number}`

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
    <span class="badge">${typeLabel}</span>
    <h1>Lembrete de Audiência</h1>
    <p>Notificação automática do CRM Advocacia</p>
  </div>
  <div class="body">
    <p style="font-size: 13px; color: #cbd5e1; margin-bottom: 24px;">Prezada Dra. Brenda Margalho,</p>
    <p style="font-size: 13px; color: #cbd5e1; margin-bottom: 24px;">Este é um lembrete automático referente à audiência agendada no processo abaixo:</p>
    
    <div class="row"><div class="label">Processo nº</div><div class="value">${hearing.process_number}</div></div>
    <div class="row"><div class="label">Cliente</div><div class="value">${hearing.client_name}</div></div>
    <div class="row"><div class="label">Comarca</div><div class="value">${hearing.comarca || 'Não informada'}</div></div>
    <div class="row"><div class="label">Assunto</div><div class="value">${hearing.subject || 'Não informado'}</div></div>
    <div class="row"><div class="label">Tipo de audiência</div><div class="value">${typeLabelName}</div></div>
    <div class="row"><div class="label">Data</div><div class="value">${formattedDate}</div></div>
    <div class="row"><div class="label">Horário</div><div class="value">${formattedTime}</div></div>
    ${hearing.link ? `<div class="row"><div class="label">Link da audiência</div><div class="value"><a href="${hearing.link}" style="color: #caa871; text-decoration: underline;">Acessar Sala Virtual</a></div></div>` : ''}
    ${hearing.observations ? `<div class="row"><div class="label">Observações</div><div class="value">${hearing.observations}</div></div>` : ''}
    
    ${hearing.link ? `<a href="${hearing.link}" class="btn">Participar da Audiência →</a>` : ''}
  </div>
  <div class="footer">CRM Advocacia — Mensagem automática. Não responda este e-mail.</div>
</div>
</body>
</html>
`

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html: htmlBody,
      }),
    })

    const data = await resendRes.json()
    if (!resendRes.ok) {
      return { success: false, error: data.message || 'Erro desconhecido ao chamar API do Resend.' }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

function formatarDataBR(dateStr: string): string {
  if (!dateStr) return 'Não informada'
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dateStr
}
