import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, Reorder } from 'motion/react';
import { TrendingUp, Users, Calendar, Clock, FileText, ArrowRight, Plus, Loader2, CheckCircle2, Check, CalendarClock, AlertTriangle, RotateCcw, GripVertical, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [activeProcessesCount, setActiveProcessesCount] = useState(0);
  const [todayEventsCount, setTodayEventsCount] = useState(0);
  const [localSubmitting, setLocalSubmitting] = useState<string | null>(null);
  const [userData, setUserData] = useState<{id: string, name: string, role: string} | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<string[]>([]);
  const [readTasks, setReadTasks] = useState<Set<string>>(new Set());

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(new Date().toISOString().split('T')[0]);
  const [taskFilter, setTaskFilter] = useState<'Todas' | 'Em progresso' | 'Concluídas'>('Todas');

  // Deadline Tables State
  const [deadlineSearch, setDeadlineSearch] = useState('');
  const [deadlineFilter, setDeadlineFilter] = useState<'all' | 'atrasados' | 'hoje' | 'em_dia' | 'outras'>('all');

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
    const orQuery = `user_id.eq.${u.id}${u.name ? `,responsible.ilike.%${u.name}%` : ''}`;

    const { data } = await supabase
      .from('tasks')
      .select('*, processes(number, vara, comarca, court)')
      .or(orQuery)
      .order('created_at', { ascending: false });
      
    setTasks(data || []);
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
    const originalTasks = [...tasks];
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, updated_at: new Date().toISOString() } : t));

    const { error } = await supabase.from('tasks').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', taskId);
    
    if (error) {
      console.error("Erro ao atualizar tarefa:", error);
      setTasks(originalTasks); // Rollback on error
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

  const upcomingDeadlines = tasks
    .filter(t => t.fatal_date && t.status !== 'Concluída')
    .sort((a, b) => new Date(a.fatal_date).getTime() - new Date(b.fatal_date).getTime())
    .slice(0, 3);

  function getDaysUntil(dateStr: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr + 'T00:00:00');
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }

  const isAdmin = userData?.role === 'Administrador';
  const pendingTasks = tasks.filter(t => t.status !== 'Concluída');
  const recentTasks = pendingTasks;
  const allCompletedTasks = tasks
    .filter(t => t.status === 'Concluída')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  const completedTasks = allCompletedTasks.slice(0, 5);
  const totalCompletedCount = allCompletedTasks.length;

  const categorizedTasks = {
    atrasados: tasks.filter(t => t.fatal_date && t.status !== 'Concluída' && getDaysUntil(t.fatal_date) < 0),
    hoje: tasks.filter(t => t.fatal_date && t.status !== 'Concluída' && getDaysUntil(t.fatal_date) === 0),
    em_dia: tasks.filter(t => t.fatal_date && t.status !== 'Concluída' && getDaysUntil(t.fatal_date) > 0),
    outras: tasks.filter(t => !t.fatal_date && t.status !== 'Concluída'),
  };

  const renderDeadlineTable = (tasksList: any[], title: string, color: string, icon: React.ReactNode) => (
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
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[9px] uppercase tracking-widest text-outline font-black border-b border-outline-variant/5">
              <th className="px-6 py-3">Prazo</th>
              <th className="px-6 py-3">Descrição</th>
              <th className="px-6 py-3">Cliente / Processo</th>
              <th className="px-6 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/5">
            {tasksList.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-outline text-xs italic">
                  Nenhuma demanda nesta categoria.
                </td>
              </tr>
            ) : (
              tasksList.map((task) => {
                const daysUntil = task.fatal_date ? getDaysUntil(task.fatal_date) : null;
                return (
                  <tr key={task.id} className="hover:bg-surface-container-high/50 transition-colors group">
                    <td className="px-6 py-3">
                      <div className="flex flex-col">
                        <span className={cn(
                          "text-xs font-bold",
                          daysUntil !== null && daysUntil < 0 ? "text-error" : 
                          daysUntil === 0 ? "text-secondary" : "text-on-surface"
                        )}>
                          {task.fatal_date ? new Date(task.fatal_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'S/D'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <p className="text-xs text-on-surface font-medium line-clamp-1">{task.description}</p>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-on-surface-variant font-medium truncate max-w-[120px]">{task.client_name || 'Sem cliente'}</span>
                        <span className="text-[9px] text-outline font-mono">{task.process_number || 'S/N'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => toggleTaskComplete(task.id, task.status)}
                          className="p-1.5 hover:bg-emerald-500/10 text-outline hover:text-emerald-500 rounded-lg transition-all"
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
    </div>
  );

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
                onClick={() => setDeadlineFilter('outras')}
                className={cn(
                  "px-3 py-1 rounded-lg text-[10px] font-bold transition-all",
                  deadlineFilter === 'outras' ? "bg-surface-container-highest text-on-surface" : "text-outline hover:text-on-surface"
                )}
              >
                Sem Prazo
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gradient-to-br from-error/10 to-surface-container-low p-4 rounded-2xl border border-error/10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-error/80">Atrasados</span>
                <AlertTriangle className="w-4 h-4 text-error" />
              </div>
              <h3 className="text-2xl font-headline font-black text-error">{categorizedTasks.atrasados.length}</h3>
            </div>
            <div className="bg-gradient-to-br from-secondary/10 to-surface-container-low p-4 rounded-2xl border border-secondary/10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-secondary/80">Para Hoje</span>
                <Clock className="w-4 h-4 text-secondary" />
              </div>
              <h3 className="text-2xl font-headline font-black text-secondary">{categorizedTasks.hoje.length}</h3>
            </div>
            <div className="bg-gradient-to-br from-emerald-500/10 to-surface-container-low p-4 rounded-2xl border border-emerald-500/10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500/80">Em Dia</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <h3 className="text-2xl font-headline font-black text-on-surface">{categorizedTasks.em_dia.length}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-1 gap-6">
            {(deadlineFilter === 'all' || deadlineFilter === 'atrasados') && renderDeadlineTable(
              categorizedTasks.atrasados, 
              "Demandas em Atraso", 
              "bg-error/10 text-error", 
              <AlertTriangle className="w-4 h-4" />
            )}
            
            {(deadlineFilter === 'all' || deadlineFilter === 'hoje') && renderDeadlineTable(
              categorizedTasks.hoje, 
              "Vencendo Hoje", 
              "bg-secondary/10 text-secondary", 
              <Clock className="w-4 h-4" />
            )}

            {(deadlineFilter === 'all' || deadlineFilter === 'em_dia') && renderDeadlineTable(
              categorizedTasks.em_dia, 
              "Prazos em Dia", 
              "bg-emerald-500/10 text-emerald-500", 
              <Calendar className="w-4 h-4" />
            )}

            {(deadlineFilter === 'all' || deadlineFilter === 'outras') && renderDeadlineTable(
              categorizedTasks.outras, 
              "Outras Demandas (Sem Prazo Fatal)", 
              "bg-surface-container-highest text-outline", 
              <FileText className="w-4 h-4" />
            )}
          </div>
        </div>
      </DraggableWidget>
    ),
  };

  return (
    <div className="space-y-8">
      <NewTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSuccess={fetchTasks}
      />

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
