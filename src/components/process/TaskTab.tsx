import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Plus, CheckCircle2, CalendarClock, ChevronDown, ChevronUp, Trash2, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NewTaskModal } from '@/components/NewTaskModal';
export interface Task {
  id: string;
  title: string;
  description: string;
  task_type: string;
  priority: string;
  fatal_date: string | null;
  ideal_date: string | null;
  status: string;
  responsible: string | null;
  process_id: string | null;
  created_at: string;
}
export function TaskTab({ processId }: { processId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<string[]>([]);

  async function fetchTasks() {
    setLoading(true);
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('process_id', processId)
      .order('created_at', { ascending: false });
    
    setTasks(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchTasks();
    supabase.from('profiles').select('id, name, role').order('name').then(({ data }) => setProfiles(data || []));
  }, [processId]);

  function toggleExpand(id: string) {
    if (expandedTasks.includes(id)) {
      setExpandedTasks(expandedTasks.filter(t => t !== id));
    } else {
      setExpandedTasks([...expandedTasks, id]);
    }
  }

  async function toggleStatus(task: Task) {
    const newStatus = task.status === 'Concluída' ? 'Pendente' : 'Concluída';
    await supabase.from('tasks').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', task.id);

    if (newStatus === 'Concluída' && task.process_id) {
      const { data: { user } } = await supabase.auth.getUser();
      const allowedTypes = ['Petição', 'Despacho', 'Audiência', 'Julgamento', 'Protocolo', 'Diligência', 'Audiência de Instrução ou Conciliação', 'Análise de Processo', 'Outros'];
      const movementType = allowedTypes.includes(task.task_type || '') ? task.task_type : 'Outros';

      const { error } = await supabase.from('process_movements').insert([{
         process_id: task.process_id,
         type: movementType,
         description: `Tarefa concluída: ${task.description}`,
         date: new Date().toISOString(),
         responsible: task.responsible,
         user_id: user?.id
      }]);
      if (error) console.error("Erro na Timeline automática:", error);
    }

    fetchTasks();
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Excluir esta tarefa?')) return;
    await supabase.from('tasks').delete().eq('id', id);
    fetchTasks();
  }

  // handleSubmit is now handled by NewTaskModal

  const priorityColors: Record<string, string> = {
    'Baixa': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    'Normal': 'bg-primary/10 text-primary border-primary/20',
    'Alta': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    'Urgente': 'bg-error/10 text-error border-error/20',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h3 className="text-xl font-headline font-bold text-on-surface">Demandas e Atividades</h3>
          <p className="text-sm text-on-surface-variant">Checklist de obrigações e delegação de tarefas do processo.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-secondary text-on-secondary font-bold text-xs rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-secondary/10 shrink-0 h-fit"
        >
          <Plus className="w-4 h-4" />
          Nova Tarefa do Processo
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-secondary" /></div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 bg-surface-container-lowest border border-outline-variant/5 rounded-3xl">
          <CheckCircle2 className="w-12 h-12 text-outline mx-auto mb-4" />
          <p className="font-bold text-on-surface">Nenhuma tarefa designada</p>
          <p className="text-sm text-on-surface-variant font-medium mt-1">Todas as atividades deste processo aparecerão aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const isCompleted = task.status === 'Concluída';
            const isExpanded = expandedTasks.includes(task.id);
            const isOverdue = !isCompleted && task.fatal_date && new Date(task.fatal_date + 'T00:00:00').getTime() < new Date().setHours(0,0,0,0);

            return (
              <div key={task.id} className={cn(
                "rounded-2xl border transition-all overflow-hidden",
                isCompleted 
                  ? "bg-surface-container-lowest/50 opacity-60 border-outline-variant/5" 
                  : isOverdue
                    ? "bg-error/5 border-error/20"
                    : "bg-surface-container-low border-outline-variant/10 hover:border-secondary/30 shadow-sm"
              )}>
                <div className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <button
                    onClick={() => toggleStatus(task)}
                    className={cn(
                      "w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-all mt-0.5",
                      isCompleted ? "bg-emerald-500 border-emerald-500 text-white" : "border-outline-variant/40 hover:border-secondary text-transparent hover:text-secondary/40"
                    )}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  
                  <div className="flex-1 min-w-0" onClick={() => toggleExpand(task.id)}>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={cn(
                        "px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md border",
                        priorityColors[task.priority] || priorityColors['Normal']
                      )}>
                        {task.priority}
                      </span>
                      {task.task_type && (
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md bg-surface-container-highest text-on-surface-variant">
                          {task.task_type}
                        </span>
                      )}
                    </div>
                    <h4 className={cn(
                      "font-bold text-sm cursor-pointer hover:text-secondary transition-colors",
                      isCompleted ? "line-through text-on-surface-variant" : "text-on-surface"
                    )}>
                      {task.title}
                    </h4>
                  </div>

                  <div className="flex flex-wrap items-center gap-6 shrink-0 md:justify-end">
                    <div className="flex flex-col gap-1 items-end">
                      {task.ideal_date && (
                        <div className={cn(
                          "flex items-center gap-1.5 text-[10px] font-bold",
                          isCompleted ? "text-on-surface-variant" : "text-emerald-500"
                        )}>
                          <CalendarClock className="w-3.5 h-3.5" />
                          Ideal: {new Date(task.ideal_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </div>
                      )}
                      {task.fatal_date && (
                        <div className={cn(
                          "flex items-center gap-1.5 text-xs font-bold",
                          isOverdue ? "text-error" : isCompleted ? "text-on-surface-variant" : "text-amber-500"
                        )}>
                          <CalendarClock className="w-4 h-4" />
                          Fatal: {new Date(task.fatal_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </div>
                    {task.responsible && (
                      <div className="flex flex-wrap gap-1">
                        {task.responsible.split(',').map((r, i) => (
                          <span key={i} className="text-[10px] bg-secondary/10 text-secondary border border-secondary/10 px-2 py-0.5 rounded-full font-bold">
                            {r.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-1">
                      <button onClick={() => toggleExpand(task.id)} className="p-1.5 text-outline hover:text-on-surface bg-surface-container-high rounded-lg transition-colors" title="Ver Detalhes">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <button onClick={() => setEditingTask(task)} className="p-1.5 text-outline hover:text-secondary bg-surface-container-high rounded-lg transition-colors" title="Editar Tarefa">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(task.id)} className="p-1.5 text-outline hover:text-error bg-error/5 rounded-lg transition-colors" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-14 pb-5 pt-1 border-t border-outline-variant/5">
                    <p className="text-sm text-on-surface-variant whitespace-pre-wrap leading-relaxed">
                      {task.description || 'Nenhuma descrição fornecida para esta tarefa.'}
                    </p>
                    <div className="mt-4 pt-3 border-t border-outline-variant/5 text-[10px] text-outline font-medium tracking-wide flex flex-col gap-1">
                      <p>Criada por <span className="font-bold text-on-surface-variant">{profiles.find(p => p.id === (task as any).user_id)?.name || 'Usuário Sistema'}</span> em {new Date(task.created_at).toLocaleString('pt-BR')}</p>
                      {(task as any).updated_at && (task as any).updated_at !== task.created_at && (
                        <p>Última alteração em {new Date((task as any).updated_at).toLocaleString('pt-BR')}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <NewTaskModal
        isOpen={isModalOpen || !!editingTask}
        onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
        onSuccess={() => { fetchTasks(); setIsModalOpen(false); setEditingTask(null); }}
        lockedProcessId={processId}
        editingTask={editingTask}
      />
    </div>
  );
}
