import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: settings } = await supabase
      .from('email_notification_settings')
      .select('*').limit(1).maybeSingle()

    if (!settings?.api_key || !settings?.senior_email || !settings?.daily_summary_enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: 'Resumo diário desativado ou não configurado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const todayLabel = today.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

    // 1. Tasks due today
    const { data: dueToday } = await supabase.from('tasks')
      .select('description, responsible, fatal_date').eq('fatal_date', todayStr).neq('status', 'Concluída')

    // 2. Overdue tasks
    const { data: overdue } = await supabase.from('tasks')
      .select('description, responsible, fatal_date').lt('fatal_date', todayStr).neq('status', 'Concluída')

    // 3. Processes needing review
    const { data: needsReview } = await supabase.from('processes')
      .select('number, responsible, clients(name)').eq('needs_senior_review', true)

    // 4. Petitions pending
    const { data: petitions } = await supabase.from('tasks')
      .select('description, responsible').eq('task_type', 'Petição').neq('status', 'Concluída')

    // 5. Stopped processes (no movement > 15 days)
    const cutoff = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    const { data: allProcesses } = await supabase.from('processes')
      .select('id, number, clients(name)').neq('status', 'Arquivado')
    const processIds = (allProcesses || []).map(p => p.id)
    const { data: recentMovements } = await supabase.from('process_movements')
      .select('process_id').in('process_id', processIds).gte('date', cutoff)
    const activeProcessIds = new Set((recentMovements || []).map(m => m.process_id))
    const stopped = (allProcesses || []).filter(p => !activeProcessIds.has(p.id))

    function renderRows(items: any[], fields: string[]) {
      if (!items?.length) return '<p style="color:#64748b;font-size:12px;padding:8px 0;">Nenhum item.</p>'
      return items.map(item => `<div style="padding:8px 0;border-bottom:1px solid #1e2433;font-size:12px;color:#cbd5e1;">${fields.map(f => item[f] || '—').join(' · ')}</div>`).join('')
    }

    const section = (title: string, emoji: string, color: string, content: string) => `
<div style="margin-bottom:24px;">
  <h3 style="color:${color};font-size:13px;font-weight:800;margin:0 0 8px;display:flex;align-items:center;gap:8px;">${emoji} ${title}</h3>
  <div style="background:#161b27;border:1px solid #1e2433;border-radius:12px;padding:12px 16px;">${content}</div>
</div>`

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<style>body{font-family:Inter,Arial,sans-serif;background:#0f1117;color:#e2e8f0;margin:0;padding:0;}</style>
</head><body>
<div style="max-width:600px;margin:40px auto;background:#161b27;border-radius:16px;overflow:hidden;border:1px solid #1e2433;">
  <div style="background:linear-gradient(135deg,#1a1f2e,#0f1117);padding:32px;border-bottom:1px solid #1e2433;">
    <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;">Resumo Diário</p>
    <h1 style="margin:0;font-size:22px;font-weight:900;color:#f1f5f9;">CRM Advocacia</h1>
    <p style="margin:4px 0 0;font-size:12px;color:#64748b;">${todayLabel}</p>
  </div>
  <div style="padding:32px;">
    ${section('Tarefas Vencendo Hoje', '📅', '#caa871', renderRows(dueToday || [], ['description', 'responsible']))}
    ${section('Tarefas Atrasadas', '🔴', '#f87171', renderRows(overdue || [], ['description', 'responsible', 'fatal_date']))}
    ${section('Processos Aguardando Revisão', '⭐', '#fbbf24', renderRows((needsReview || []).map(p => ({ ...p, name: (p.clients as any)?.name })), ['number', 'name', 'responsible']))}
    ${section('Petições Pendentes', '📄', '#818cf8', renderRows(petitions || [], ['description', 'responsible']))}
    ${section('Processos Parados (+15 dias)', '🔵', '#a78bfa', renderRows(stopped.slice(0,10).map(p => ({ ...p, name: (p.clients as any)?.name })), ['number', 'name']))}
    <a href="${Deno.env.get('SYSTEM_URL') || 'https://bmcrm.com.br'}/painel-executivo" style="display:block;margin:24px auto 0;width:fit-content;padding:14px 32px;background:#caa871;color:#0f1117;border-radius:12px;text-decoration:none;font-weight:800;font-size:13px;">Abrir Painel Executivo →</a>
  </div>
  <div style="padding:16px 32px;text-align:center;font-size:10px;color:#334155;border-top:1px solid #1e2433;">CRM Advocacia — Resumo automático diário.</div>
</div>
</body></html>`

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${settings.from_name} <${settings.from_email}>`,
        to: [settings.senior_email],
        subject: `📋 Resumo Diário — ${today.toLocaleDateString('pt-BR')}`,
        html,
      }),
    })

    const result = await resendRes.json()
    return new Response(JSON.stringify({ success: resendRes.ok, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
