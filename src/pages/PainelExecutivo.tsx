import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutList, AlertTriangle, Clock, CheckCircle2, TrendingUp, Users,
  RotateCcw, FileText, Eye, Filter, Search, X, ChevronRight, Save,
  Loader2, Mail, Bell, Settings, Star, Zap, ArrowUpRight, Shield,
  CalendarClock, UserX, Inbox, AlertCircle, RefreshCw, Send, Check,
  ChevronDown, Gavel, User, Tag, MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProcessExecutivo {
  id: string;
  number: string;
  status: string;
  internal_status: string;
  next_action: string | null;
  needs_senior_review: boolean;
  priority_score: number;
  responsible: string | null;
  area: string | null;
  court: string | null;
  vara: string | null;
  comarca: string | null;
  autor: string | null;
  reu: string | null;
  created_at: string;
  last_reviewed_at: string | null;
  clients?: { name: string; cpf_cnpj: string } | null;
  // computed
  latestMovement?: { description: string; date: string; type: string } | null;
  latestTask?: { description: string; fatal_date: string | null; status: string } | null;
  daysSinceMovement?: number;
  nextFatalDate?: string | null;
}

interface EmailSettings {
  id?: string;
  senior_email: string;
  team_emails: string[];
  notify_on_task_created: boolean;
  notify_on_task_assigned: boolean;
  notify_on_status_change: boolean;
  notify_on_deadline_approaching: boolean;
  notify_on_overdue: boolean;
  notify_on_needs_review: boolean;
  daily_summary_enabled: boolean;
  daily_summary_hour: number;
  api_key: string;
  from_email: string;
  from_name: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INTERNAL_STATUSES = [
  'Aguardando análise',
  'Em elaboração',
  'Aguardando documentos',
  'Aguardando protocolo',
  'Protocolado',
  'Aguardando movimentação judicial',
  'Pendente de resposta do cliente',
  'Pendente de manifestação',
  'Concluído',
  'Atrasado',
  'Urgente',
] as const;

const STATUS_STYLES: Record<string, string> = {
  'Aguardando análise':            'bg-slate-500/15 text-slate-400 border-slate-500/25',
  'Em elaboração':                 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  'Aguardando documentos':         'bg-amber-500/15 text-amber-400 border-amber-500/25',
  'Aguardando protocolo':          'bg-orange-500/15 text-orange-400 border-orange-500/25',
  'Protocolado':                   'bg-teal-500/15 text-teal-400 border-teal-500/25',
  'Aguardando movimentação judicial': 'bg-violet-500/15 text-violet-400 border-violet-500/25',
  'Pendente de resposta do cliente': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  'Pendente de manifestação':      'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
  'Concluído':                     'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  'Atrasado':                      'bg-red-500/15 text-red-400 border-red-500/25',
  'Urgente':                       'bg-red-600/20 text-red-400 border-red-500/40',
};

// ─── Priority Score Calculator ────────────────────────────────────────────────

function calcPriority(proc: ProcessExecutivo): number {
  let score = 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);

  if (proc.nextFatalDate) {
    const fatal = new Date(proc.nextFatalDate + 'T00:00:00');
    const daysLeft = Math.ceil((fatal.getTime() - today.getTime()) / 86400000);
    if (daysLeft < 0) score += 50;
    else if (daysLeft <= 3) score += 40;
    else if (daysLeft <= 7) score += 20;
  }
  if (proc.internal_status === 'Urgente') score += 35;
  if (proc.needs_senior_review) score += 30;
  if (proc.daysSinceMovement !== undefined) {
    if (proc.daysSinceMovement > 30) score += 15;
    if (proc.daysSinceMovement > 15) score += 25;
  }
  if (!proc.responsible) score += 20;
  return score;
}

// ─── StatusBadge ────────────────────────────────────────────────────────────

function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'xs' | 'sm' }) {
  const cls = STATUS_STYLES[status] || 'bg-surface-container-high text-outline border-outline/20';
  return (
    <span className={cn(
      'inline-flex items-center font-bold uppercase tracking-wider rounded-md border',
      size === 'xs' ? 'text-[8px] px-1.5 py-0.5' : 'text-[9px] px-2 py-0.5',
      status === 'Urgente' && 'animate-pulse',
      cls
    )}>
      {status}
    </span>
  );
}

// ─── ProcessDetailModal ────────────────────────────────────────────────────────

function ProcessDetailModal({
  proc, onClose, onStatusChange, onNeedsReviewToggle
}: {
  proc: ProcessExecutivo;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  onNeedsReviewToggle: (id: string, val: boolean) => void;
}) {
  const navigate = useNavigate();
  const [nextAction, setNextAction] = useState(proc.next_action || '');
  const [savingAction, setSavingAction] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('tasks').select('*').eq('process_id', proc.id)
      .order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => setTasks(data || []));
    supabase.from('process_movements').select('*').eq('process_id', proc.id)
      .order('date', { ascending: false }).limit(5)
      .then(({ data }) => setMovements(data || []));
  }, [proc.id]);

  async function saveNextAction() {
    setSavingAction(true);
    await supabase.from('processes').update({ next_action: nextAction }).eq('id', proc.id);
    setSavingAction(false);
  }

  const pendingTasks = tasks.filter(t => t.status !== 'Concluída');
  const doneTasks = tasks.filter(t => t.status === 'Concluída');

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-surface-container-low w-full max-w-2xl max-h-[90vh] rounded-3xl border border-outline-variant/10 shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-5 border-b border-outline-variant/10 bg-surface-container-high/30 flex items-start justify-between shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
                <Gavel className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-headline font-bold text-on-surface text-base leading-tight">{proc.number}</h3>
                <p className="text-xs text-outline">{proc.clients?.name || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-2">
              <StatusBadge status={proc.internal_status} />
              {proc.needs_senior_review && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/25">
                  ⭐ Revisão Sênior
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-highest rounded-xl text-outline hover:text-on-surface transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6 space-y-6">
          {/* Basic Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Autor', value: proc.autor, icon: <User className="w-3 h-3" /> },
              { label: 'Réu / Parte Contrária', value: proc.reu, icon: <User className="w-3 h-3" /> },
              { label: 'Vara / Órgão', value: [proc.vara, proc.comarca].filter(Boolean).join(' · '), icon: <MapPin className="w-3 h-3" /> },
              { label: 'Tribunal', value: proc.court, icon: <Gavel className="w-3 h-3" /> },
              { label: 'Tipo de Ação', value: proc.area, icon: <Tag className="w-3 h-3" /> },
              { label: 'Responsável Interno', value: proc.responsible, icon: <User className="w-3 h-3" /> },
            ].map(({ label, value, icon }) => (
              <div key={label} className="bg-surface-container-highest/50 p-4 rounded-2xl border border-outline-variant/5">
                <label className="text-[9px] uppercase tracking-widest text-outline font-black flex items-center gap-1.5 mb-1">
                  {icon} {label}
                </label>
                <p className="text-sm font-bold text-on-surface">{value || '—'}</p>
              </div>
            ))}
          </div>

          {/* Status Interno + Needs Review */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container-highest/50 p-4 rounded-2xl border border-outline-variant/5">
              <label className="text-[9px] uppercase tracking-widest text-outline font-black mb-2 block">Status Interno</label>
              <select
                value={proc.internal_status}
                onChange={e => onStatusChange(proc.id, e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-3 py-2 text-xs text-on-surface font-bold focus:border-secondary/40 outline-none appearance-none"
              >
                {INTERNAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="bg-surface-container-highest/50 p-4 rounded-2xl border border-outline-variant/5 flex flex-col justify-between">
              <label className="text-[9px] uppercase tracking-widest text-outline font-black mb-2 block">Requer Revisão da Sênior</label>
              <button
                onClick={() => onNeedsReviewToggle(proc.id, !proc.needs_senior_review)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all',
                  proc.needs_senior_review
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                    : 'bg-surface-container-highest text-outline hover:text-on-surface border border-outline-variant/10'
                )}
              >
                <Star className="w-3.5 h-3.5" />
                {proc.needs_senior_review ? 'Sim — Remover marcação' : 'Não — Marcar para revisão'}
              </button>
            </div>
          </div>

          {/* Próxima Providência */}
          <div>
            <label className="text-[9px] uppercase tracking-widest text-outline font-black mb-2 block">Próxima Providência</label>
            <div className="flex gap-2">
              <input
                value={nextAction}
                onChange={e => setNextAction(e.target.value)}
                placeholder="Descreva a próxima ação necessária..."
                className="flex-1 bg-surface-container-highest border border-outline-variant/20 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:border-secondary/40 outline-none"
              />
              <button
                onClick={saveNextAction}
                disabled={savingAction}
                className="px-4 py-2.5 bg-secondary/10 text-secondary hover:bg-secondary/20 rounded-xl transition-all flex items-center gap-2 text-xs font-bold border border-secondary/20"
              >
                {savingAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Salvar
              </button>
            </div>
          </div>

          {/* Última Movimentação */}
          {movements[0] && (
            <div className="bg-surface-container-highest/50 p-4 rounded-2xl border border-outline-variant/5">
              <label className="text-[9px] uppercase tracking-widest text-outline font-black mb-2 block flex items-center gap-1.5">
                <RotateCcw className="w-3 h-3" /> Última Movimentação
              </label>
              <p className="text-sm font-bold text-on-surface">{movements[0].description}</p>
              <p className="text-[10px] text-outline mt-1">
                {new Date(movements[0].date || movements[0].created_at).toLocaleDateString('pt-BR')} · {movements[0].type}
              </p>
            </div>
          )}

          {/* Tarefas Vinculadas */}
          {tasks.length > 0 && (
            <div>
              <label className="text-[9px] uppercase tracking-widest text-outline font-black mb-3 block">Tarefas Vinculadas</label>
              <div className="space-y-2">
                {tasks.map(t => (
                  <div key={t.id} className={cn(
                    'flex items-center justify-between p-3 rounded-xl border text-xs',
                    t.status === 'Concluída' ? 'bg-surface opacity-60 border-outline-variant/5' : 'bg-surface-container-highest/50 border-outline-variant/10'
                  )}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn('w-2 h-2 rounded-full shrink-0', t.status === 'Concluída' ? 'bg-emerald-500' : 'bg-amber-500')} />
                      <p className={cn('font-medium text-on-surface truncate', t.status === 'Concluída' && 'line-through text-outline')}>{t.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {t.fatal_date && (
                        <span className="text-[9px] text-outline font-bold">
                          {new Date(t.fatal_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>
                      )}
                      <span className={cn(
                        'text-[9px] font-bold uppercase px-1.5 py-0.5 rounded',
                        t.status === 'Concluída' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                      )}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-outline-variant/10 bg-surface-container-high/20 flex justify-between items-center shrink-0">
          <span className="text-[9px] text-outline uppercase tracking-widest">
            Cadastrado em {new Date(proc.created_at).toLocaleDateString('pt-BR')}
          </span>
          <button
            onClick={() => { onClose(); navigate(`/processos/${proc.id}`); }}
            className="flex items-center gap-2 text-secondary hover:text-secondary/80 text-[10px] font-black uppercase tracking-widest transition-colors"
          >
            <ArrowUpRight className="w-3.5 h-3.5" /> Ver Processo Completo
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function PainelExecutivo() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = (queryParams.get('tab') as any) || 'overview';

  const [activeTab, setActiveTab] = useState<'overview' | 'processes' | 'senior' | 'email'>(initialTab);
  const [processes, setProcesses] = useState<ProcessExecutivo[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProcess, setSelectedProcess] = useState<ProcessExecutivo | null>(null);

  // Filters
  const [filterSearch, setFilterSearch] = useState('');
  const [filterResponsible, setFilterResponsible] = useState('');
  const [filterInternalStatus, setFilterInternalStatus] = useState('');
  const [filterUrgency, setFilterUrgency] = useState<'all' | 'critical' | 'review' | 'stopped'>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Email Settings
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    senior_email: '',
    team_emails: [],
    notify_on_task_created: true,
    notify_on_task_assigned: true,
    notify_on_status_change: true,
    notify_on_deadline_approaching: true,
    notify_on_overdue: true,
    notify_on_needs_review: true,
    daily_summary_enabled: true,
    daily_summary_hour: 8,
    api_key: '',
    from_email: 'sistema@escritorio.com.br',
    from_name: 'CRM Advocacia',
  });
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);
  const [newTeamEmail, setNewTeamEmail] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: procs }, { data: allTasks }, { data: profs }] = await Promise.all([
      supabase.from('processes')
        .select('*, clients(name, cpf_cnpj)')
        .neq('status', 'Arquivado')
        .order('created_at', { ascending: false }),
      supabase.from('tasks')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, name, role').order('name'),
    ]);

    setTasks(allTasks || []);
    setProfiles(profs || []);

    if (procs) {
      const today = new Date(); today.setHours(0, 0, 0, 0);

      // Fetch latest movements and tasks for each process
      const processIds = procs.map(p => p.id);
      const [{ data: movements }, { data: latestTasks }] = await Promise.all([
        supabase.from('process_movements')
          .select('*').in('process_id', processIds)
          .order('date', { ascending: false }),
        supabase.from('tasks')
          .select('*').in('process_id', processIds)
          .neq('status', 'Concluída')
          .order('fatal_date', { ascending: true }),
      ]);

      const enriched: ProcessExecutivo[] = procs.map(p => {
        const procMovements = (movements || []).filter(m => m.process_id === p.id);
        const latestMov = procMovements[0] || null;
        const procTasks = (latestTasks || []).filter(t => t.process_id === p.id);
        const nextTask = procTasks.find(t => t.fatal_date) || procTasks[0] || null;

        let daysSinceMovement = 999;
        if (latestMov) {
          const movDate = new Date(latestMov.date || latestMov.created_at);
          daysSinceMovement = Math.floor((today.getTime() - movDate.getTime()) / 86400000);
        }

        const base: ProcessExecutivo = {
          ...p,
          internal_status: p.internal_status || 'Aguardando análise',
          needs_senior_review: p.needs_senior_review || false,
          priority_score: 0,
          latestMovement: latestMov ? {
            description: latestMov.description,
            date: latestMov.date || latestMov.created_at,
            type: latestMov.type,
          } : null,
          latestTask: nextTask ? {
            description: nextTask.description,
            fatal_date: nextTask.fatal_date,
            status: nextTask.status,
          } : null,
          daysSinceMovement,
          nextFatalDate: nextTask?.fatal_date || null,
        };
        base.priority_score = calcPriority(base);
        return base;
      });

      setProcesses(enriched);
    }

    // Load email settings
    const { data: emailData } = await supabase.from('email_notification_settings').select('*').limit(1).maybeSingle();
    if (emailData) {
      setEmailSettings({
        ...emailSettings,
        ...emailData,
        team_emails: emailData.team_emails || [],
        api_key: emailData.api_key || '',
      });
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function updateInternalStatus(id: string, status: string) {
    const proc = processes.find(p => p.id === id);
    setProcesses(prev => prev.map(p => p.id === id ? { ...p, internal_status: status } : p));
    if (selectedProcess?.id === id) setSelectedProcess(prev => prev ? { ...prev, internal_status: status } : null);
    await supabase.from('processes').update({ internal_status: status }).eq('id', id);
    // Audit log
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('process_audit_log').insert([{
      process_id: id,
      user_id: user?.id,
      action: 'status_change',
      field_changed: 'internal_status',
      old_value: proc?.internal_status,
      new_value: status,
    }]);
  }

  async function toggleNeedsReview(id: string, val: boolean) {
    setProcesses(prev => prev.map(p => p.id === id ? { ...p, needs_senior_review: val } : p));
    if (selectedProcess?.id === id) setSelectedProcess(prev => prev ? { ...prev, needs_senior_review: val } : null);
    await supabase.from('processes').update({ needs_senior_review: val }).eq('id', id);
  }

  async function markReviewed(id: string) {
    const now = new Date().toISOString();
    setProcesses(prev => prev.map(p => p.id === id
      ? { ...p, needs_senior_review: false, last_reviewed_at: now }
      : p
    ));
    await supabase.from('processes').update({
      needs_senior_review: false,
      last_reviewed_at: now
    }).eq('id', id);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('process_audit_log').insert([{
      process_id: id,
      user_id: user?.id,
      action: 'reviewed',
      new_value: 'Marcado como revisado pela advogada sênior',
    }]);
  }

  async function saveEmailSettings() {
    setSavingEmail(true);
    try {
      const { id, ...rest } = emailSettings as any;
      let error;
      if (id) {
        const { error: updateError } = await supabase.from('email_notification_settings').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('email_notification_settings').insert([{ ...rest }]);
        error = insertError;
      }
      
      if (error) throw error;
      
      setEmailSaved(true);
      setTimeout(() => setEmailSaved(false), 3000);
      toast.success('Configurações de e-mail salvas com sucesso!');
    } catch (err: any) {
      console.error(err);
      toast.error(`Erro ao salvar configurações: ${err.message || String(err)}`);
    } finally {
      setSavingEmail(false);
    }
  }

  // ─── Derived Data ──────────────────────────────────────────────────────────

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const stats = {
    activeProcesses: processes.length,
    pendingTasks: tasks.filter(t => t.status !== 'Concluída').length,
    completedThisMonth: tasks.filter(t => {
      if (t.status !== 'Concluída') return false;
      const d = new Date(t.updated_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
    overdueTasks: tasks.filter(t => {
      if (t.status === 'Concluída' || !t.fatal_date) return false;
      return new Date(t.fatal_date + 'T00:00:00') < today;
    }).length,
    stoppedProcesses: processes.filter(p => (p.daysSinceMovement || 0) > 15).length,
    needsReview: processes.filter(p => p.needs_senior_review).length,
  };

  const criticalDeadlines = processes
    .filter(p => p.nextFatalDate)
    .map(p => ({
      ...p,
      daysLeft: Math.ceil((new Date(p.nextFatalDate! + 'T00:00:00').getTime() - today.getTime()) / 86400000)
    }))
    .filter(p => p.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // Tasks by team member
  const tasksByMember = profiles.map(prof => {
    const memberTasks = tasks.filter(t => t.responsible?.toLowerCase().includes(prof.name?.toLowerCase()));
    const pending = memberTasks.filter(t => t.status !== 'Concluída').length;
    const done = memberTasks.filter(t => t.status === 'Concluída').length;
    return { ...prof, pending, done, total: memberTasks.length };
  }).filter(m => m.total > 0).sort((a, b) => b.pending - a.pending);

  // Senior review items sorted by priority
  const reviewItems = processes.filter(p => p.needs_senior_review).sort((a, b) => b.priority_score - a.priority_score);
  const urgentProcesses = processes.filter(p => p.internal_status === 'Urgente' || (p.nextFatalDate && Math.ceil((new Date(p.nextFatalDate + 'T00:00:00').getTime() - today.getTime()) / 86400000) <= 3)).sort((a, b) => b.priority_score - a.priority_score);
  const stoppedProcesses = processes.filter(p => (p.daysSinceMovement || 0) > 15).sort((a, b) => (b.daysSinceMovement || 0) - (a.daysSinceMovement || 0));
  const inconsistencies = processes.filter(p =>
    !p.responsible || !p.nextFatalDate
  );

  // Pending approvals
  const pendingApprovals = tasks.filter(t => t.task_type === 'Petição' && t.status === 'Pendente');
  const completedToday = tasks.filter(t => t.status === 'Concluída' && t.updated_at?.startsWith(todayStr));

  // Filtered processes
  const filteredProcesses = processes
    .filter(p => {
      const term = filterSearch.toLowerCase();
      if (term && !p.number.toLowerCase().includes(term) && !p.clients?.name.toLowerCase().includes(term)) return false;
      if (filterResponsible && !p.responsible?.toLowerCase().includes(filterResponsible.toLowerCase())) return false;
      if (filterInternalStatus && p.internal_status !== filterInternalStatus) return false;
      if (filterUrgency === 'critical') return (p.daysSinceMovement || 0) > 0 && p.nextFatalDate && Math.ceil((new Date(p.nextFatalDate + 'T00:00:00').getTime() - today.getTime()) / 86400000) <= 3;
      if (filterUrgency === 'review') return p.needs_senior_review;
      if (filterUrgency === 'stopped') return (p.daysSinceMovement || 0) > 15;
      return true;
    })
    .sort((a, b) => b.priority_score - a.priority_score);

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: <LayoutList className="w-4 h-4" /> },
    { id: 'processes', label: 'Processos & Tarefas', icon: <Gavel className="w-4 h-4" /> },
    { id: 'senior', label: 'Resumo Sênior', icon: <Star className="w-4 h-4" /> },
    { id: 'email', label: 'E-mail', icon: <Mail className="w-4 h-4" /> },
  ] as const;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="text-sm text-outline">Carregando painel executivo...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {selectedProcess && (
        <ProcessDetailModal
          proc={selectedProcess}
          onClose={() => setSelectedProcess(null)}
          onStatusChange={updateInternalStatus}
          onNeedsReviewToggle={toggleNeedsReview}
        />
      )}

      {/* Page Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
              <LayoutList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface">Painel Executivo</h2>
              <p className="text-on-surface-variant text-sm">Visão estratégica do escritório para tomada de decisão</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {stats.needsReview > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <Star className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-400">{stats.needsReview} aguardam sua revisão</span>
            </div>
          )}
          <button onClick={fetchData} className="p-2.5 bg-surface-container-low border border-outline-variant/10 rounded-xl text-outline hover:text-secondary transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex bg-surface-container-low p-1 rounded-2xl border border-outline-variant/10 gap-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all',
              activeTab === tab.id
                ? 'bg-secondary text-on-secondary shadow-lg shadow-secondary/20'
                : 'text-outline hover:text-on-surface hover:bg-surface-container-high'
            )}
          >
            {tab.icon}
            <span className="hidden sm:block">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ═══════════════ TAB 1: OVERVIEW ═══════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'Processos Ativos', value: stats.activeProcesses, icon: <Gavel className="w-5 h-5" />, color: 'text-secondary', bg: 'bg-secondary/10' },
              { label: 'Tarefas Pendentes', value: stats.pendingTasks, icon: <Clock className="w-5 h-5" />, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              { label: 'Concluídas (mês)', value: stats.completedThisMonth, icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Tarefas Atrasadas', value: stats.overdueTasks, icon: <AlertTriangle className="w-5 h-5" />, color: 'text-red-400', bg: 'bg-red-500/10' },
              { label: 'Processos Parados (+15d)', value: stats.stoppedProcesses, icon: <AlertCircle className="w-5 h-5" />, color: 'text-violet-400', bg: 'bg-violet-500/10' },
              { label: 'Aguardando Revisão Sênior', value: stats.needsReview, icon: <Star className="w-5 h-5" />, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            ].map(card => (
              <div key={card.label} className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] text-outline uppercase tracking-widest font-semibold">{card.label}</span>
                  <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', card.bg, card.color)}>
                    {card.icon}
                  </div>
                </div>
                <h3 className={cn('text-3xl font-headline font-black', card.color)}>{card.value}</h3>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Tarefas por membro */}
            <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10">
              <h4 className="font-headline font-bold text-on-surface mb-5 flex items-center gap-2">
                <Users className="w-4 h-4 text-secondary" /> Tarefas por Membro da Equipe
              </h4>
              {tasksByMember.length === 0 ? (
                <p className="text-sm text-outline italic">Nenhuma tarefa atribuída.</p>
              ) : (
                <div className="space-y-4">
                  {tasksByMember.map(member => {
                    const pct = member.total > 0 ? Math.round((member.done / member.total) * 100) : 0;
                    return (
                      <div key={member.id}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary text-[10px] font-black">
                              {member.name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-bold text-on-surface">{member.name}</span>
                            <span className="text-[9px] text-outline">{member.role}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-amber-400 font-bold">{member.pending} pendentes</span>
                            <span className="text-[10px] text-emerald-400 font-bold">{member.done} concluídas</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-secondary to-emerald-400 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Prazos Críticos */}
            <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10">
              <h4 className="font-headline font-bold text-on-surface mb-5 flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-secondary" /> Prazos Críticos (7 dias)
              </h4>
              {criticalDeadlines.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 opacity-50">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                  <p className="text-sm font-medium text-on-surface-variant">Nenhum prazo crítico!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {criticalDeadlines.map(p => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProcess(p)}
                      className="flex items-center justify-between p-3 rounded-xl border border-outline-variant/10 bg-surface-container-highest/50 hover:border-secondary/30 cursor-pointer transition-all group"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-on-surface truncate">{p.clients?.name || p.number}</p>
                        <p className="text-[10px] text-outline truncate">{p.number}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className={cn(
                          'text-xs font-black px-2 py-1 rounded-lg',
                          p.daysLeft < 0 ? 'bg-red-500/10 text-red-400' :
                          p.daysLeft === 0 ? 'bg-secondary/10 text-secondary' :
                          'bg-amber-500/10 text-amber-400'
                        )}>
                          {p.daysLeft < 0 ? `${Math.abs(p.daysLeft)}d atrás` : p.daysLeft === 0 ? 'Hoje' : `${p.daysLeft}d`}
                        </span>
                        <ChevronRight className="w-3 h-3 text-outline opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ TAB 2: PROCESSES & TASKS ═══════════════ */}
      {activeTab === 'processes' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Search + Filter Bar */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
              <input
                value={filterSearch}
                onChange={e => setFilterSearch(e.target.value)}
                placeholder="Buscar por cliente ou número..."
                className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl pl-11 pr-4 py-2.5 text-sm text-on-surface focus:border-secondary/40 outline-none"
              />
            </div>
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all',
                filtersOpen ? 'bg-secondary text-on-secondary border-secondary' : 'bg-surface-container-low border-outline-variant/10 text-outline hover:text-on-surface'
              )}
            >
              <Filter className="w-4 h-4" /> Filtros
            </button>
            <div className="flex gap-2">
              {(['all', 'critical', 'review', 'stopped'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterUrgency(f)}
                  className={cn(
                    'px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all',
                    filterUrgency === f
                      ? f === 'critical' ? 'bg-red-500/15 text-red-400 border-red-500/25'
                        : f === 'review' ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                        : f === 'stopped' ? 'bg-violet-500/15 text-violet-400 border-violet-500/25'
                        : 'bg-secondary text-on-secondary border-secondary'
                      : 'bg-surface-container-low border-outline-variant/10 text-outline hover:text-on-surface'
                  )}
                >
                  {f === 'all' ? 'Todos' : f === 'critical' ? '🔴 Críticos' : f === 'review' ? '⭐ Revisão' : '🔵 Parados'}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced filters panel */}
          {filtersOpen && (
            <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-5 grid grid-cols-2 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Responsável</label>
                <select
                  value={filterResponsible}
                  onChange={e => setFilterResponsible(e.target.value)}
                  className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl px-3 py-2 text-xs text-on-surface appearance-none outline-none"
                >
                  <option value="">Todos</option>
                  {profiles.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Status Interno</label>
                <select
                  value={filterInternalStatus}
                  onChange={e => setFilterInternalStatus(e.target.value)}
                  className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl px-3 py-2 text-xs text-on-surface appearance-none outline-none"
                >
                  <option value="">Todos</option>
                  {INTERNAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => { setFilterSearch(''); setFilterResponsible(''); setFilterInternalStatus(''); setFilterUrgency('all'); }}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-outline hover:text-error transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Limpar filtros
                </button>
              </div>
            </div>
          )}

          {/* Process Table */}
          <div className="bg-surface-container-low rounded-3xl border border-outline-variant/10 overflow-hidden">
            <div className="px-6 py-3 border-b border-outline-variant/5 flex items-center justify-between bg-surface-container-high/20">
              <span className="text-[10px] font-black text-outline uppercase tracking-widest">{filteredProcesses.length} processos</span>
              <span className="text-[10px] text-outline">Ordenado por prioridade</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[9px] uppercase tracking-widest text-outline font-black border-b border-outline-variant/5">
                    <th className="px-6 py-3">Prioridade</th>
                    <th className="px-6 py-3">Processo / Cliente</th>
                    <th className="px-6 py-3">Status Interno</th>
                    <th className="px-6 py-3">Responsável</th>
                    <th className="px-6 py-3">Últ. Movimentação</th>
                    <th className="px-6 py-3">Próximo Prazo</th>
                    <th className="px-6 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5">
                  {filteredProcesses.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-12 text-center text-outline text-xs italic">Nenhum processo encontrado.</td></tr>
                  ) : (
                    filteredProcesses.map(proc => {
                      const score = proc.priority_score;
                      const scoreColor = score >= 50 ? 'text-red-400 bg-red-500/10' : score >= 30 ? 'text-amber-400 bg-amber-500/10' : 'text-outline bg-surface-container-highest';
                      return (
                        <tr
                          key={proc.id}
                          onClick={() => setSelectedProcess(proc)}
                          className="hover:bg-surface-container-high/50 transition-colors cursor-pointer group"
                        >
                          <td className="px-6 py-3">
                            <span className={cn('text-[10px] font-black px-2 py-1 rounded-lg', scoreColor)}>
                              {score > 0 ? `P${score}` : '—'}
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            <p className="text-xs font-bold text-on-surface truncate max-w-[150px]">{proc.clients?.name || '—'}</p>
                            <p className="text-[10px] text-outline font-mono">{proc.number}</p>
                          </td>
                          <td className="px-6 py-3">
                            <select
                              value={proc.internal_status}
                              onClick={e => e.stopPropagation()}
                              onChange={e => { e.stopPropagation(); updateInternalStatus(proc.id, e.target.value); }}
                              className={cn(
                                'text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border appearance-none outline-none bg-transparent cursor-pointer',
                                STATUS_STYLES[proc.internal_status] || ''
                              )}
                            >
                              {INTERNAL_STATUSES.map(s => <option key={s} value={s} className="bg-surface-container text-on-surface normal-case">{s}</option>)}
                            </select>
                          </td>
                          <td className="px-6 py-3">
                            <span className="text-[10px] text-on-surface-variant font-medium truncate block max-w-[100px]">
                              {proc.responsible?.split(',')[0]?.trim() || '—'}
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            {proc.latestMovement ? (
                              <div className="flex flex-col">
                                <p className="text-[10px] text-on-surface truncate max-w-[150px]">{proc.latestMovement.description}</p>
                                <span className={cn(
                                  'text-[9px] font-bold',
                                  (proc.daysSinceMovement || 0) > 15 ? 'text-violet-400' : 'text-outline'
                                )}>
                                  {proc.daysSinceMovement}d atrás
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-outline italic">Sem movimentação</span>
                            )}
                          </td>
                          <td className="px-6 py-3">
                            {proc.nextFatalDate ? (
                              <span className={cn(
                                'text-xs font-bold',
                                Math.ceil((new Date(proc.nextFatalDate + 'T00:00:00').getTime() - today.getTime()) / 86400000) <= 3 ? 'text-red-400' : 'text-on-surface'
                              )}>
                                {new Date(proc.nextFatalDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                              </span>
                            ) : <span className="text-outline text-[10px]">—</span>}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={e => { e.stopPropagation(); toggleNeedsReview(proc.id, !proc.needs_senior_review); }}
                                className={cn(
                                  'p-1.5 rounded-lg transition-all',
                                  proc.needs_senior_review ? 'bg-amber-500/15 text-amber-400' : 'hover:bg-amber-500/10 text-outline hover:text-amber-400'
                                )}
                                title="Marcar para revisão sênior"
                              >
                                <Star className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); setSelectedProcess(proc); }}
                                className="p-1.5 hover:bg-secondary/10 text-outline hover:text-secondary rounded-lg transition-all"
                                title="Ver detalhes"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ TAB 3: SENIOR SUMMARY ═══════════════ */}
      {activeTab === 'senior' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-gradient-to-br from-amber-500/5 to-surface-container-low p-6 rounded-3xl border border-amber-500/15">
            <div className="flex items-center gap-3 mb-1">
              <Star className="w-5 h-5 text-amber-400" />
              <h3 className="font-headline font-bold text-on-surface">Resumo para Advogada Sênior</h3>
            </div>
            <p className="text-xs text-outline">Informações prioritárias para tomada de decisão rápida. Atualizado em tempo real.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Prazos Críticos ≤ 3 dias */}
            <SeniorSection
              title="Prazos Críticos"
              subtitle="Vencendo em até 3 dias"
              icon={<AlertTriangle className="w-4 h-4" />}
              color="red"
              count={urgentProcesses.length}
              empty="Nenhum prazo crítico."
            >
              {urgentProcesses.map(p => (
                <SeniorItem
                  key={p.id}
                  title={p.clients?.name || p.number}
                  subtitle={p.number}
                  badge={p.nextFatalDate ? `${Math.ceil((new Date(p.nextFatalDate + 'T00:00:00').getTime() - today.getTime()) / 86400000)}d` : 'Urgente'}
                  badgeColor="red"
                  action={() => setSelectedProcess(p)}
                />
              ))}
            </SeniorSection>

            {/* Petições aguardando aprovação */}
            <SeniorSection
              title="Petições Aguardando Aprovação"
              subtitle="Precisam da sua validação"
              icon={<FileText className="w-4 h-4" />}
              color="amber"
              count={pendingApprovals.length}
              empty="Nenhuma petição aguardando."
            >
              {pendingApprovals.map(t => (
                <SeniorItem
                  key={t.id}
                  title={t.description}
                  subtitle={t.client_name || t.process_number || '—'}
                  badge="Petição"
                  badgeColor="amber"
                />
              ))}
            </SeniorSection>

            {/* Processos parados */}
            <SeniorSection
              title="Processos Parados"
              subtitle="Sem movimentação há mais de 15 dias"
              icon={<AlertCircle className="w-4 h-4" />}
              color="violet"
              count={stoppedProcesses.length}
              empty="Todos os processos têm movimentação recente."
            >
              {stoppedProcesses.slice(0, 5).map(p => (
                <SeniorItem
                  key={p.id}
                  title={p.clients?.name || p.number}
                  subtitle={`${p.daysSinceMovement}d sem movimentação`}
                  badge={`${p.daysSinceMovement}d`}
                  badgeColor="violet"
                  action={() => setSelectedProcess(p)}
                />
              ))}
            </SeniorSection>

            {/* Alertas de inconsistência */}
            <SeniorSection
              title="Alertas de Inconsistência"
              subtitle="Processos com dados incompletos"
              icon={<Zap className="w-4 h-4" />}
              color="yellow"
              count={inconsistencies.length}
              empty="Nenhuma inconsistência detectada."
            >
              {inconsistencies.slice(0, 5).map(p => (
                <SeniorItem
                  key={p.id}
                  title={p.clients?.name || p.number}
                  subtitle={[!p.responsible && 'Sem responsável', !p.nextFatalDate && 'Sem prazo fatal'].filter(Boolean).join(' · ')}
                  badge="!"
                  badgeColor="yellow"
                  action={() => setSelectedProcess(p)}
                />
              ))}
            </SeniorSection>
          </div>

          {/* Marcados para revisão */}
          {reviewItems.length > 0 && (
            <div className="bg-surface-container-low rounded-3xl border border-outline-variant/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-outline-variant/10 bg-amber-500/5 flex items-center gap-3">
                <Star className="w-4 h-4 text-amber-400" />
                <h4 className="font-headline font-bold text-sm text-on-surface">Marcados para Revisão</h4>
                <span className="px-2 py-0.5 bg-amber-500/15 text-amber-400 text-[10px] font-black rounded-full">{reviewItems.length}</span>
              </div>
              <div className="divide-y divide-outline-variant/5">
                {reviewItems.map(proc => (
                  <div key={proc.id} className="px-6 py-4 flex items-center justify-between hover:bg-surface-container-high/30 transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary text-[10px] font-black shrink-0">
                        {proc.clients?.name?.charAt(0) || '#'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-on-surface truncate">{proc.clients?.name || proc.number}</p>
                        <p className="text-[10px] text-outline">{proc.number} · {proc.responsible || 'Sem responsável'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <StatusBadge status={proc.internal_status} size="xs" />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedProcess(proc)}
                          className="p-1.5 hover:bg-secondary/10 text-outline hover:text-secondary rounded-lg transition-all"
                          title="Ver detalhes"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => markReviewed(proc.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-[10px] font-bold transition-all"
                        >
                          <Check className="w-3 h-3" /> Marcar Revisado
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pendências por responsável */}
          <div className="bg-surface-container-low rounded-3xl border border-outline-variant/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center gap-3">
              <Users className="w-4 h-4 text-secondary" />
              <h4 className="font-headline font-bold text-sm text-on-surface">Pendências por Responsável</h4>
            </div>
            <div className="p-6">
              {tasksByMember.filter(m => m.pending > 0).length === 0 ? (
                <p className="text-sm text-outline italic text-center py-4">Nenhuma pendência.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tasksByMember.filter(m => m.pending > 0).map(member => (
                    <div key={member.id} className="flex items-center justify-between p-4 bg-surface-container-highest/50 rounded-2xl border border-outline-variant/5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary text-xs font-black">
                          {member.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface">{member.name}</p>
                          <p className="text-[10px] text-outline">{member.role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-black text-amber-400">{member.pending}</p>
                        <p className="text-[9px] text-outline uppercase tracking-wider">pendentes</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Concluídos hoje */}
          {completedToday.length > 0 && (
            <div className="bg-surface-container-low rounded-3xl border border-emerald-500/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-emerald-500/10 bg-emerald-500/5 flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h4 className="font-headline font-bold text-sm text-on-surface">Concluídos Hoje</h4>
                <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 text-[10px] font-black rounded-full">{completedToday.length}</span>
              </div>
              <div className="p-6 space-y-2">
                {completedToday.map(t => (
                  <div key={t.id} className="flex items-center gap-3 p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-on-surface truncate">{t.description}</p>
                      <p className="text-[10px] text-outline">{t.responsible?.split(',')[0]?.trim()} · {t.client_name || '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ TAB 4: EMAIL SETTINGS ═══════════════ */}
      {activeTab === 'email' && (
        <div className="space-y-6 animate-in fade-in duration-300 max-w-3xl">
          <div className="bg-surface-container-low p-8 rounded-3xl border border-outline-variant/10 space-y-8">
            <div>
              <h3 className="font-headline font-bold text-lg text-on-surface flex items-center gap-3 mb-1">
                <Mail className="w-5 h-5 text-secondary" /> Configurações de Notificação por E-mail
              </h3>
              <p className="text-sm text-outline">Configure os destinatários e os eventos que disparam e-mails automáticos via Resend.</p>
            </div>

            {/* Provedor */}
            <div className="p-4 bg-secondary/5 border border-secondary/15 rounded-2xl flex items-start gap-3">
              <Shield className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-on-surface">Provedor configurado: <span className="text-secondary">Resend</span></p>
                <p className="text-xs text-outline mt-0.5">Insira sua API Key do Resend (obtenha em resend.com). Gratuito até 3.000 e-mails/mês.</p>
              </div>
            </div>

            {/* API Key */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-outline uppercase tracking-widest">API Key do Resend</label>
                <input
                  type="password"
                  value={emailSettings.api_key}
                  onChange={e => setEmailSettings(s => ({ ...s, api_key: e.target.value }))}
                  placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-secondary/20 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-outline uppercase tracking-widest">E-mail Remetente</label>
                <input
                  type="email"
                  value={emailSettings.from_email}
                  onChange={e => setEmailSettings(s => ({ ...s, from_email: e.target.value }))}
                  className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-secondary/20 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-outline uppercase tracking-widest">Nome do Remetente</label>
                <input
                  type="text"
                  value={emailSettings.from_name}
                  onChange={e => setEmailSettings(s => ({ ...s, from_name: e.target.value }))}
                  className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-secondary/20 outline-none"
                />
              </div>
            </div>

            {/* Senior email */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-outline uppercase tracking-widest flex items-center gap-2">
                <Star className="w-3 h-3 text-amber-400" /> E-mail da Advogada Sênior
              </label>
              <input
                type="email"
                value={emailSettings.senior_email}
                onChange={e => setEmailSettings(s => ({ ...s, senior_email: e.target.value }))}
                placeholder="advogada@escritorio.com.br"
                className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-secondary/20 outline-none"
              />
            </div>

            {/* Team emails */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-outline uppercase tracking-widest">E-mails da Equipe</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={newTeamEmail}
                  onChange={e => setNewTeamEmail(e.target.value)}
                  placeholder="membro@escritorio.com.br"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newTeamEmail) {
                      setEmailSettings(s => ({ ...s, team_emails: [...s.team_emails, newTeamEmail] }));
                      setNewTeamEmail('');
                    }
                  }}
                  className="flex-1 bg-surface-container-highest border border-outline-variant/10 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-secondary/20 outline-none"
                />
                <button
                  onClick={() => { if (newTeamEmail) { setEmailSettings(s => ({ ...s, team_emails: [...s.team_emails, newTeamEmail] })); setNewTeamEmail(''); }}}
                  className="px-4 py-2.5 bg-secondary/10 text-secondary rounded-xl text-xs font-bold border border-secondary/20 hover:bg-secondary/20 transition-all"
                >+ Adicionar</button>
              </div>
              {emailSettings.team_emails.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {emailSettings.team_emails.map((email, i) => (
                    <span key={i} className="flex items-center gap-1.5 bg-secondary/10 text-secondary px-3 py-1 rounded-lg text-xs font-bold border border-secondary/20">
                      {email}
                      <button onClick={() => setEmailSettings(s => ({ ...s, team_emails: s.team_emails.filter((_, idx) => idx !== i) }))} className="hover:text-error">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Event toggles */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-outline uppercase tracking-widest">Eventos que Geram Notificação</label>
              {[
                { key: 'notify_on_task_created', label: 'Nova tarefa criada' },
                { key: 'notify_on_task_assigned', label: 'Tarefa atribuída a alguém' },
                { key: 'notify_on_status_change', label: 'Status do processo/tarefa alterado' },
                { key: 'notify_on_deadline_approaching', label: 'Prazo se aproximando (≤ 3 dias)' },
                { key: 'notify_on_overdue', label: 'Tarefa/processo atrasado' },
                { key: 'notify_on_needs_review', label: 'Processo marcado para revisão sênior' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-3 bg-surface-container-highest/50 rounded-xl border border-outline-variant/5">
                  <span className="text-sm text-on-surface font-medium">{item.label}</span>
                  <button
                    onClick={() => setEmailSettings(s => ({ ...s, [item.key]: !s[item.key as keyof EmailSettings] }))}
                    className={cn(
                      'w-10 h-5 rounded-full transition-all relative',
                      (emailSettings as any)[item.key] ? 'bg-secondary' : 'bg-surface-container-high'
                    )}
                  >
                    <div className={cn(
                      'w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow',
                      (emailSettings as any)[item.key] ? 'left-5.5 left-[22px]' : 'left-0.5'
                    )} />
                  </button>
                </div>
              ))}
            </div>

            {/* Daily Summary */}
            <div className="p-5 bg-surface-container-highest/50 rounded-2xl border border-outline-variant/5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-on-surface">Resumo Diário Automático</p>
                  <p className="text-xs text-outline">Enviado para a advogada sênior com o panorama completo do escritório</p>
                </div>
                <button
                  onClick={() => setEmailSettings(s => ({ ...s, daily_summary_enabled: !s.daily_summary_enabled }))}
                  className={cn(
                    'w-10 h-5 rounded-full transition-all relative',
                    emailSettings.daily_summary_enabled ? 'bg-secondary' : 'bg-surface-container-high'
                  )}
                >
                  <div className={cn(
                    'w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow',
                    emailSettings.daily_summary_enabled ? 'left-[22px]' : 'left-0.5'
                  )} />
                </button>
              </div>
              {emailSettings.daily_summary_enabled && (
                <div className="flex items-center gap-3">
                  <label className="text-xs text-outline font-bold uppercase tracking-wider">Horário de envio:</label>
                  <select
                    value={emailSettings.daily_summary_hour}
                    onChange={e => setEmailSettings(s => ({ ...s, daily_summary_hour: Number(e.target.value) }))}
                    className="bg-surface-container-low border border-outline-variant/10 rounded-xl px-3 py-2 text-sm text-on-surface appearance-none outline-none"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Save */}
            <div className="flex items-center justify-between pt-4 border-t border-outline-variant/10">
              <div>
                {emailSaved && (
                  <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Configurações salvas!
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                 <button
                  className="flex items-center gap-2 px-6 py-3 bg-surface-container-highest text-on-surface-variant font-bold rounded-xl hover:bg-surface-container-high transition-all text-sm border border-outline-variant/10"
                  onClick={async () => {
                    if (!emailSettings.senior_email) {
                      toast.error('Configure o e-mail da sênior antes de testar.');
                      return;
                    }
                    setSavingEmail(true);
                    try {
                      const { data, error } = await supabase.functions.invoke('send-notification', {
                        body: {
                          type: 'task_created',
                          recipients: [emailSettings.senior_email],
                          data: {
                            processNumber: '0000000-00.2026.8.26.0000',
                            clientName: 'Cliente de Teste',
                            responsible: 'Brenda Margalho',
                            nextAction: 'Esta é uma notificação de teste enviada a partir das configurações do painel.',
                            deadline: '16/06/2026',
                            observations: 'Verificação do domínio bmjuris.com.br e funcionamento das configurações.',
                            systemUrl: window.location.origin
                          }
                        }
                      });
                      
                      if (error) throw error;
                      
                      toast.success('E-mail de teste enviado com sucesso!');
                    } catch (err: any) {
                      console.error(err);
                      toast.error(`Falha no envio de teste: ${err.message || String(err)}`);
                    } finally {
                      setSavingEmail(false);
                    }
                  }}
                >
                  <Send className="w-4 h-4" /> Testar E-mail
                </button>
                <button
                  onClick={saveEmailSettings}
                  disabled={savingEmail}
                  className="flex items-center gap-2 px-8 py-3 bg-secondary text-on-secondary font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-secondary/10 text-sm"
                >
                  {savingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar Configurações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper Components ─────────────────────────────────────────────────────────

function SeniorSection({
  title, subtitle, icon, color, count, children, empty
}: {
  title: string; subtitle: string; icon: React.ReactNode;
  color: 'red' | 'amber' | 'violet' | 'yellow';
  count: number; children: React.ReactNode; empty: string;
}) {
  const colorMap = {
    red:    { bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/15' },
    amber:  { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/15' },
    violet: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/15' },
    yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/15' },
  };
  const c = colorMap[color];
  return (
    <div className={cn('bg-surface-container-low rounded-3xl border overflow-hidden', c.border)}>
      <div className={cn('px-6 py-4 border-b flex items-center gap-3', c.bg, c.border)}>
        <div className={cn('p-1.5 rounded-lg', c.bg, c.text)}>{icon}</div>
        <div>
          <h4 className="font-headline font-bold text-sm text-on-surface">{title}</h4>
          <p className="text-[10px] text-outline">{subtitle}</p>
        </div>
        <span className={cn('ml-auto px-2 py-0.5 rounded-full text-[10px] font-black', c.bg, c.text)}>
          {count}
        </span>
      </div>
      <div className="p-4 space-y-2">
        {count === 0 ? (
          <p className="text-xs text-outline italic text-center py-2">{empty}</p>
        ) : children}
      </div>
    </div>
  );
}

function SeniorItem({
  title, subtitle, badge, badgeColor, action
}: {
  title: string; subtitle: string; badge: string;
  badgeColor: 'red' | 'amber' | 'violet' | 'yellow';
  action?: () => void;
}) {
  const colorMap = {
    red:    'bg-red-500/10 text-red-400',
    amber:  'bg-amber-500/10 text-amber-400',
    violet: 'bg-violet-500/10 text-violet-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
  };
  return (
    <div
      onClick={action}
      className={cn(
        'flex items-center justify-between p-3 rounded-xl border border-outline-variant/5 bg-surface-container-highest/50 transition-all',
        action && 'cursor-pointer hover:border-secondary/20 hover:bg-surface-container-high/50'
      )}
    >
      <div className="min-w-0">
        <p className="text-xs font-bold text-on-surface truncate">{title}</p>
        <p className="text-[10px] text-outline truncate">{subtitle}</p>
      </div>
      <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-md ml-2 shrink-0', colorMap[badgeColor])}>
        {badge}
      </span>
    </div>
  );
}
