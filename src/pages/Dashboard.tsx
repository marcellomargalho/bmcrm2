import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, Reorder } from 'motion/react';
import { TrendingUp, Users, Calendar, Clock, FileText, ArrowRight, Plus, Loader2, CheckCircle2, Check, CalendarClock, AlertTriangle, RotateCcw, GripVertical, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, X, Gavel, MapPin, User, Tag, Pencil, Save, Filter, AlignLeft, LayoutGrid, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NewTaskModal } from '@/components/NewTaskModal';
import { supabase } from '@/lib/supabase';
import './RecentTasks.css';

// ─── Drag-and-Drop Hook ──────────────────────────────────────────────
function useDragAndDrop(initialOrder: string[]) {
  const [order, setOrder] = useState<string[]>(initialOrder);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const handleDragStart = useCallback((id: string) => {
    setDraggedId(id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverId(id);
  }, []);

  const handleDrop = useCallback((targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setOverId(null);
      return;
    }
    setOrder(prev => {
      const newOrder = [...prev];
      const dragIdx = newOrder.indexOf(draggedId);
      const dropIdx = newOrder.indexOf(targetId);
      newOrder.splice(dragIdx, 1);
      newOrder.splice(dropIdx, 0, draggedId);
      return newOrder;
    });
    setDraggedId(null);
    setOverId(null);
  }, [draggedId]);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setOverId(null);
  }, []);

  return { order, draggedId, overId, handleDragStart, handleDragOver, handleDrop, handleDragEnd };
}

// ─── Static Widget Wrapper ─────────────────────────────────────────
function DraggableWidget({
  className, children
}: {
  id: string; draggedId: string | null; overId: string | null; onDragStart: any; onDragOver: any; onDrop: any; onDragEnd: any;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────
export function Dashboard() {
  const navigate = useNavigate();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [allTasks, setAllTasks] = useState<any[]>([]); // all tasks from DB
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [activeProcessesCount, setActiveProcessesCount] = useState(0);
  const [todayEventsCount, setTodayEventsCount] = useState(0);
  const [localSubmitting, setLocalSubmitting] = useState<string | null>(null);
  const [userData, setUserData] = useState<{id: string, name: string, role: string} | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<string[]>([]);
  const [readTasks, setReadTasks] = useState<Set<string>>(new Set());
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<any | null>(null);

  // Person filter state (for admin/adv)
  const [allProfiles, setAllProfiles] = useState<{id: string, name: string, role: string}[]>([]);
  const [personFilter, setPersonFilter] = useState<string>('all'); // 'all' or profile name
  const [personRoleFilter, setPersonRoleFilter] = useState<string>('all'); // 'all' | 'Administrador' | 'Advogado' | 'Estagiário'

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(new Date().toISOString().split('T')[0]);
  const [taskFilter, setTaskFilter] = useState<'Todas' | 'Em progresso' | 'Concluídas'>('Todas');

  // Deadline Tables State
  const [deadlineSearch, setDeadlineSearch] = useState('');
  const [deadlineFilter, setDeadlineFilter] = useState<'all' | 'atrasados' | 'hoje' | 'em_dia' | 'revisoes'>('all');
  const [deadlineViewMode, setDeadlineViewMode] = useState<'lista' | 'tabela'>('lista');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [tableExpandedCategory, setTableExpandedCategory] = useState<string | null>(null);

  function toggleSectionCollapse(sectionKey: string) {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionKey)) next.delete(sectionKey);
      else next.add(sectionKey);
      return next;
    });
  }

  // Follow-up state
  const [followUpProcessId, setFollowUpProcessId] = useState<string | null>(null);
  const [showFollowUpPrompt, setShowFollowUpPrompt] = useState(false);
  const [modalLockedProcessId, setModalLockedProcessId] = useState<string | undefined>(undefined);
  const [modalInitialTaskType, setModalInitialTaskType] = useState<string | undefined>(undefined);

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  function toggleTaskExpand(taskId: string) {
    setExpandedTasks(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
    // Mark as read when opened
    setReadTasks(prev => new Set(prev).add(taskId));
  }

  const fetchStats = useCallback(async (u: {id: string, name: string, role: string}) => {
    // 1. Fetch Active Processes where user is responsible
    // The query depends on whether we want strict equality or ILIKE
    // Based on ProcessList, responsible is a string (often comma-separated)
    const { count: procCount } = await supabase
      .from('processes')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'Arquivado')
      .ilike('responsible', `%${u.name}%`);
    
    setActiveProcessesCount(procCount || 0);

    // 2. Fetch Today's Appointments
    const today = new Date().toISOString().split('T')[0];
    const { count: eventCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .gte('start_time', `${today}T00:00:00Z`)
      .lte('start_time', `${today}T23:59:59Z`);

    setTodayEventsCount(eventCount || 0);
  }, []);

  const fetchTasks = useCallback(async (u: {id: string, name: string, role: string}) => {
    if (!u) return;
    setLoadingTasks(true);
    const isAdminOrAdv = u.role === 'Administrador' || u.role === 'Advogado';

    if (isAdminOrAdv) {
      // Fetch ALL tasks for admin/adv (to enable person filter)
      const { data } = await supabase
        .from('tasks')
        .select('*, processes(id, number, vara, comarca, court, area, status, responsible, autor, reu, clients(name, cpf_cnpj))')
        .order('created_at', { ascending: false });
      setAllTasks(data || []);
    } else {
      // Estagiário: only their own tasks
      const orQuery = `user_id.eq.${u.id}${u.name ? `,responsible.ilike.%${u.name}%` : ''}`;
      const { data } = await supabase
        .from('tasks')
        .select('*, processes(id, number, vara, comarca, court, area, status, responsible, autor, reu, clients(name, cpf_cnpj))')
        .or(orQuery)
        .order('created_at', { ascending: false });
      setAllTasks(data || []);
    }
    setLoadingTasks(false);
  }, []);

  useEffect(() => {
    let tasksChannel: any;
    let processesChannel: any;
    let appointmentsChannel: any;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, name')
          .eq('id', user.id)
          .single();

        const u = {
          id: user.id,
          name: profile?.name || user.user_metadata?.full_name || '',
          role: profile?.role || ''
        };
        setUserData(u);
        fetchTasks(u);
        fetchStats(u);

        // Fetch all profiles for person filter (admin/adv only)
        if (u.role === 'Administrador' || u.role === 'Advogado') {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, name, role')
            .eq('is_approved', true)
            .order('name', { ascending: true });
          setAllProfiles(profilesData || []);
        }

        // Realtime Tasks
        tasksChannel = supabase.channel('tasks_dashboard_changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchTasks(u))
          .subscribe();

        // Realtime Processes Stats
        processesChannel = supabase.channel('processes_dashboard_stats')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'processes' }, () => fetchStats(u))
          .subscribe();

        // Realtime Appointments
        appointmentsChannel = supabase.channel('appointments_dashboard')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => fetchStats(u))
          .subscribe();
      }
    };

    init();

    return () => {
      if (tasksChannel) supabase.removeChannel(tasksChannel);
      if (processesChannel) supabase.removeChannel(processesChannel);
      if (appointmentsChannel) supabase.removeChannel(appointmentsChannel);
    };
  }, []); // Explicitly empty to init once and use realtime for updates

  async function toggleTaskComplete(taskId: string, currentStatus: string) {
    if (localSubmitting === taskId) return;
    const newStatus = currentStatus === 'Concluída' ? 'Pendente' : 'Concluída';
    
    setLocalSubmitting(taskId);
    
    // Optimistic Update: move task in local state immediately
    const originalAllTasks = [...allTasks];
    setAllTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, updated_at: new Date().toISOString() } : t));

    const { error } = await supabase.from('tasks').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', taskId);
    
    if (error) {
      console.error("Erro ao atualizar tarefa:", error);
      setAllTasks(originalAllTasks); // Rollback on error
      setLocalSubmitting(null);
      return;
    }
    
    if (newStatus === 'Concluída') {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.process_id) {
        const { data: { user } } = await supabase.auth.getUser();
        const allowedTypes = ['Petição', 'Despacho', 'Audiência', 'Julgamento', 'Protocolo', 'Diligência', 'Audiência de Instrução ou Conciliação', 'Análise de Processo', 'Outros'];
        const movementType = allowedTypes.includes(task.task_type || '') ? task.task_type : 'Outros';
        
        await supabase.from('process_movements').insert([{
           process_id: task.process_id,
           type: movementType,
           description: `Tarefa concluída: ${task.description}`,
           date: new Date().toISOString(),
           responsible: task.responsible,
           user_id: user?.id
        }]);

        // Trigger follow-up prompt
        setFollowUpProcessId(task.process_id);
        setShowFollowUpPrompt(true);
      }
    }

    // Refresh data to keep sync with DB (but UI already looks updated)
    if (userData) await fetchTasks(userData);
    setLocalSubmitting(null);
  }

  const priorityColors: Record<string, string> = {
    'Baixa': 'bg-emerald-500/10 text-emerald-400',
    'Média': 'bg-amber-500/10 text-amber-400',
    'Alta': 'bg-error/10 text-error',
  };

  const isAdmin = userData?.role === 'Administrador';
  const isAdminOrAdv = userData?.role === 'Administrador' || userData?.role === 'Advogado';

  function getDaysUntil(dateStr: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr + 'T00:00:00');
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }

  // Apply person + role filters (for admin/adv only)
  const tasks = React.useMemo(() => {
    if (!isAdminOrAdv) return allTasks;
    let result = allTasks;
    if (personRoleFilter !== 'all') {
      const profilesOfRole = allProfiles.filter(p => p.role === personRoleFilter).map(p => p.name?.toLowerCase());
      result = result.filter(t => profilesOfRole.some(name => name && t.responsible?.toLowerCase().includes(name)));
    }
    if (personFilter !== 'all') {
      result = result.filter(t => t.responsible?.toLowerCase().includes(personFilter.toLowerCase()));
    }
    return result;
  }, [allTasks, isAdminOrAdv, personFilter, personRoleFilter, allProfiles]);

  const upcomingDeadlines = tasks
    .filter(t => t.fatal_date && t.status !== 'Concluída')
    .sort((a, b) => new Date(a.fatal_date).getTime() - new Date(b.fatal_date).getTime())
    .slice(0, 3);

  const pendingTasks = tasks.filter(t => t.status !== 'Concluída');
  const recentTasks = pendingTasks;
  const allCompletedTasks = tasks
    .filter(t => t.status === 'Concluída')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  const completedTasks = allCompletedTasks.slice(0, 5);
  const totalCompletedCount = allCompletedTasks.length;

  // Ordena do prazo mais urgente (menos dias restantes) ao menos urgente (mais dias restantes)
  const sortByUrgency = (a: any, b: any) => getDaysUntil(a.fatal_date) - getDaysUntil(b.fatal_date);

  const categorizedTasks = {
    atrasados: tasks.filter(t => t.fatal_date && t.status !== 'Concluída' && getDaysUntil(t.fatal_date) < 0 && t.task_type !== 'Acompanhamento de Processo').sort(sortByUrgency),
    hoje: tasks.filter(t => t.fatal_date && t.status !== 'Concluída' && getDaysUntil(t.fatal_date) === 0 && t.task_type !== 'Acompanhamento de Processo').sort(sortByUrgency),
    em_dia: tasks.filter(t => t.fatal_date && t.status !== 'Concluída' && getDaysUntil(t.fatal_date) > 0 && t.task_type !== 'Acompanhamento de Processo').sort(sortByUrgency),
    revisoes_pendentes: tasks.filter(t => t.task_type === 'Acompanhamento de Processo' && t.status !== 'Concluída').sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    outras: tasks.filter(t => !t.fatal_date && t.status !== 'Concluída'),
  };

  const AUTO_COLLAPSE_THRESHOLD = 5;

  const renderDeadlineTable = (tasksList: any[], title: string, color: string, icon: React.ReactNode, sectionKey: string) => {
    const isCollapsed = collapsedSections.has(sectionKey);
    const shouldAutoCollapse = tasksList.length > AUTO_COLLAPSE_THRESHOLD;

    return (
      <div className="bg-surface-container-low rounded-3xl border border-outline-variant/10 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container-high/30">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-xl", color)}>
              {icon}
            </div>
            <h3 className="font-headline font-bold text-sm text-on-surface">{title}</h3>
            <span className="px-2 py-0.5 bg-surface-container-highest rounded-full text-[10px] font-black text-outline">
              {tasksList.length}
            </span>
            {shouldAutoCollapse && !isCollapsed && (
              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-[9px] font-black">
                +{tasksList.length - AUTO_COLLAPSE_THRESHOLD} ocultas
              </span>
            )}
          </div>
          {shouldAutoCollapse && (
            <button
              onClick={() => toggleSectionCollapse(sectionKey)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border",
                isCollapsed
                  ? "bg-secondary/10 text-secondary border-secondary/20 hover:bg-secondary/20"
                  : "bg-surface-container-highest text-outline border-outline-variant/20 hover:text-on-surface"
              )}
            >
              {isCollapsed ? (
                <><ChevronDown className="w-3.5 h-3.5" /> Mostrar todas ({tasksList.length})</>
              ) : (
                <><ChevronUp className="w-3.5 h-3.5" /> Ocultar ({tasksList.length - AUTO_COLLAPSE_THRESHOLD} a menos)</>
              )}
            </button>
          )}
        </div>
        {!isCollapsed && (
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[9px] uppercase tracking-widest text-outline font-black border-b border-outline-variant/5">
                <th className="px-6 py-3">Prazo</th>
                <th className="px-6 py-3">Descrição</th>
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3">Processo / Origem</th>
                <th className="px-6 py-3">Tipo</th>
                <th className="px-6 py-3">Responsável</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {tasksList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-outline text-xs italic">
                    Nenhuma demanda nesta categoria.
                  </td>
                </tr>
              ) : (
                tasksList.map((task) => {
                  const daysUntil = task.fatal_date ? getDaysUntil(task.fatal_date) : null;
                  const proc = task.processes;
                  return (
                    <tr 
                      key={task.id} 
                      onClick={() => setSelectedTaskDetail(task)}
                      className="hover:bg-surface-container-high/50 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-3">
                        <div className="flex flex-col gap-1.5">
                          <span className={cn(
                            "text-xs font-bold",
                            daysUntil !== null && daysUntil < 0 ? "text-error" :
                            daysUntil === 0 ? "text-secondary" :
                            daysUntil !== null && daysUntil <= 3 ? "text-orange-400" :
                            "text-on-surface"
                          )}>
                            {task.fatal_date ? new Date(task.fatal_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'S/D'}
                          </span>
                          {daysUntil !== null && daysUntil < 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-error/15 text-error text-[9px] font-black border border-error/25 animate-pulse w-fit">
                              ⚠ {Math.abs(daysUntil)}d atraso
                            </span>
                          )}
                          {daysUntil === 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/15 text-secondary text-[9px] font-black border border-secondary/25 w-fit">
                              🔔 Vence hoje
                            </span>
                          )}
                          {daysUntil !== null && daysUntil > 0 && daysUntil <= 3 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 text-[9px] font-black border border-orange-500/25 w-fit">
                              ⏳ {daysUntil}d restantes
                            </span>
                          )}
                          {daysUntil !== null && daysUntil > 3 && daysUntil <= 7 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[9px] font-bold border border-amber-500/20 w-fit">
                              {daysUntil}d restantes
                            </span>
                          )}
                          {daysUntil !== null && daysUntil > 7 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-bold border border-emerald-500/20 w-fit">
                              {daysUntil}d restantes
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 max-w-[200px]">
                        <p className="text-xs text-on-surface font-medium line-clamp-2">{task.description}</p>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-xs text-on-surface-variant font-medium truncate block max-w-[140px]">
                          {task.client_name || proc?.clients?.name || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-on-surface font-mono font-medium truncate max-w-[150px]">
                            {task.process_number || proc?.number || '—'}
                          </span>
                          {(proc?.vara || proc?.comarca) && (
                            <span className="text-[9px] text-outline truncate max-w-[150px]">
                              {[proc?.vara, proc?.comarca].filter(Boolean).join(' · ')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        {task.task_type && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-secondary/10 text-secondary border border-secondary/15">
                            {task.task_type}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-[10px] text-on-surface-variant font-medium truncate block max-w-[100px]">
                          {task.responsible?.split(',')[0]?.trim() || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleTaskComplete(task.id, task.status); }}
                            className="p-1.5 hover:bg-emerald-500/10 text-outline hover:text-emerald-500 rounded-lg transition-all"
                            title="Concluir tarefa"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
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
        )}
        {isCollapsed && tasksList.length > 0 && (
          <div className="px-6 py-4 flex items-center gap-3 flex-wrap">
            {tasksList.slice(0, 3).map(task => (
              <button
                key={task.id}
                onClick={() => setSelectedTaskDetail(task)}
                className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-highest rounded-xl text-[10px] font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all border border-outline-variant/10"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-outline shrink-0" />
                <span className="truncate max-w-[160px]">{task.description}</span>
              </button>
            ))}
            {tasksList.length > 3 && (
              <span className="text-[10px] text-outline font-bold">+{tasksList.length - 3} demandas ocultas</span>
            )}
          </div>
        )}
      </div>
    );
  };

  // Drag-and-drop
  const { order, draggedId, overId, handleDragStart, handleDragOver, handleDrop, handleDragEnd } =
    useDragAndDrop(['stats', 'deadlineTables', 'deadlines', 'activities']);

  // ─── Widget renderers ───────────────────────────────────────────────
  const widgets: Record<string, React.ReactNode> = {
    stats: (
      <DraggableWidget id="stats" draggedId={draggedId} overId={overId} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} onDragEnd={handleDragEnd}>
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-container-low p-6 rounded-2xl border-l-4 border-secondary flex flex-col justify-between">
            <span className="text-outline text-xs uppercase tracking-widest font-semibold">Processos Ativos</span>
            <div className="mt-4">
              <h3 className="text-4xl font-headline font-black text-on-surface">{activeProcessesCount}</h3>
              <p className="text-secondary text-sm font-medium mt-1 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Seus processos
              </p>
            </div>
          </div>

          <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/5 flex flex-col justify-between">
            <span className="text-outline text-xs uppercase tracking-widest font-semibold">Audiências do Dia</span>
            <div className="mt-4">
              <h3 className="text-3xl font-headline font-bold text-on-surface">{todayEventsCount.toString().padStart(2, '0')}</h3>
              <p className="text-on-surface-variant text-sm mt-1">Sua agenda de hoje</p>
            </div>
          </div>

          <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/5 flex flex-col justify-between">
            <span className="text-outline text-xs uppercase tracking-widest font-semibold">Tarefas Pendentes</span>
            <div className="mt-4">
              <h3 className="text-3xl font-headline font-bold text-error">{pendingTasks.length.toString().padStart(2, '0')}</h3>
              <p className="text-on-surface-variant text-sm mt-1">
                {upcomingDeadlines.length > 0 ? `${upcomingDeadlines.length} com prazo próximo` : 'Nenhum prazo próximo'}
              </p>
            </div>
          </div>
        </section>
      </DraggableWidget>
    ),


    deadlines: (
      <DraggableWidget id="deadlines" draggedId={draggedId} overId={overId} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} onDragEnd={handleDragEnd}>
        <div className="bg-surface-container-low p-6 rounded-3xl shadow-xl flex flex-col h-full border border-outline-variant/10">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-headline font-bold text-on-surface">Calendário de Prazos</h4>
            <div className="flex items-center gap-2">
              <button onClick={handlePrevMonth} className="p-1 hover:bg-surface-container-high rounded-lg text-on-surface-variant transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-[11px] font-bold w-20 text-center uppercase tracking-wide">{monthNames[currentMonth.getMonth()].substring(0,3)} {currentMonth.getFullYear()}</span>
              <button onClick={handleNextMonth} className="p-1 hover:bg-surface-container-high rounded-lg text-on-surface-variant transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <span key={d} className="text-[9px] font-black text-outline uppercase tracking-widest">{d}</span>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayTasks = tasks.filter(t => t.status !== 'Concluída' && (t.fatal_date === dateStr || t.ideal_date === dateStr));
              const hasFatal = dayTasks.some(t => t.fatal_date === dateStr);
              const hasIdeal = dayTasks.some(t => t.ideal_date === dateStr);
              const isSelected = selectedDate === dateStr;
              
              const isToday = new Date().toISOString().split('T')[0] === dateStr;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={cn(
                    "aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all border",
                    isSelected 
                      ? "bg-secondary text-on-secondary border-secondary scale-110 z-10 shadow-lg" 
                      : isToday 
                        ? "bg-surface-container-highest border-secondary/30 text-secondary font-black"
                        : "bg-surface-container-low border-transparent hover:border-outline-variant/30 text-on-surface",
                    dayTasks.length > 0 && !isSelected && "font-bold text-on-surface bg-surface-container-highest shadow-sm"
                  )}
                >
                  <span className="text-xs">{day}</span>
                  <div className="flex gap-1 absolute bottom-1.5">
                    {hasFatal && <span className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-white" : "bg-error")} />}
                    {hasIdeal && !hasFatal && <span className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-white" : "bg-emerald-400")} />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-outline-variant/10 min-h-[140px] flex flex-col">
          {selectedDate ? (
            <div className="animate-in fade-in flex-1 flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-secondary font-black mb-3 block">
                Prazos para {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}
              </span>
              <div className="space-y-2 overflow-y-auto custom-scrollbar pr-2 flex-1">
                {tasks.filter(t => t.fatal_date === selectedDate || t.ideal_date === selectedDate).map(t => {
                  const isFatal = t.fatal_date === selectedDate;
                  const isCompleted = t.status === 'Concluída';
                  return (
                    <div key={t.id} className={cn(
                      "flex items-center justify-between p-2.5 rounded-xl border transition-all hover:shadow-sm",
                      isCompleted ? "opacity-50 line-through bg-surface" : "bg-surface-container-highest",
                      isFatal ? "border-error/20" : "border-emerald-500/20"
                    )}>
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-on-surface truncate">{t.description}</p>
                        <p className="text-[9px] text-on-surface-variant mt-0.5">{t.client_name || 'Sem cliente'}</p>
                      </div>
                      <span className={cn(
                        "text-[9px] font-black px-2 py-1 rounded-md shrink-0 uppercase tracking-widest",
                        isFatal ? "bg-error/10 text-error" : "bg-emerald-500/10 text-emerald-500"
                      )}>
                        {isFatal ? 'Prazo Fatal' : 'Meta Ideal'}
                      </span>
                    </div>
                  );
                })}
                {tasks.filter(t => t.fatal_date === selectedDate || t.ideal_date === selectedDate).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-4 text-outline opacity-60">
                    <CheckCircle2 className="w-6 h-6 mb-2" />
                    <p className="text-xs font-medium">Dia livre.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-50">
               <CalendarClock className="w-8 h-8 mb-2 text-outline" />
               <p className="text-xs font-medium text-on-surface-variant text-center px-4">Selecione uma data no calendário para ver as tarefas associadas.</p>
            </div>
          )}
          </div>
        </div>
      </DraggableWidget>
    ),


    activities: (
      <DraggableWidget id="activities" draggedId={draggedId} overId={overId} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} onDragEnd={handleDragEnd}>
        <div className="bg-surface-container-low p-8 rounded-3xl shadow-2xl flex flex-col h-full border border-outline-variant/10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col gap-1">
              <h4 className="text-xl font-headline font-bold text-on-surface tracking-tight">Atividades Recentes</h4>
              <p className="text-[11px] text-outline font-medium uppercase tracking-widest">Histórico de Conclusão</p>
            </div>
            {totalCompletedCount > 0 && (
              <span className="tasks-count">
                {totalCompletedCount} concluída{totalCompletedCount > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {completedTasks.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-20 bg-surface-container-high/20 rounded-2xl border border-dashed border-outline-variant/10">
              <div className="text-center">
                <div className="w-16 h-16 bg-surface-container-high rounded-full flex items-center justify-center mx-auto mb-4 border border-outline-variant/10">
                  <CheckCircle2 className="w-8 h-8 text-outline opacity-30" />
                </div>
                <p className="text-on-surface-variant text-sm font-medium">Nenhuma atividade registrada.</p>
                <p className="text-outline text-[11px] mt-1">As tarefas concluídas aparecerão aqui.</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              <div className="activities-container-modern">
                {completedTasks.map((task, i) => {
                  const completedAt = new Date(task.updated_at);
                  const now = new Date();
                  const diffMs = now.getTime() - completedAt.getTime();
                  const diffMins = Math.floor(diffMs / 60000);
                  const diffHours = Math.floor(diffMs / 3600000);
                  const diffDays = Math.floor(diffMs / 86400000);
                  
                  let timeAgo = '';
                  if (diffMins < 1) timeAgo = 'Agora';
                  else if (diffMins < 60) timeAgo = `${diffMins}m`;
                  else if (diffHours < 24) timeAgo = `${diffHours}h`;
                  else timeAgo = `${diffDays}d`;

                  return (
                    <motion.div 
                      key={task.id} 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={cn("activity-item-modern", i === 0 && "recent")}
                    >
                      <div className="activity-node-modern">
                        {i === 0 && <Check className="w-2.5 h-2.5 text-on-secondary" strokeWidth={4} />}
                      </div>
                      
                      <div className="activity-card-modern">
                        <div className="activity-header-modern">
                          <span className="activity-tag-modern">Tarefa Concluída</span>
                          
                          <div className="flex items-center gap-3 ml-auto">
                            <span className="activity-time-modern">{timeAgo}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTaskComplete(task.id, task.status);
                              }}
                              disabled={localSubmitting === task.id}
                              className={cn("activity-reopen-btn-inline", localSubmitting === task.id && "pulse")}
                              title="Reabrir Tarefa"
                            >
                              {localSubmitting === task.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3 h-3" />
                              )}
                              <span>Restaurar</span>
                            </button>
                          </div>
                        </div>
                        
                        <p className="activity-desc-modern">{task.description}</p>
                        
                        <div className="activity-meta-modern">
                          <div className="activity-meta-item">
                            <div className="avatar-modern" style={{ width: '16px', height: '16px', fontSize: '8px' }}>
                              {task.responsible?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <span>{task.responsible?.split(',')[0].trim()}</span>
                          </div>
                          <div className="activity-meta-item">
                            <Users className="w-3 h-3" />
                            <span>{task.client_name?.split(' ')[0]}</span>
                          </div>
                          <div className="activity-meta-item ml-auto">
                            <span className="text-[9px] font-bold text-outline uppercase tracking-tighter">
                              {new Date(task.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            </span>
                          </div>
                        </div>

                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DraggableWidget>
    ),

    deadlineTables: (
      <DraggableWidget id="deadlineTables" draggedId={draggedId} overId={overId} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} onDragEnd={handleDragEnd}>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-headline font-bold text-on-surface">Monitoramento de Prazos</h2>
              <button onClick={() => setIsTaskModalOpen(true)} className="flex items-center gap-2 px-3 py-1 bg-secondary text-on-secondary rounded-lg text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform">
                <Plus className="w-3.5 h-3.5" />
                Nova Tarefa
              </button>
            </div>
            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <div className="flex bg-surface-container-low p-1 rounded-xl border border-outline-variant/10">
                <button
                  onClick={() => setDeadlineViewMode('lista')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold transition-all",
                    deadlineViewMode === 'lista' ? "bg-secondary text-on-secondary" : "text-outline hover:text-on-surface"
                  )}
                >
                  <AlignLeft className="w-3 h-3" /> Lista
                </button>
                <button
                  onClick={() => setDeadlineViewMode('tabela')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold transition-all",
                    deadlineViewMode === 'tabela' ? "bg-secondary text-on-secondary" : "text-outline hover:text-on-surface"
                  )}
                >
                  <LayoutGrid className="w-3 h-3" /> Tabela
                </button>
              </div>
              {/* Category filter */}
              <div className="flex bg-surface-container-low p-1 rounded-xl border border-outline-variant/10">
                <button 
                  onClick={() => setDeadlineFilter('all')}
                  className={cn(
                    "px-3 py-1 rounded-lg text-[10px] font-bold transition-all",
                    deadlineFilter === 'all' ? "bg-secondary text-on-secondary" : "text-outline hover:text-on-surface"
                  )}
                >
                  Todos
                </button>
                <button 
                  onClick={() => setDeadlineFilter('atrasados')}
                  className={cn(
                    "px-3 py-1 rounded-lg text-[10px] font-bold transition-all",
                    deadlineFilter === 'atrasados' ? "bg-error text-white" : "text-outline hover:text-on-surface"
                  )}
                >
                  Atrasados
                </button>
                <button 
                  onClick={() => setDeadlineFilter('revisoes')}
                  className={cn(
                    "px-3 py-1 rounded-lg text-[10px] font-bold transition-all",
                    deadlineFilter === 'revisoes' ? "bg-amber-500 text-white" : "text-outline hover:text-on-surface"
                  )}
                >
                  Acompanhamentos
                </button>
              </div>
            </div>
          </div>

          {/* Person Filter — visible only to Admins and Advogados */}
          {isAdminOrAdv && allProfiles.length > 0 && (
            <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1">
                <Filter className="w-3.5 h-3.5 text-secondary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-outline">Filtrar por Pessoa</span>
                {(personFilter !== 'all' || personRoleFilter !== 'all') && (
                  <button
                    onClick={() => { setPersonFilter('all'); setPersonRoleFilter('all'); }}
                    className="ml-auto text-[9px] font-bold text-outline hover:text-error flex items-center gap-1 transition-colors"
                  >
                    <X className="w-3 h-3" /> Limpar filtro
                  </button>
                )}
              </div>
              {/* Role filter chips */}
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'Administrador', label: 'Administradores' },
                  { id: 'Advogado', label: 'Advogados' },
                  { id: 'Estagiário', label: 'Estagiários' },
                ].map(roleOpt => {
                  const hasRole = roleOpt.id === 'all' ? true : allProfiles.some(p => p.role === roleOpt.id);
                  if (!hasRole && roleOpt.id !== 'all') return null;
                  return (
                    <button
                      key={roleOpt.id}
                      onClick={() => { setPersonRoleFilter(roleOpt.id); setPersonFilter('all'); }}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border",
                        personRoleFilter === roleOpt.id
                          ? "bg-secondary text-on-secondary border-secondary shadow-sm"
                          : "bg-surface-container-high text-outline border-outline-variant/20 hover:text-on-surface hover:border-outline-variant/40"
                      )}
                    >
                      {roleOpt.label}
                      {roleOpt.id !== 'all' && (
                        <span className="ml-1.5 opacity-60">{allProfiles.filter(p => p.role === roleOpt.id).length}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Individual person chips */}
              {(() => {
                const profilesToShow = personRoleFilter === 'all' 
                  ? allProfiles 
                  : allProfiles.filter(p => p.role === personRoleFilter);
                return (
                  <div className="flex flex-wrap gap-2">
                    {profilesToShow.map(profile => (
                      <button
                        key={profile.id}
                        onClick={() => setPersonFilter(personFilter === profile.name ? 'all' : profile.name)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border",
                          personFilter === profile.name
                            ? "bg-secondary/20 text-secondary border-secondary/40 ring-1 ring-secondary/30"
                            : "bg-surface-container text-on-surface-variant border-outline-variant/10 hover:border-secondary/20 hover:text-on-surface"
                        )}
                      >
                        <span className="w-5 h-5 rounded-full bg-secondary/20 text-secondary flex items-center justify-center font-black text-[9px] shrink-0">
                          {profile.name?.charAt(0).toUpperCase()}
                        </span>
                        {profile.name}
                        <span className={cn(
                          "text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-tight",
                          profile.role === 'Administrador' ? "bg-purple-500/10 text-purple-400" :
                          profile.role === 'Advogado' ? "bg-secondary/10 text-secondary" :
                          "bg-emerald-500/10 text-emerald-400"
                        )}>
                          {profile.role === 'Administrador' ? 'Adm' : profile.role === 'Advogado' ? 'Adv' : 'Est'}
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Summary cards - always visible */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { key: 'atrasados', label: 'Atrasados', count: categorizedTasks.atrasados.length, color: 'from-error/10', border: 'border-error/10', textColor: 'text-error', icon: <AlertTriangle className="w-4 h-4 text-error" /> },
              { key: 'hoje', label: 'Para Hoje', count: categorizedTasks.hoje.length, color: 'from-secondary/10', border: 'border-secondary/10', textColor: 'text-secondary', icon: <Clock className="w-4 h-4 text-secondary" /> },
              { key: 'em_dia', label: 'Em Dia', count: categorizedTasks.em_dia.length, color: 'from-emerald-500/10', border: 'border-emerald-500/10', textColor: 'text-emerald-500', icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },
              { key: 'revisoes', label: 'Acompanhamentos', count: categorizedTasks.revisoes_pendentes.length, color: 'from-amber-500/10', border: 'border-amber-500/10', textColor: 'text-amber-500', icon: <RotateCcw className="w-4 h-4 text-amber-500" /> },
            ].map(({ key, label, count, color, border, textColor, icon }) => (
              <button
                key={key}
                onClick={() => {
                  setDeadlineFilter(key as any);
                  if (deadlineViewMode === 'tabela') {
                    setTableExpandedCategory(tableExpandedCategory === key ? null : key);
                  }
                }}
                className={cn(
                  "bg-gradient-to-br to-surface-container-low p-4 rounded-2xl border flex flex-col gap-2 text-left transition-all hover:scale-[1.02] hover:shadow-lg",
                  color, border,
                  deadlineFilter === key && "ring-2 ring-offset-1 ring-offset-transparent",
                  key === 'atrasados' && deadlineFilter === key && "ring-error/40",
                  key === 'hoje' && deadlineFilter === key && "ring-secondary/40",
                  key === 'em_dia' && deadlineFilter === key && "ring-emerald-500/40",
                  key === 'revisoes' && deadlineFilter === key && "ring-amber-500/40",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn("text-[9px] font-black uppercase tracking-widest opacity-80", textColor)}>{label}</span>
                  {icon}
                </div>
                <div className="flex items-end justify-between">
                  <h3 className={cn("text-3xl font-headline font-black", textColor)}>{count}</h3>
                  {deadlineViewMode === 'tabela' && count > 0 && (
                    <span className={cn("text-[9px] font-bold flex items-center gap-1", textColor)}>
                      {tableExpandedCategory === key ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {tableExpandedCategory === key ? 'Fechar' : 'Ver'}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* TABLE MODE: compact expandable panels per category */}
          {deadlineViewMode === 'tabela' && (
            <div className="space-y-3">
              {[
                { key: 'atrasados', label: 'Demandas em Atraso', tasks: categorizedTasks.atrasados, color: 'bg-error/10 text-error', icon: <AlertTriangle className="w-4 h-4" /> },
                { key: 'revisoes', label: 'Acompanhamentos Pendentes', tasks: categorizedTasks.revisoes_pendentes, color: 'bg-amber-500/10 text-amber-500', icon: <RotateCcw className="w-4 h-4" /> },
                { key: 'hoje', label: 'Vencendo Hoje', tasks: categorizedTasks.hoje, color: 'bg-secondary/10 text-secondary', icon: <Clock className="w-4 h-4" /> },
                { key: 'em_dia', label: 'Prazos em Dia', tasks: categorizedTasks.em_dia, color: 'bg-emerald-500/10 text-emerald-500', icon: <CheckCircle2 className="w-4 h-4" /> },
              ].filter(({ key }) => deadlineFilter === 'all' || deadlineFilter === key || (deadlineFilter === 'revisoes' && key === 'revisoes'))
               .map(({ key, label, tasks, color, icon }) => {
                const isExpanded = tableExpandedCategory === key;
                return (
                  <div key={key} className="bg-surface-container-low rounded-2xl border border-outline-variant/10 overflow-hidden">
                    <button
                      onClick={() => setTableExpandedCategory(isExpanded ? null : key)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-surface-container-high/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("p-1.5 rounded-lg", color)}>{icon}</div>
                        <span className="font-headline font-bold text-sm text-on-surface">{label}</span>
                        <span className="px-2 py-0.5 bg-surface-container-highest rounded-full text-[10px] font-black text-outline">{tasks.length}</span>
                      </div>
                      <ChevronDown className={cn("w-4 h-4 text-outline transition-transform duration-200", isExpanded && "rotate-180")} />
                    </button>
                    {isExpanded && tasks.length > 0 && (
                      <div className="border-t border-outline-variant/10 overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="text-[9px] uppercase tracking-widest text-outline font-black border-b border-outline-variant/5">
                              <th className="px-6 py-3">Prazo</th>
                              <th className="px-6 py-3">Descrição</th>
                              <th className="px-6 py-3">Cliente</th>
                              <th className="px-6 py-3">Processo</th>
                              <th className="px-6 py-3">Responsável</th>
                              <th className="px-6 py-3 text-right">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/5">
                            {tasks.map(task => {
                              const daysUntil = task.fatal_date ? getDaysUntil(task.fatal_date) : null;
                              const proc = task.processes;
                              return (
                                <tr key={task.id} onClick={() => setSelectedTaskDetail(task)} className="hover:bg-surface-container-high/50 transition-colors group cursor-pointer">
                                  <td className="px-6 py-3">
                                    <span className={cn("text-xs font-bold",
                                      daysUntil !== null && daysUntil < 0 ? "text-error" :
                                      daysUntil === 0 ? "text-secondary" :
                                      "text-on-surface"
                                    )}>
                                      {task.fatal_date ? new Date(task.fatal_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'S/D'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-3 max-w-[220px]"><p className="text-xs text-on-surface font-medium line-clamp-2">{task.description}</p></td>
                                  <td className="px-6 py-3"><span className="text-xs text-on-surface-variant font-medium truncate block max-w-[140px]">{task.client_name || proc?.clients?.name || '—'}</span></td>
                                  <td className="px-6 py-3"><span className="text-[10px] text-on-surface font-mono font-medium truncate block max-w-[150px]">{task.process_number || proc?.number || '—'}</span></td>
                                  <td className="px-6 py-3"><span className="text-[10px] text-on-surface-variant font-medium truncate block max-w-[100px]">{task.responsible?.split(',')[0]?.trim() || '—'}</span></td>
                                  <td className="px-6 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={(e) => { e.stopPropagation(); toggleTaskComplete(task.id, task.status); }} className="p-1.5 hover:bg-emerald-500/10 text-outline hover:text-emerald-500 rounded-lg transition-all" title="Concluir">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {isExpanded && tasks.length === 0 && (
                      <p className="px-6 py-4 text-xs text-outline italic text-center border-t border-outline-variant/10">Nenhuma demanda nesta categoria.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* LIST MODE: full expanded tables */}
          {deadlineViewMode === 'lista' && (
            <div className="grid grid-cols-1 xl:grid-cols-1 gap-6">
              {(deadlineFilter === 'all' || deadlineFilter === 'atrasados') && renderDeadlineTable(
                categorizedTasks.atrasados, 
                "Demandas em Atraso", 
                "bg-error/10 text-error", 
                <AlertTriangle className="w-4 h-4" />,
                'atrasados'
              )}

              {(deadlineFilter === 'all' || deadlineFilter === 'revisoes') && categorizedTasks.revisoes_pendentes.length > 0 && renderDeadlineTable(
                categorizedTasks.revisoes_pendentes, 
                "Acompanhamentos Pendentes", 
                "bg-amber-500/10 text-amber-500", 
                <RotateCcw className="w-4 h-4" />,
                'revisoes'
              )}
              
              {(deadlineFilter === 'all' || deadlineFilter === 'hoje') && renderDeadlineTable(
                categorizedTasks.hoje, 
                "Vencendo Hoje", 
                "bg-secondary/10 text-secondary", 
                <Clock className="w-4 h-4" />,
                'hoje'
              )}

              {(deadlineFilter === 'all' || deadlineFilter === 'em_dia') && renderDeadlineTable(
                categorizedTasks.em_dia, 
                "Prazos em Dia", 
                "bg-emerald-500/10 text-emerald-500", 
                <Calendar className="w-4 h-4" />,
                'em_dia'
              )}
            </div>
          )}
        </div>
      </DraggableWidget>
    ),
  };

  // ─── Task Detail Modal ───────────────────────────────────────────────
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

    // Load timeline on mount if applicable
    useEffect(() => {
      if (task.task_type === 'Acompanhamento de Processo') {
        fetchTimeline();
      }
    }, [task.id]);

    async function handleRegistrarAcompanhamento() {
      if (!acompanhamentoRelato.trim()) {
        alert("Preencha o relato do acompanhamento.");
        return;
      }
      setSavingAcompanhamento(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      // 1. Log the movement if process is linked
      if (proc?.id) {
        await supabase.from('process_movements').insert([{
           process_id: proc.id,
           type: 'Andamento',
           description: `[ACOMPANHAMENTO]: ${acompanhamentoRelato}`,
           date: new Date().toISOString(),
           responsible: task.responsible || 'Sistema',
           user_id: user?.id
        }]);
      }
      
      setAcompanhamentoRelato('');
      setSavingAcompanhamento(false);
      // Refresh timeline after saving
      await fetchTimeline();
    }

    async function handleSaveDates() {
      setSavingDates(true);
      const { error } = await supabase
        .from('tasks')
        .update({ 
          fatal_date: fatalDate || null, 
          ideal_date: idealDate || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);
      
      if (!error) {
        // Update local tasks state
        setAllTasks(prev => prev.map(t => 
          t.id === task.id ? { ...t, fatal_date: fatalDate || null, ideal_date: idealDate || null } : t
        ));
        setSelectedTaskDetail({ ...task, fatal_date: fatalDate || null, ideal_date: idealDate || null });
        setDateSaved(true);
        setEditingDates(false);
        setTimeout(() => setDateSaved(false), 2000);
      }
      setSavingDates(false);
    }

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6" onClick={onClose}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-surface-container-low w-full max-w-[600px] rounded-3xl border border-outline-variant/10 shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-8 py-6 border-b border-outline-variant/10 bg-surface-container-high/30 flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                currentDaysUntil !== null && currentDaysUntil < 0 ? "bg-error/10 text-error" :
                currentDaysUntil === 0 ? "bg-secondary/10 text-secondary" :
                "bg-emerald-500/10 text-emerald-500"
              )}>
                <Gavel className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-headline font-bold text-on-surface text-lg leading-tight">Detalhes da Demanda</h3>
                {task.task_type && (
                  <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-secondary/10 text-secondary border border-secondary/15">
                    {task.task_type}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-surface-container-highest rounded-xl text-outline hover:text-on-surface transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-8 py-6 space-y-6 max-h-[65vh] overflow-y-auto custom-scrollbar">
            {/* Description */}
            <div>
              <label className="text-[9px] uppercase tracking-widest text-outline font-black block mb-1.5">Descrição</label>
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
                    <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 animate-in fade-in">
                      <Check className="w-3 h-3" /> Salvo
                    </span>
                  )}
                  {editingDates ? (
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={handleSaveDates}
                        disabled={savingDates}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-[10px] font-bold transition-all"
                      >
                        {savingDates ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        Salvar
                      </button>
                      <button 
                        onClick={() => { setEditingDates(false); setFatalDate(task.fatal_date || ''); setIdealDate(task.ideal_date || ''); }}
                        className="px-2.5 py-1 rounded-lg bg-surface-container-highest text-outline hover:text-on-surface text-[10px] font-bold transition-all"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setEditingDates(true)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary/10 text-secondary hover:bg-secondary/20 text-[10px] font-bold transition-all"
                    >
                      <Pencil className="w-3 h-3" /> Alterar Prazos
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className={cn("p-4 rounded-2xl border transition-all", editingDates ? "bg-surface-container-highest border-secondary/20" : "bg-surface-container-highest/50 border-outline-variant/5")}>
                  <label className="text-[9px] uppercase tracking-widest text-outline font-black flex items-center gap-1.5 mb-1.5">
                    <AlertTriangle className="w-3 h-3" /> Prazo Fatal
                  </label>
                  {editingDates ? (
                    <input 
                      type="date" 
                      value={fatalDate} 
                      onChange={(e) => setFatalDate(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-3 py-2 text-sm text-on-surface font-bold focus:border-secondary/40 focus:ring-2 focus:ring-secondary/10 outline-none transition-all"
                    />
                  ) : (
                    <>
                      <p className={cn("text-sm font-bold", currentDaysUntil !== null && currentDaysUntil < 0 ? "text-error" : currentDaysUntil === 0 ? "text-secondary" : "text-on-surface")}>
                        {fatalDate ? new Date(fatalDate + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                      </p>
                      {currentDaysUntil !== null && (
                        <span className={cn("text-[10px] font-bold", currentDaysUntil < 0 ? "text-error" : currentDaysUntil === 0 ? "text-secondary" : "text-emerald-500")}>
                          {currentDaysUntil < 0 ? `${Math.abs(currentDaysUntil)} dia(s) em atraso` : currentDaysUntil === 0 ? 'Vence hoje' : `Faltam ${currentDaysUntil} dia(s)`}
                        </span>
                      )}
                    </>
                  )}
                </div>
                <div className={cn("p-4 rounded-2xl border transition-all", editingDates ? "bg-surface-container-highest border-secondary/20" : "bg-surface-container-highest/50 border-outline-variant/5")}>
                  <label className="text-[9px] uppercase tracking-widest text-outline font-black flex items-center gap-1.5 mb-1.5">
                    <CalendarClock className="w-3 h-3" /> Meta Ideal
                  </label>
                  {editingDates ? (
                    <input 
                      type="date" 
                      value={idealDate} 
                      onChange={(e) => setIdealDate(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-3 py-2 text-sm text-on-surface font-bold focus:border-secondary/40 focus:ring-2 focus:ring-secondary/10 outline-none transition-all"
                    />
                  ) : (
                    <p className="text-sm font-bold text-on-surface">
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
                <label className="text-[9px] uppercase tracking-widest text-outline font-black flex items-center gap-1.5 mb-1.5">
                  <Tag className="w-3 h-3" /> Prioridade
                </label>
                <span className={cn(
                  "inline-block text-xs font-bold px-3 py-1 rounded-lg",
                  priorityColors[task.priority] || 'bg-surface-container-highest text-outline'
                )}>
                  {task.priority}
                </span>
              </div>
            )}

            {/* Acompanhamento Block */}
            {task.task_type === 'Acompanhamento de Processo' && (
              <div className="space-y-4">
                {/* Input form */}
                <div className="bg-surface-container-highest/50 p-5 rounded-2xl border border-amber-500/30 ring-1 ring-amber-500/10">
                  <h4 className="text-[10px] uppercase tracking-widest text-amber-500 font-black mb-3 flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5" /> Registrar Acompanhamento
                  </h4>
                  
                  <textarea 
                    value={acompanhamentoRelato}
                    onChange={(e) => setAcompanhamentoRelato(e.target.value)}
                    placeholder="Relate o que foi verificado neste acompanhamento..."
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 text-sm mb-3 focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/10 outline-none transition-all"
                    rows={3}
                  />
                  
                  <div className="flex justify-end">
                    <button 
                      onClick={handleRegistrarAcompanhamento}
                      disabled={savingAcompanhamento}
                      className="bg-amber-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-amber-600 transition-all flex items-center gap-2"
                    >
                      {savingAcompanhamento ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Salvar Relato
                    </button>
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-surface-container-highest/30 rounded-2xl border border-outline-variant/10 overflow-hidden">
                  <div className="px-5 py-3 border-b border-outline-variant/10 flex items-center justify-between">
                    <h4 className="text-[10px] uppercase tracking-widest text-outline font-black flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5" /> Histórico de Acompanhamentos
                    </h4>
                    {loadingTimeline && <Loader2 className="w-3.5 h-3.5 text-outline animate-spin" />}
                  </div>

                  {!loadingTimeline && timelineRecords.length === 0 && (
                    <div className="px-5 py-6 text-center">
                      <p className="text-xs text-outline italic">Nenhum acompanhamento registrado ainda.</p>
                    </div>
                  )}

                  {timelineRecords.length > 0 && (
                    <div className="px-5 py-4">
                      <div className="relative">
                        {/* Vertical line */}
                        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-amber-500/20" />
                        
                        <div className="space-y-4">
                          {timelineRecords.map((record, idx) => {
                            const relato = record.description.replace(/^\[ACOMPANHAMENTO\]:\s*/, '');
                            const date = new Date(record.date);
                            const isFirst = idx === 0;
                            return (
                              <div key={record.id} className="flex gap-4 relative">
                                {/* Node */}
                                <div className={cn(
                                  "w-3.5 h-3.5 rounded-full shrink-0 mt-0.5 ring-2 ring-surface-container-highest/80 z-10",
                                  isFirst ? "bg-amber-500 ring-amber-500/30" : "bg-surface-container-high ring-outline-variant/30"
                                )} />
                                
                                {/* Content */}
                                <div className={cn(
                                  "flex-1 rounded-xl p-3 border transition-all",
                                  isFirst
                                    ? "bg-amber-500/8 border-amber-500/20"
                                    : "bg-surface-container-highest/40 border-outline-variant/10"
                                )}>
                                  <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <span className={cn(
                                      "text-[9px] font-black uppercase tracking-widest",
                                      isFirst ? "text-amber-500" : "text-outline"
                                    )}>
                                      {isFirst ? '● Mais recente' : `#${timelineRecords.length - idx}`}
                                    </span>
                                    <span className="text-[9px] text-outline font-mono">
                                      {date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                      {' '}
                                      {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <p className="text-xs text-on-surface leading-relaxed">{relato}</p>
                                  {record.responsible && (
                                    <div className="flex items-center gap-1 mt-2">
                                      <div className="w-4 h-4 rounded-full bg-secondary/15 text-secondary flex items-center justify-center text-[8px] font-black shrink-0">
                                        {record.responsible.charAt(0).toUpperCase()}
                                      </div>
                                      <span className="text-[9px] text-outline font-medium">{record.responsible.split(',')[0].trim()}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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
                    <p className="text-xs font-mono font-bold text-on-surface mt-0.5">{proc.number || '—'}</p>
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
                    onClick={() => { onClose(); navigate(`/processos/${proc.id}`); }}
                    className="mt-2 flex items-center gap-2 text-secondary hover:text-secondary/80 text-[10px] font-black uppercase tracking-widest transition-colors"
                  >
                    <ArrowRight className="w-3.5 h-3.5" /> Ver Processo Completo
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-4 border-t border-outline-variant/10 bg-surface-container-high/20 flex items-center justify-between">
            <span className="text-[9px] text-outline uppercase tracking-widest font-bold">
              Criada em {new Date(task.created_at).toLocaleDateString('pt-BR')}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { toggleTaskComplete(task.id, task.status); onClose(); }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                  task.status === 'Concluída' 
                    ? "bg-secondary/10 text-secondary hover:bg-secondary/20" 
                    : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                )}
              >
                <CheckCircle2 className="w-4 h-4" />
                {task.status === 'Concluída' ? 'Reabrir' : 'Concluir'}
              </button>
              <button onClick={onClose} className="px-4 py-2 bg-surface-container-highest text-on-surface-variant text-xs font-bold rounded-xl hover:bg-surface-container-high transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <NewTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setModalLockedProcessId(undefined);
          setModalInitialTaskType(undefined);
        }}
        onSuccess={() => { if (userData) fetchTasks(userData); }}
        lockedProcessId={modalLockedProcessId}
        initialTaskType={modalInitialTaskType}
      />

      {showFollowUpPrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
          <div className="bg-surface-container-low w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center border border-outline-variant/10">
            <RotateCcw className="w-12 h-12 text-amber-500 mb-4" />
            <h3 className="font-headline font-bold text-lg text-on-surface mb-2">Acompanhamento de Processo</h3>
            <p className="text-sm text-on-surface-variant mb-6">Deseja criar um acompanhamento (Revisão Pendente) para o processo desta demanda?</p>
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setShowFollowUpPrompt(false)} 
                className="flex-1 py-3 bg-surface-container-highest text-on-surface-variant font-bold rounded-xl hover:bg-surface-container-high transition-all"
              >
                Não agora
              </button>
              <button 
                onClick={() => {
                  setShowFollowUpPrompt(false);
                  setModalLockedProcessId(followUpProcessId || undefined);
                  setModalInitialTaskType('Acompanhamento de Processo');
                  setIsTaskModalOpen(true);
                }} 
                className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-all shadow-md shadow-amber-500/20"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedTaskDetail && (
        <TaskDetailModal task={selectedTaskDetail} onClose={() => setSelectedTaskDetail(null)} />
      )}

      <section className="mb-10">
        <h2 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface mb-2">Visão Geral</h2>
        <p className="text-on-surface-variant">Bem-vindo(a) de volta. Aqui está o resumo jurídico do seu dia.</p>
      </section>

      {/* Fixed Cohesive Layout instead of loose items */}
      <div className="space-y-8">
        {widgets.stats}
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 flex flex-col gap-8">
            {widgets.deadlineTables}
            {widgets.activities}
          </div>
          <div className="lg:col-span-4 flex flex-col gap-8">
            {widgets.deadlines}
            {widgets.billing}
          </div>
        </div>
      </div>

      <button
        onClick={() => setIsTaskModalOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-secondary text-on-secondary rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-95 z-50"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
