import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Calendar,
  Clock,
  ArrowRight,
  Plus,
  Loader2,
  CheckCircle2,
  Check,
  CalendarClock,
  AlertTriangle,
  RotateCcw,
  X,
  Gavel,
  User,
  Tag,
  Pencil,
  Save,
  Filter,
  AlignLeft,
  History,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NewTaskModal } from '@/components/NewTaskModal';
import { supabase } from '@/lib/supabase';
import { useAuthUser } from '@/lib/authContext';
import { getCached, setCached } from '@/lib/pageCache';
import './RecentTasks.css';

interface DashboardCache {
  allTasks: any[];
  hearingsToday: any[];
  allProfiles: { id: string; name: string; role: string }[];
}

type TableFilterMode = 'attention' | 'all' | 'overdue' | 'today' | 'week' | 'monitoring' | 'completed';

const CACHE_KEY = 'dashboard_bundle_v2';

const TASK_SELECT =
  'id, process_id, client_id, client_name, process_number, description, task_type, responsible, priority, status, fatal_date, ideal_date, related_party, created_at, updated_at, processes(id, number, vara, comarca, court, area, status, responsible, autor, reu, clients(name, cpf_cnpj))';

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function Dashboard() {
  const navigate = useNavigate();
  const authUser = useAuthUser();
  const initialCache = getCached<DashboardCache>(CACHE_KEY);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [allTasks, setAllTasks] = useState<any[]>(() => initialCache?.allTasks || []);
  const [hearingsToday, setHearingsToday] = useState<any[]>(() => initialCache?.hearingsToday || []);
  const [loadingTasks, setLoadingTasks] = useState<boolean>(() => !initialCache);
  const [refreshing, setRefreshing] = useState(false);
  const [localSubmitting, setLocalSubmitting] = useState<string | null>(null);
  const [userData, setUserData] = useState<{ id: string; name: string; role: string } | null>(() =>
    authUser ? { id: authUser.id, name: authUser.name, role: authUser.role } : null
  );
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<any | null>(null);

  // Person filter state (Admin)
  const [allProfiles, setAllProfiles] = useState<{ id: string; name: string; role: string }[]>(
    () => initialCache?.allProfiles || []
  );
  const [personFilter, setPersonFilter] = useState<string>('all');
  const [personRoleFilter, setPersonRoleFilter] = useState<string>('all');

  // Table & search state
  const [tableFilter, setTableFilter] = useState<TableFilterMode>('attention');
  const [searchQuery, setSearchQuery] = useState('');

  // Follow-up state
  const [followUpProcessId, setFollowUpProcessId] = useState<string | null>(null);
  const [showFollowUpPrompt, setShowFollowUpPrompt] = useState(false);
  const [modalLockedProcessId, setModalLockedProcessId] = useState<string | undefined>(undefined);
  const [modalInitialTaskType, setModalInitialTaskType] = useState<string | undefined>(undefined);

  const fetchDashboardData = useCallback(
    async (u: { id: string; name: string; role: string }, mode: 'initial' | 'silent' | 'refresh' = 'initial') => {
      if (!u) return;
      if (mode === 'initial') setLoadingTasks(true);
      else if (mode === 'refresh') setRefreshing(true);

      const isAdminUser = u.role === 'Administrador';
      const todayStr = new Date().toISOString().slice(0, 10);

      try {
        if (!isAdminUser && !u.name) {
          setAllTasks([]);
          return;
        }

        const pendingQuery = supabase
          .from('tasks')
          .select(TASK_SELECT)
          .neq('status', 'Concluída')
          .order('fatal_date', { ascending: true, nullsFirst: false });

        const concludedQuery = supabase
          .from('tasks')
          .select(TASK_SELECT)
          .eq('status', 'Concluída')
          .order('updated_at', { ascending: false })
          .limit(20);

        if (!isAdminUser) {
          pendingQuery.ilike('responsible', `%${u.name}%`);
          concludedQuery.ilike('responsible', `%${u.name}%`);
        }

        const hearingsPromise = supabase
          .from('hearings')
          .select('id, process_id, process_number, client_name, hearing_type, hearing_date, hearing_time')
          .eq('hearing_date', todayStr)
          .neq('status', 'cancelada')
          .order('hearing_time', { ascending: true });

        const profilesPromise = isAdminUser
          ? supabase.from('profiles').select('id, name, role').eq('is_approved', true).order('name', { ascending: true })
          : Promise.resolve({ data: null });

        const [pendingRes, concludedRes, hearingsRes, profilesRes] = await Promise.all([
          pendingQuery,
          concludedQuery,
          hearingsPromise,
          profilesPromise,
        ]);

        const combinedTasks = [...(pendingRes.data || []), ...(concludedRes.data || [])];
        const nextHearings = hearingsRes.data || [];
        const profList = profilesRes.data || allProfiles;

        setAllTasks(combinedTasks);
        setHearingsToday(nextHearings);
        if (profilesRes.data) setAllProfiles(profilesRes.data);

        setCached<DashboardCache>(CACHE_KEY, {
          allTasks: combinedTasks,
          hearingsToday: nextHearings,
          allProfiles: profList,
        });
      } catch (err) {
        console.error('Erro ao carregar dashboard:', err);
      } finally {
        setLoadingTasks(false);
        setRefreshing(false);
      }
    },
    [allProfiles]
  );

  useEffect(() => {
    let tasksChannel: any;
    let hearingsChannel: any;
    let cancelled = false;

    const init = async () => {
      try {
        let u = authUser ? { id: authUser.id, name: authUser.name, role: authUser.role } : null;

        if (!u) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session?.user) {
            setLoadingTasks(false);
            return;
          }
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, name')
            .eq('id', session.user.id)
            .single();
          u = {
            id: session.user.id,
            name: profile?.name || session.user.user_metadata?.full_name || '',
            role: profile?.role || '',
          };
        }

        if (cancelled) return;
        setUserData(u);
        const hasCache = Boolean(getCached(CACHE_KEY));
        await fetchDashboardData(u, hasCache ? 'silent' : 'initial');

        if (cancelled) return;

        tasksChannel = supabase
          .channel('tasks_dashboard_changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
            if (payload.eventType === 'UPDATE') {
              setAllTasks((prev) => prev.map((t) => (t.id === payload.new.id ? { ...t, ...payload.new } : t)));
            } else {
              fetchDashboardData(u!, 'silent');
            }
          })
          .subscribe();

        hearingsChannel = supabase
          .channel('hearings_dashboard')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'hearings' }, () =>
            fetchDashboardData(u!, 'silent')
          )
          .subscribe();
      } catch (err) {
        console.error('Erro ao inicializar dashboard:', err);
        setLoadingTasks(false);
      }
    };

    init();

    return () => {
      cancelled = true;
      if (tasksChannel) supabase.removeChannel(tasksChannel);
      if (hearingsChannel) supabase.removeChannel(hearingsChannel);
    };
  }, [authUser?.id]);

  async function toggleTaskComplete(taskId: string, currentStatus: string, triggerFollowUp: boolean = true) {
    if (localSubmitting === taskId) return;
    const newStatus = currentStatus === 'Concluída' ? 'Pendente' : 'Concluída';

    setLocalSubmitting(taskId);

    const originalAllTasks = [...allTasks];
    const updatedTasks = allTasks.map((t) =>
      t.id === taskId ? { ...t, status: newStatus, updated_at: new Date().toISOString() } : t
    );
    setAllTasks(updatedTasks);

    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', taskId);

    if (error) {
      console.error('Erro ao atualizar tarefa:', error);
      alert(
        `Não foi possível salvar o status da tarefa no banco de dados (${error.message || 'Erro de permissão'}). A alteração foi revertida.`
      );
      setAllTasks(originalAllTasks);
      setLocalSubmitting(null);
      return;
    }

    setCached<DashboardCache>(CACHE_KEY, {
      allTasks: updatedTasks,
      hearingsToday,
      allProfiles,
    });

    if (newStatus === 'Concluída') {
      const task = originalAllTasks.find((t) => t.id === taskId);
      if (task && task.process_id) {
        const userId = authUser?.id || (await supabase.auth.getSession()).data.session?.user?.id;
        const allowedTypes = [
          'Petição',
          'Despacho',
          'Audiência',
          'Julgamento',
          'Protocolo',
          'Diligência',
          'Audiência de Instrução ou Conciliação',
          'Análise de Processo',
          'Outros',
        ];
        const movementType = allowedTypes.includes(task.task_type || '') ? task.task_type : 'Outros';

        await supabase.from('process_movements').insert([
          {
            process_id: task.process_id,
            type: movementType,
            description: `Tarefa concluída: ${task.description}`,
            date: new Date().toISOString(),
            responsible: task.responsible,
            user_id: userId,
          },
        ]);

        if (triggerFollowUp && task.task_type !== 'Acompanhamento de Processo') {
          setFollowUpProcessId(task.process_id);
          setShowFollowUpPrompt(true);
        }
      }
    }

    setLocalSubmitting(null);
  }

  const isAdmin = userData?.role === 'Administrador';

  // Filtro de pessoa/cargo (Admin)
  const scopedTasks = useMemo(() => {
    if (!isAdmin) return allTasks;
    let result = allTasks;
    if (personRoleFilter !== 'all') {
      const profilesOfRole = allProfiles
        .filter((p) => p.role === personRoleFilter)
        .map((p) => p.name?.toLowerCase());
      result = result.filter((t) => profilesOfRole.some((name) => name && t.responsible?.toLowerCase().includes(name)));
    }
    if (personFilter !== 'all') {
      result = result.filter((t) => t.responsible?.toLowerCase().includes(personFilter.toLowerCase()));
    }
    return result;
  }, [allTasks, isAdmin, personFilter, personRoleFilter, allProfiles]);

  const { stats, pendingTasks, completedTasks, todayDueTasks, priorityTasks } = useMemo(() => {
    const pending: any[] = [];
    const completed: any[] = [];
    const dueToday: any[] = [];
    let overdue = 0;
    let week = 0;
    let monitoring = 0;
    let attention = 0;

    for (const t of scopedTasks) {
      if (t.status === 'Concluída') {
        completed.push(t);
        continue;
      }
      pending.push(t);
      if (t.task_type === 'Acompanhamento de Processo') monitoring++;
      if (t.fatal_date) {
        const d = getDaysUntil(t.fatal_date);
        if (d < 0) overdue++;
        else if (d === 0) dueToday.push(t);
        else if (d <= 7) week++;
        if (d <= 3) attention++;
      }
    }

    pending.sort((a, b) => {
      if (!a.fatal_date && !b.fatal_date) return 0;
      if (!a.fatal_date) return 1;
      if (!b.fatal_date) return -1;
      return a.fatal_date < b.fatal_date ? -1 : a.fatal_date > b.fatal_date ? 1 : 0;
    });

    completed.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));

    return {
      stats: {
        overdue,
        today: dueToday.length,
        week,
        monitoring,
        attention,
        hearings: hearingsToday.length,
        totalOpen: pending.length,
        completed: completed.length,
      },
      pendingTasks: pending,
      completedTasks: completed,
      todayDueTasks: dueToday,
      priorityTasks: pending.slice(0, 6),
    };
  }, [scopedTasks, hearingsToday.length]);

  const filteredTableTasks = useMemo(() => {
    const base = tableFilter === 'completed' ? completedTasks : pendingTasks;
    const needle = searchQuery.trim().toLowerCase();

    return base.filter((t) => {
      if (tableFilter === 'attention') {
        const diff = t.fatal_date ? getDaysUntil(t.fatal_date) : null;
        if (diff === null || diff > 3) return false;
      } else if (tableFilter === 'overdue') {
        if (!t.fatal_date || getDaysUntil(t.fatal_date) >= 0) return false;
      } else if (tableFilter === 'today') {
        if (!t.fatal_date || getDaysUntil(t.fatal_date) !== 0) return false;
      } else if (tableFilter === 'week') {
        if (!t.fatal_date) return false;
        const d = getDaysUntil(t.fatal_date);
        if (d < 0 || d > 7) return false;
      } else if (tableFilter === 'monitoring') {
        if (t.task_type !== 'Acompanhamento de Processo') return false;
      }

      if (needle) {
        const client = (t.client_name || t.processes?.clients?.name || '').toLowerCase();
        const proc = (t.process_number || t.processes?.number || '').toLowerCase();
        const desc = (t.description || '').toLowerCase();
        const resp = (t.responsible || '').toLowerCase();
        if (!client.includes(needle) && !proc.includes(needle) && !desc.includes(needle) && !resp.includes(needle)) {
          return false;
        }
      }

      return true;
    });
  }, [pendingTasks, completedTasks, tableFilter, searchQuery]);

  // ─── Task Detail Modal (completo, com todas integrações) ───────────
  const TaskDetailModal = ({ task, onClose }: { task: any; onClose: () => void }) => {
    const proc = task.processes;
    const [editingDates, setEditingDates] = useState(false);
    const [fatalDate, setFatalDate] = useState(task.fatal_date || '');
    const [idealDate, setIdealDate] = useState(task.ideal_date || '');
    const [savingDates, setSavingDates] = useState(false);
    const [dateSaved, setDateSaved] = useState(false);

    // Acompanhamento State
    const [acompanhamentoRelato, setAcompanhamentoRelato] = useState('');
    const [savingAcompanhamento, setSavingAcompanhamento] = useState(false);
    const [timelineRecords, setTimelineRecords] = useState<any[]>([]);
    const [loadingTimeline, setLoadingTimeline] = useState(false);

    const currentDaysUntil = fatalDate ? getDaysUntil(fatalDate) : null;

    async function fetchTimeline() {
      if (!proc?.id) return;
      setLoadingTimeline(true);
      const { data } = await supabase
        .from('process_movements')
        .select('*')
        .eq('process_id', proc.id)
        .like('description', '[ACOMPANHAMENTO]:%')
        .order('date', { ascending: false });
      setTimelineRecords(data || []);
      setLoadingTimeline(false);
    }

    useEffect(() => {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }, []);

    useEffect(() => {
      if (task.task_type === 'Acompanhamento de Processo') {
        fetchTimeline();
      }
    }, [task.id]);

    async function handleRegistrarAcompanhamento() {
      if (!acompanhamentoRelato.trim()) {
        alert('Preencha o relato do acompanhamento.');
        return;
      }
      setSavingAcompanhamento(true);

      const userId = authUser?.id || (await supabase.auth.getSession()).data.session?.user?.id;
      let registradoPor = userData?.name || authUser?.name || null;
      if (!registradoPor && userId) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', userId)
          .single();
        registradoPor = profileData?.name || 'Sistema';
      }

      if (proc?.id) {
        await supabase.from('process_movements').insert([
          {
            process_id: proc.id,
            type: 'Andamento',
            description: `[ACOMPANHAMENTO]: ${acompanhamentoRelato}`,
            date: new Date().toISOString(),
            responsible: registradoPor || 'Sistema',
            user_id: userId,
          },
        ]);
      }

      setAcompanhamentoRelato('');
      setSavingAcompanhamento(false);
      await fetchTimeline();
    }

    async function handleSaveDates() {
      setSavingDates(true);
      const { error } = await supabase
        .from('tasks')
        .update({
          fatal_date: fatalDate || null,
          ideal_date: idealDate || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id);

      if (!error) {
        const nextTasks = allTasks.map((t) =>
          t.id === task.id ? { ...t, fatal_date: fatalDate || null, ideal_date: idealDate || null } : t
        );
        setAllTasks(nextTasks);
        setSelectedTaskDetail({ ...task, fatal_date: fatalDate || null, ideal_date: idealDate || null });
        setCached<DashboardCache>(CACHE_KEY, {
          allTasks: nextTasks,
          hearingsToday,
          allProfiles,
        });
        setDateSaved(true);
        setEditingDates(false);
        setTimeout(() => setDateSaved(false), 2000);
      }
      setSavingDates(false);
    }

    return createPortal(
      <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
        <div
          className="bg-surface-container-low w-full max-w-2xl rounded-3xl border border-outline-variant/20 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 sm:px-8 py-5 border-b border-outline-variant/10 bg-surface-container-high/30 flex items-start justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0',
                  currentDaysUntil !== null && currentDaysUntil < 0
                    ? 'bg-error/10 text-error'
                    : currentDaysUntil === 0
                    ? 'bg-secondary/10 text-secondary'
                    : 'bg-emerald-500/10 text-emerald-500'
                )}
              >
                <Gavel className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-headline font-extrabold text-xl text-on-surface tracking-tight">
                  Detalhes da Demanda
                </h3>
                {task.task_type && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-secondary/15 text-secondary mt-1">
                    <Tag className="w-2.5 h-2.5" /> {task.task_type}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface-container-highest rounded-xl text-outline hover:text-on-surface transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 sm:px-8 py-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
            <div>
              <label className="text-[9px] uppercase tracking-widest text-outline font-black block mb-1.5">
                Descrição
              </label>
              <p className="text-sm text-on-surface font-medium leading-relaxed bg-surface-container-highest/50 p-4 rounded-2xl border border-outline-variant/5">
                {task.description || '—'}
              </p>
            </div>

            {/* Dates Grid - Editable */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] uppercase tracking-widest text-outline font-black">Prazos</span>
                <div className="flex items-center gap-2">
                  {dateSaved && (
                    <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Salvo
                    </span>
                  )}
                  {editingDates ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleSaveDates}
                        disabled={savingDates}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-[10px] font-bold transition-colors"
                      >
                        {savingDates ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        Salvar
                      </button>
                      <button
                        onClick={() => {
                          setEditingDates(false);
                          setFatalDate(task.fatal_date || '');
                          setIdealDate(task.ideal_date || '');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-surface-container-highest text-outline hover:text-on-surface text-[10px] font-bold transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingDates(true)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary/10 text-secondary hover:bg-secondary/20 text-[10px] font-bold transition-colors"
                    >
                      <Pencil className="w-3 h-3" /> Alterar Prazos
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div
                  className={cn(
                    'p-4 rounded-2xl border',
                    editingDates
                      ? 'bg-surface-container-highest border-secondary/20'
                      : 'bg-surface-container-highest/50 border-outline-variant/5'
                  )}
                >
                  <label className="text-[9px] uppercase tracking-widest text-outline font-black flex items-center gap-1.5 mb-1.5">
                    <AlertTriangle className="w-3 h-3" /> Prazo Fatal
                  </label>
                  {editingDates ? (
                    <input
                      type="date"
                      value={fatalDate}
                      onChange={(e) => setFatalDate(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-3 py-2 text-sm text-on-surface font-bold focus:border-secondary/40 outline-none"
                    />
                  ) : (
                    <>
                      <p
                        className={cn(
                          'text-sm font-bold tabular-nums',
                          currentDaysUntil !== null && currentDaysUntil < 0
                            ? 'text-error'
                            : currentDaysUntil === 0
                            ? 'text-secondary'
                            : 'text-on-surface'
                        )}
                      >
                        {fatalDate ? new Date(fatalDate + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                      </p>
                      {currentDaysUntil !== null && (
                        <span
                          className={cn(
                            'text-[10px] font-bold',
                            currentDaysUntil < 0
                              ? 'text-error'
                              : currentDaysUntil === 0
                              ? 'text-secondary'
                              : 'text-emerald-500'
                          )}
                        >
                          {currentDaysUntil < 0
                            ? `${Math.abs(currentDaysUntil)} dia(s) em atraso`
                            : currentDaysUntil === 0
                            ? 'Vence hoje'
                            : `Faltam ${currentDaysUntil} dia(s)`}
                        </span>
                      )}
                    </>
                  )}
                </div>
                <div
                  className={cn(
                    'p-4 rounded-2xl border',
                    editingDates
                      ? 'bg-surface-container-highest border-secondary/20'
                      : 'bg-surface-container-highest/50 border-outline-variant/5'
                  )}
                >
                  <label className="text-[9px] uppercase tracking-widest text-outline font-black flex items-center gap-1.5 mb-1.5">
                    <CalendarClock className="w-3 h-3" /> Meta Ideal
                  </label>
                  {editingDates ? (
                    <input
                      type="date"
                      value={idealDate}
                      onChange={(e) => setIdealDate(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-3 py-2 text-sm text-on-surface font-bold focus:border-secondary/40 outline-none"
                    />
                  ) : (
                    <p className="text-sm font-bold text-on-surface tabular-nums">
                      {idealDate ? new Date(idealDate + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Client & Responsible */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-container-highest/50 p-4 rounded-2xl border border-outline-variant/5">
                <label className="text-[9px] uppercase tracking-widest text-outline font-black flex items-center gap-1.5 mb-1.5">
                  <User className="w-3 h-3" /> Cliente
                </label>
                <p className="text-sm font-bold text-on-surface">{task.client_name || proc?.clients?.name || '—'}</p>
              </div>
              <div className="bg-surface-container-highest/50 p-4 rounded-2xl border border-outline-variant/5">
                <label className="text-[9px] uppercase tracking-widest text-outline font-black flex items-center gap-1.5 mb-1.5">
                  <Users className="w-3 h-3" /> Responsável
                </label>
                <p className="text-sm font-bold text-on-surface">{task.responsible || '—'}</p>
              </div>
            </div>

            {/* Priority */}
            {task.priority && (
              <div className="bg-surface-container-highest/50 p-4 rounded-2xl border border-outline-variant/5">
                <label className="text-[9px] uppercase tracking-widest text-outline font-black block mb-1.5">
                  Prioridade
                </label>
                <span
                  className={cn(
                    'text-xs font-bold px-3 py-1 rounded-lg',
                    task.priority === 'Alta'
                      ? 'bg-error/10 text-error'
                      : task.priority === 'Média'
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'bg-emerald-500/10 text-emerald-400'
                  )}
                >
                  {task.priority}
                </span>
              </div>
            )}

            {/* Acompanhamento de Processo */}
            {task.task_type === 'Acompanhamento de Processo' && (
              <div className="bg-surface-container-highest/50 p-5 rounded-2xl border border-secondary/20 space-y-4">
                <label className="text-[10px] uppercase tracking-widest text-secondary font-black flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" /> Registrar Acompanhamento
                </label>
                <textarea
                  value={acompanhamentoRelato}
                  onChange={(e) => setAcompanhamentoRelato(e.target.value)}
                  placeholder="Relate o que foi verificado neste acompanhamento..."
                  rows={3}
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-outline/50 focus:border-secondary/40 outline-none resize-none"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleRegistrarAcompanhamento}
                    disabled={savingAcompanhamento}
                    className="flex items-center gap-2 px-4 py-2 bg-secondary text-on-secondary text-xs font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {savingAcompanhamento ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Salvar Relato
                  </button>
                </div>

                {loadingTimeline ? (
                  <div className="flex items-center justify-center py-4 text-outline text-xs gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-secondary" /> Carregando histórico...
                  </div>
                ) : (
                  timelineRecords.length > 0 && (
                    <div className="pt-4 border-t border-outline-variant/10 space-y-3">
                      <span className="text-[9px] uppercase tracking-widest text-outline font-black flex items-center gap-1.5">
                        <AlignLeft className="w-3 h-3" /> Linha do Tempo ({timelineRecords.length} registro(s))
                      </span>
                      <div className="space-y-3 pl-3 border-l-2 border-secondary/20 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                        {timelineRecords.map((record) => (
                          <div key={record.id} className="relative pl-4">
                            <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-secondary ring-4 ring-surface-container-low" />
                            <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/10">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-[10px] font-black text-secondary uppercase tracking-wider">
                                  {new Date(record.date).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                                <span className="text-[10px] text-outline font-mono">
                                  {new Date(record.date).toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <p className="text-xs text-on-surface leading-relaxed">
                                {record.description.replace('[ACOMPANHAMENTO]: ', '')}
                              </p>
                              {record.responsible && (
                                <div className="flex items-center gap-1 mt-2">
                                  <div className="w-4 h-4 rounded-full bg-secondary/15 text-secondary flex items-center justify-center text-[8px] font-black shrink-0">
                                    {record.responsible.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="text-[9px] text-outline font-medium">
                                    {record.responsible.split(',')[0].trim()}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            {/* Process Info */}
            {proc && (
              <div className="bg-surface-container-highest/50 p-5 rounded-2xl border border-outline-variant/5 space-y-3">
                <label className="text-[9px] uppercase tracking-widest text-outline font-black flex items-center gap-1.5">
                  <Gavel className="w-3 h-3" /> Informações do Processo
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[9px] text-outline uppercase tracking-widest font-bold">Número</span>
                    <p className="text-xs font-mono font-bold text-on-surface mt-0.5 tabular-nums">{proc.number || '—'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-outline uppercase tracking-widest font-bold">Tribunal</span>
                    <p className="text-xs font-bold text-on-surface mt-0.5">{proc.court || '—'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-outline uppercase tracking-widest font-bold">Vara</span>
                    <p className="text-xs font-bold text-on-surface mt-0.5">{proc.vara || '—'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-outline uppercase tracking-widest font-bold">Comarca</span>
                    <p className="text-xs font-bold text-on-surface mt-0.5">{proc.comarca || '—'}</p>
                  </div>
                  {proc.area && (
                    <div>
                      <span className="text-[9px] text-outline uppercase tracking-widest font-bold">Área</span>
                      <p className="text-xs font-bold text-on-surface mt-0.5">{proc.area}</p>
                    </div>
                  )}
                  {proc.status && (
                    <div>
                      <span className="text-[9px] text-outline uppercase tracking-widest font-bold">Status do Processo</span>
                      <p className="text-xs font-bold text-on-surface mt-0.5">{proc.status}</p>
                    </div>
                  )}
                  {proc.autor && (
                    <div>
                      <span className="text-[9px] text-outline uppercase tracking-widest font-bold">Autor</span>
                      <p className="text-xs font-bold text-on-surface mt-0.5">{proc.autor}</p>
                    </div>
                  )}
                  {proc.reu && (
                    <div>
                      <span className="text-[9px] text-outline uppercase tracking-widest font-bold">Réu</span>
                      <p className="text-xs font-bold text-on-surface mt-0.5">{proc.reu}</p>
                    </div>
                  )}
                </div>
                {proc.id && (
                  <button
                    onClick={() => {
                      onClose();
                      navigate(`/processos/${proc.id}`);
                    }}
                    className="mt-2 flex items-center gap-2 text-secondary hover:text-secondary/80 text-[10px] font-black uppercase tracking-widest transition-colors"
                  >
                    <ArrowRight className="w-3.5 h-3.5" /> Ver Processo Completo
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 sm:px-8 py-4 border-t border-outline-variant/10 bg-surface-container-high/30 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <span className="text-[10px] text-outline uppercase tracking-widest font-bold tabular-nums">
              Criada em {new Date(task.created_at).toLocaleDateString('pt-BR')}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {task.status !== 'Concluída' && task.process_id ? (
                <>
                  <button
                    onClick={() => {
                      toggleTaskComplete(task.id, task.status, false);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors shrink-0"
                    title="Conclui definitivamente esta demanda sem agendar novo acompanhamento"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Finalizar Demanda
                  </button>
                  <button
                    onClick={() => {
                      toggleTaskComplete(task.id, task.status, false);
                      onClose();
                      setModalLockedProcessId(task.process_id);
                      setModalInitialTaskType('Acompanhamento de Processo');
                      setIsTaskModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors shrink-0"
                    title="Conclui a demanda atual e abre para agendar o próximo acompanhamento"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Concluir e Agendar Próximo
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    toggleTaskComplete(task.id, task.status);
                    onClose();
                  }}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors shrink-0',
                    task.status === 'Concluída'
                      ? 'bg-secondary/10 text-secondary hover:bg-secondary/20'
                      : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                  )}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {task.status === 'Concluída' ? 'Reabrir Demanda' : 'Concluir'}
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 bg-surface-container-highest text-on-surface-variant text-xs font-bold rounded-xl hover:bg-surface-container-high transition-colors shrink-0"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      <NewTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setModalLockedProcessId(undefined);
          setModalInitialTaskType(undefined);
        }}
        onSuccess={() => {
          if (userData) fetchDashboardData(userData, 'silent');
        }}
        lockedProcessId={modalLockedProcessId}
        initialTaskType={modalInitialTaskType}
      />

      {showFollowUpPrompt &&
        createPortal(
          <div className="fixed inset-0 bg-black/75 z-[110] flex items-center justify-center p-6">
            <div className="bg-surface-container-low w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center border border-outline-variant/10">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
                <RotateCcw className="w-6 h-6" />
              </div>
              <h3 className="font-headline font-bold text-lg text-on-surface mb-1.5">Demanda Concluída!</h3>
              <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
                Deseja agendar um novo acompanhamento para este processo ou prefere apenas finalizar?
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5 w-full">
                <button
                  onClick={() => setShowFollowUpPrompt(false)}
                  className="flex-1 py-3 px-4 bg-surface-container-highest text-on-surface-variant font-bold text-xs rounded-xl hover:bg-surface-container-high transition-colors"
                >
                  Apenas Finalizar
                </button>
                <button
                  onClick={() => {
                    setShowFollowUpPrompt(false);
                    setModalLockedProcessId(followUpProcessId || undefined);
                    setModalInitialTaskType('Acompanhamento de Processo');
                    setIsTaskModalOpen(true);
                  }}
                  className="flex-1 py-3 px-4 bg-amber-500 text-white font-bold text-xs rounded-xl hover:bg-amber-600 transition-colors shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Agendar Novo
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {selectedTaskDetail && (
        <TaskDetailModal task={selectedTaskDetail} onClose={() => setSelectedTaskDetail(null)} />
      )}

      <div className="max-w-[1440px] mx-auto space-y-6 pb-20">
        {/* Cabeçalho */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-outline-variant/15 pb-5">
          <div>
            <h2 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface">
              Visão Geral
            </h2>
            <p className="text-xs text-outline mt-1 capitalize">{todayFormatted}</p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => userData && fetchDashboardData(userData, 'refresh')}
              disabled={refreshing}
              className="px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/15 text-xs font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <RotateCcw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
              {refreshing ? 'Atualizando...' : 'Atualizar'}
            </button>
            <button
              type="button"
              onClick={() => setIsTaskModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-secondary text-on-secondary text-xs font-headline font-bold hover:opacity-90 transition-opacity inline-flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Nova Tarefa
            </button>
          </div>
        </header>

        {/* Faixa de 6 KPIs práticos e clicáveis */}
        <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            { key: 'overdue' as TableFilterMode, value: stats.overdue, label: 'Em atraso', accent: stats.overdue > 0 ? 'text-error' : 'text-on-surface' },
            { key: 'today' as TableFilterMode, value: stats.today, label: 'Vencem hoje', accent: stats.today > 0 ? 'text-secondary' : 'text-on-surface' },
            { key: 'week' as TableFilterMode, value: stats.week, label: 'Próximos 7 dias', accent: 'text-on-surface' },
            { key: 'monitoring' as TableFilterMode, value: stats.monitoring, label: 'Acompanhamentos', accent: 'text-on-surface' },
            { key: 'today' as TableFilterMode, value: stats.hearings, label: 'Audiências hoje', accent: stats.hearings > 0 ? 'text-secondary' : 'text-on-surface' },
            { key: 'all' as TableFilterMode, value: stats.totalOpen, label: 'Total em aberto', accent: 'text-on-surface' },
          ].map((card, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setTableFilter(card.key)}
              className={cn(
                'bg-surface-container-low rounded-xl p-4 text-left border transition-colors',
                tableFilter === card.key
                  ? 'border-secondary/60 bg-surface-container-high/40'
                  : 'border-outline-variant/15 hover:border-outline-variant/35'
              )}
            >
              <div className={cn('text-2xl font-headline font-extrabold leading-none tabular-nums', card.accent)}>
                {card.value}
              </div>
              <div className="text-[11px] text-outline font-medium mt-2 leading-snug">{card.label}</div>
            </button>
          ))}
        </section>

        {/* Filtro por Cargo e Pessoa (apenas Administrador) */}
        {isAdmin && allProfiles.length > 0 && (
          <section className="bg-surface-container-low border border-outline-variant/15 rounded-xl p-3.5 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-outline flex items-center gap-1.5 mr-1">
              <Filter className="w-3.5 h-3.5 text-secondary" /> Equipe:
            </span>
            {[
              { id: 'all', label: 'Todos' },
              { id: 'Administrador', label: 'Administradores' },
              { id: 'Advogado', label: 'Advogados' },
              { id: 'Estagiário', label: 'Estagiários' },
            ].map((roleOpt) => {
              const hasRole = roleOpt.id === 'all' || allProfiles.some((p) => p.role === roleOpt.id);
              if (!hasRole) return null;
              return (
                <button
                  key={roleOpt.id}
                  type="button"
                  onClick={() => {
                    setPersonRoleFilter(roleOpt.id);
                    setPersonFilter('all');
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors border',
                    personRoleFilter === roleOpt.id
                      ? 'bg-secondary text-on-secondary border-secondary'
                      : 'bg-surface-container-high/50 text-outline border-outline-variant/15 hover:text-on-surface'
                  )}
                >
                  {roleOpt.label}
                </button>
              );
            })}

            <select
              value={personFilter}
              onChange={(e) => setPersonFilter(e.target.value)}
              className="ml-auto bg-surface-container-lowest border border-outline-variant/15 rounded-lg px-3 py-1.5 text-xs text-on-surface focus:border-secondary/60 outline-none"
            >
              <option value="all">Todos os colaboradores</option>
              {(personRoleFilter === 'all'
                ? allProfiles
                : allProfiles.filter((p) => p.role === personRoleFilter)
              ).map((prof) => (
                <option key={prof.id} value={prof.name}>
                  {prof.name}
                </option>
              ))}
            </select>

            {(personFilter !== 'all' || personRoleFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setPersonFilter('all');
                  setPersonRoleFilter('all');
                }}
                className="text-[11px] font-bold text-outline hover:text-error flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Limpar
              </button>
            )}
          </section>
        )}

        {/* Painel 2 colunas: Hoje no escritório + Fila prioritária */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Esquerda: Hoje no Escritório */}
          <div className="lg:col-span-5 bg-surface-container-low rounded-2xl border border-outline-variant/15 p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-headline font-bold text-on-surface flex items-center gap-2">
                <Calendar className="w-4 h-4 text-secondary" />
                Hoje no escritório
              </h3>
              <span className="text-xs font-bold text-outline tabular-nums">
                {todayDueTasks.length + hearingsToday.length} item(ns)
              </span>
            </div>

            {loadingTasks ? (
              <div className="py-12 flex items-center justify-center text-xs text-outline gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-secondary" /> Carregando...
              </div>
            ) : todayDueTasks.length === 0 && hearingsToday.length === 0 ? (
              <div className="py-10 text-center text-xs text-outline border border-dashed border-outline-variant/20 rounded-xl my-auto">
                Nenhum prazo fatal ou audiência marcada para hoje.
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/10 max-h-[340px] overflow-y-auto custom-scrollbar pr-1">
                {hearingsToday.map((h) => (
                  <div key={`h-${h.id}`} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-on-surface flex items-center gap-2 truncate">
                        <Gavel className="w-3.5 h-3.5 text-secondary shrink-0" />
                        <span className="truncate">
                          Audiência {h.hearing_type} — {h.client_name}
                        </span>
                      </p>
                      <p className="text-[11px] text-outline pl-5 mt-0.5 truncate tabular-nums">
                        {h.hearing_time?.slice(0, 5)} · Proc. {h.process_number}
                      </p>
                    </div>
                    {h.process_id && (
                      <button
                        type="button"
                        onClick={() => navigate(`/processos/${h.process_id}`)}
                        className="px-2.5 py-1 rounded-lg border border-outline-variant/20 bg-surface-container-high/50 text-[11px] font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high shrink-0"
                      >
                        Abrir
                      </button>
                    )}
                  </div>
                ))}

                {todayDueTasks.map((t) => (
                  <div key={`t-${t.id}`} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-on-surface flex items-center gap-2 truncate">
                        <Clock className="w-3.5 h-3.5 text-secondary shrink-0" />
                        <span className="truncate">{t.client_name || t.processes?.clients?.name || 'Demanda'}</span>
                      </p>
                      <p className="text-[11px] text-outline pl-5 mt-0.5 truncate">{t.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedTaskDetail(t)}
                        className="px-2.5 py-1 rounded-lg border border-outline-variant/20 bg-surface-container-high/50 text-[11px] font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                      >
                        Abrir
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleTaskComplete(t.id, t.status)}
                        disabled={localSubmitting === t.id}
                        className="px-2.5 py-1 rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
                      >
                        Concluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Direita: Fila Prioritária */}
          <div className="lg:col-span-7 bg-surface-container-low rounded-2xl border border-outline-variant/15 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-headline font-bold text-on-surface flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-secondary" />
                Fila prioritária (prazos mais próximos)
              </h3>
              <button
                type="button"
                onClick={() => setTableFilter('all')}
                className="text-xs font-semibold text-secondary hover:underline"
              >
                Ver todas ({pendingTasks.length})
              </button>
            </div>

            {loadingTasks ? (
              <div className="py-12 flex items-center justify-center text-xs text-outline gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-secondary" /> Carregando...
              </div>
            ) : priorityTasks.length === 0 ? (
              <div className="py-10 text-center text-xs text-outline border border-dashed border-outline-variant/20 rounded-xl">
                Nenhuma tarefa pendente.
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/10">
                {priorityTasks.map((t) => {
                  const diff = t.fatal_date ? getDaysUntil(t.fatal_date) : null;
                  const isOverdue = diff !== null && diff < 0;
                  const isToday = diff === 0;
                  const clientName = t.client_name || t.processes?.clients?.name || 'Sem cliente';

                  return (
                    <div key={t.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-on-surface truncate">{t.description}</p>
                        <p className="text-[11px] text-on-surface-variant mt-0.5 flex items-center gap-2 flex-wrap">
                          <span className="text-secondary font-medium">{clientName}</span>
                          {t.task_type && <span className="text-outline">· {t.task_type}</span>}
                          {t.responsible && <span className="text-outline">· {t.responsible.split(',')[0].trim()}</span>}
                          {t.fatal_date && (
                            <span
                              className={cn(
                                'tabular-nums font-semibold',
                                isOverdue ? 'text-error' : isToday ? 'text-amber-400' : 'text-outline'
                              )}
                            >
                              · {isOverdue ? `${Math.abs(diff!)}d atraso` : isToday ? 'Vence hoje' : formatDateBR(t.fatal_date)}
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setSelectedTaskDetail(t)}
                          className="px-2.5 py-1 rounded-lg border border-outline-variant/20 bg-surface-container-high/50 text-[11px] font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                        >
                          Abrir
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleTaskComplete(t.id, t.status)}
                          disabled={localSubmitting === t.id}
                          className="px-2.5 py-1 rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
                        >
                          Concluir
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Tabela completa inferior */}
        <section className="bg-surface-container-low rounded-2xl border border-outline-variant/15 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-headline font-bold text-on-surface">
              Acompanhamento de demandas
            </h3>
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'attention', label: `Exigem atenção (${stats.attention})` },
                  { id: 'all', label: `Todas (${stats.totalOpen})` },
                  { id: 'overdue', label: `Atrasadas (${stats.overdue})` },
                  { id: 'today', label: `Hoje (${stats.today})` },
                  { id: 'monitoring', label: `Acompanhamentos (${stats.monitoring})` },
                  { id: 'completed', label: `Concluídas (${stats.completed})` },
                ] as { id: TableFilterMode; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTableFilter(tab.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border',
                    tableFilter === tab.id
                      ? 'bg-secondary text-on-secondary border-secondary'
                      : 'bg-surface-container-high/50 text-on-surface-variant border-outline-variant/15 hover:text-on-surface'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Barra de busca */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-outline absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por cliente, nº do processo, responsável ou descrição..."
                className="w-full bg-surface-container-lowest border border-outline-variant/15 rounded-lg pl-8 pr-3 py-2 text-xs text-on-surface placeholder:text-outline/60 focus:border-secondary/60 outline-none"
              />
            </div>

            {(tableFilter !== 'all' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setTableFilter('all');
                  setSearchQuery('');
                }}
                className="px-3 py-2 rounded-lg border border-outline-variant/15 bg-surface-container-high/50 text-xs font-semibold text-on-surface-variant hover:text-on-surface"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/15 text-[10px] font-bold uppercase tracking-wider text-outline">
                  <th className="py-2.5 pr-4">Cliente</th>
                  <th className="py-2.5 px-3">Demanda / Processo</th>
                  <th className="py-2.5 px-3">Prazo Fatal</th>
                  <th className="py-2.5 px-3">Situação</th>
                  <th className="py-2.5 px-3">Responsável</th>
                  <th className="py-2.5 pl-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 text-xs">
                {filteredTableTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-outline">
                      Nenhuma demanda encontrada neste filtro.
                    </td>
                  </tr>
                ) : (
                  filteredTableTasks.slice(0, 60).map((t) => {
                    const isCompleted = t.status === 'Concluída';
                    const diff = t.fatal_date ? getDaysUntil(t.fatal_date) : null;
                    const clientName = t.client_name || t.processes?.clients?.name || '—';
                    const procNum = t.process_number || t.processes?.number || '';

                    let statusBadge = {
                      text: isCompleted ? 'Concluída' : 'Sem prazo',
                      cls: isCompleted
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                        : 'bg-surface-container-high text-outline border-outline-variant/15',
                    };
                    if (!isCompleted && diff !== null) {
                      if (diff < 0) {
                        statusBadge = {
                          text: `Atrasado ${Math.abs(diff)}d`,
                          cls: 'bg-error/15 text-error border-error/25',
                        };
                      } else if (diff === 0) {
                        statusBadge = {
                          text: 'Vence hoje',
                          cls: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
                        };
                      } else if (diff <= 3) {
                        statusBadge = {
                          text: `Em ${diff} dia(s)`,
                          cls: 'bg-secondary/15 text-secondary border-secondary/25',
                        };
                      } else {
                        statusBadge = {
                          text: `Em dia (${diff}d)`,
                          cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
                        };
                      }
                    }

                    return (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedTaskDetail(t)}
                        className="hover:bg-surface-container-high/35 transition-colors cursor-pointer"
                      >
                        <td className="py-3 pr-4 font-semibold text-secondary max-w-[200px] truncate">
                          {clientName}
                        </td>
                        <td className="py-3 px-3 max-w-[340px]">
                          <p className="font-medium text-on-surface truncate">{t.description}</p>
                          <p className="text-[11px] text-outline font-mono truncate tabular-nums">
                            {[procNum, t.task_type].filter(Boolean).join(' · ') || '—'}
                          </p>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-on-surface font-medium tabular-nums">
                          {formatDateBR(t.fatal_date)}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={cn('px-2.5 py-0.5 rounded-md text-[11px] font-semibold border', statusBadge.cls)}>
                            {statusBadge.text}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-on-surface-variant max-w-[160px] truncate">
                          {t.responsible || '—'}
                        </td>
                        <td className="py-3 pl-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedTaskDetail(t)}
                              className="px-2.5 py-1 rounded-lg border border-outline-variant/20 bg-surface-container-high/50 text-[11px] font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                            >
                              Abrir
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleTaskComplete(t.id, t.status)}
                              disabled={localSubmitting === t.id}
                              className={cn(
                                'px-2.5 py-1 rounded-lg border text-[11px] font-semibold disabled:opacity-50',
                                isCompleted
                                  ? 'border-secondary/30 bg-secondary/10 text-secondary hover:bg-secondary/20'
                                  : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                              )}
                            >
                              {isCompleted ? 'Reabrir' : 'Concluir'}
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
        </section>
      </div>

      <button
        onClick={() => setIsTaskModalOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-secondary text-on-secondary rounded-full shadow-2xl flex items-center justify-center hover:opacity-90 transition-opacity z-50"
        title="Nova Tarefa"
      >
        <Plus className="w-6 h-6" />
      </button>
    </>
  );
}
