import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, ChevronDown, MessageSquare, Clock, CalendarDays } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Client {
  id: string;
  name: string;
}

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lockedProcessId?: string;
  editingTask?: any;
  initialDescription?: string;
  initialTaskType?: string;
}

export function NewTaskModal({ isOpen, onClose, onSuccess, lockedProcessId, editingTask, initialDescription, initialTaskType }: NewTaskModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedProcessId, setSelectedProcessId] = useState('');
  const [taskType, setTaskType] = useState('');
  const [description, setDescription] = useState('');
  const [responsibles, setResponsibles] = useState<string[]>([]);
  const [currentResponsible, setCurrentResponsible] = useState('');
  const [priority, setPriority] = useState('Média');
  const [fatalDate, setFatalDate] = useState('');
  const [idealDate, setIdealDate] = useState('');

  const [clientProcesses, setClientProcesses] = useState<any[]>([]);

  // Pre-fill form and fetch data
  useEffect(() => {
    if (!isOpen) return;
    
    if (editingTask) {
      setSelectedClientId(editingTask.client_id || '');
      setSelectedProcessId(editingTask.process_id || '');
      setTaskType(editingTask.task_type || '');
      setDescription(editingTask.description || '');
      setResponsibles(editingTask.responsible ? editingTask.responsible.split(',').map((r: string) => r.trim()).filter((r:string)=>r) : []);
      setPriority(editingTask.priority || 'Média');
      setFatalDate(editingTask.fatal_date ? editingTask.fatal_date.split('T')[0] : '');
      setIdealDate(editingTask.ideal_date ? editingTask.ideal_date.split('T')[0] : '');
    } else {
      resetForm();
      if (initialDescription) setDescription(initialDescription);
      if (initialTaskType) setTaskType(initialTaskType);
    }

    if (lockedProcessId) {
      supabase.from('processes').select('id, client_id').eq('id', lockedProcessId).single().then(({ data }) => {
        if (data) {
          setSelectedClientId(data.client_id || '');
          setSelectedProcessId(data.id || '');
        }
      });
    }

    setLoadingClients(true);
    supabase.from('clients').select('id, name').order('name').then(({ data }) => {
      setClients(data || []);
      setLoadingClients(false);
    });

    supabase.from('profiles').select('id, name, role').order('name').then(({ data }) => {
      setProfiles(data || []);
    });
  }, [isOpen, editingTask, lockedProcessId]);

  // Fetch processes for selected client
  useEffect(() => {
    if (!selectedClientId) {
      setClientProcesses([]);
      return;
    }
    supabase
      .from('processes')
      .select('*')
      .eq('client_id', selectedClientId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setClientProcesses(data || []);
      });
  }, [selectedClientId]);

  // Reset form
  function resetForm() {
    if (lockedProcessId) return;
    setSelectedClientId('');
    setSelectedProcessId('');
    setTaskType('');
    setDescription('');
    setResponsibles([]);
    setCurrentResponsible('');
    setPriority('Média');
    setFatalDate('');
    setIdealDate('');
    setError('');
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão inválida. Faça login novamente.');

      const clientName = clients.find(c => c.id === selectedClientId)?.name || '';
      const resolvedProcessId = lockedProcessId || selectedProcessId || (editingTask ? editingTask.process_id : null);
      const processNumber = clientProcesses.find(p => p.id === resolvedProcessId)?.number || (editingTask ? editingTask.process_number : null);

      const payload: any = {
        client_id: selectedClientId || null,
        client_name: clientName,
        process_number: processNumber,
        process_id: resolvedProcessId,
        task_type: taskType || null,
        description,
        responsible: responsibles.length > 0 ? responsibles.join(', ') : null,
        priority,
        fatal_date: fatalDate || null,
        ideal_date: idealDate || null,
      };

      let task;
      if (editingTask) {
        payload.updated_at = new Date().toISOString();
        const { data, error: updateError } = await supabase
          .from('tasks').update(payload).eq('id', editingTask.id).select().single();
        if (updateError) throw updateError;
        task = data;
      } else {
        payload.user_id = user.id;
        const { data, error: insertError } = await supabase
          .from('tasks').insert([payload]).select().single();
        if (insertError) throw insertError;
        task = data;

        if (task && task.process_id) {
          const allowedTypes = ['Petição', 'Despacho', 'Audiência', 'Julgamento', 'Outros'];
          const movementType = allowedTypes.includes(task.task_type || '') ? task.task_type : 'Outros';
          const { error } = await supabase.from('process_movements').insert([{
            process_id: task.process_id,
            type: movementType,
            description: `Nova tarefa delegada: ${task.description}`,
            date: new Date().toISOString(),
            responsible: task.responsible,
            user_id: user.id
          }]);
          if (error) console.error("Erro na criação automática:", error);
        }
      }


      // Criar notificações para cada responsável (apenas ao criar, não ao editar)
      if (!editingTask && task && responsibles.length > 0) {
        const { data: allProfiles } = await supabase.from('profiles').select('id, name');
        
        const notificationsPayload = responsibles
          .map((name: string) => {
            const profile = (allProfiles || []).find(
              (p: any) => p.name.toLowerCase().trim() === name.toLowerCase().trim()
            );
            if (!profile?.id) return null;
            return {
              user_id: profile.id,
              task_id: task.id,
              type: 'task_assigned',
              title: `Nova tarefa atribuída a você`,
              body: task.description || '',
              task_type: task.task_type || null,
              is_read: false,
            };
          })
          .filter(Boolean);

        if (notificationsPayload.length > 0) {
          await supabase.from('notifications').insert(notificationsPayload);
        }
      }

      onSuccess();

      handleClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar tarefa.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const priorityColors: Record<string, string> = {
    'Baixa': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Média': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Alta': 'bg-error/10 text-error border-error/20',
  };

  return (
    <div className="fixed inset-0 bg-surface/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-surface-container w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-outline-variant/20 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low shrink-0">
          <div>
            <h3 className="font-headline font-bold text-xl text-on-surface">{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
            <p className="text-xs text-on-surface-variant mt-1">Crie uma tarefa vinculada a um cliente e processo</p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-surface-container-high rounded-full text-on-surface-variant transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
          {error && (
            <div className="p-4 bg-error/10 text-error rounded-xl text-sm font-medium flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Client + Process */}
          {!lockedProcessId && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Cliente</label>
              <div className="relative">
                <select
                  required
                  value={selectedClientId}
                  onChange={e => { setSelectedClientId(e.target.value); setSelectedProcessId(''); }}
                  disabled={loadingClients}
                  className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary placeholder:text-outline/50 transition-all font-medium appearance-none pr-10"
                >
                  <option value="">Selecione um cliente</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-outline absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Processo Vinculado</label>
              <div className="relative">
                <select
                  value={selectedProcessId}
                  onChange={e => setSelectedProcessId(e.target.value)}
                  disabled={!selectedClientId}
                  className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary placeholder:text-outline/50 transition-all font-medium appearance-none pr-10 disabled:opacity-50"
                >
                  <option value="">{selectedClientId ? (clientProcesses.length > 0 ? 'Selecione o processo' : 'Nenhum processo encontrado') : 'Selecione um cliente primeiro'}</option>
                  {clientProcesses.map(p => (
                    <option key={p.id} value={p.id}>{p.number}{p.court ? ` — ${p.court}` : ''}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-outline absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
          )}

          {/* Task Type */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tipo de Tarefa</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'Petição', icon: '📝' },
                { value: 'Protocolo', icon: '📬' },
                { value: 'Diligência', icon: '🔍' },
                { value: 'Audiência de Instrução ou Conciliação', icon: '⚖️' },
                { value: 'Análise de Processo', icon: '📂' },
                { value: 'Acompanhamento de Processo', icon: '🔄' },
              ].map(({ value, icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTaskType(taskType === value ? '' : value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    taskType === value
                      ? 'bg-secondary/15 border-secondary/40 text-secondary'
                      : 'bg-surface-container-highest border-outline-variant/10 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`}
                >
                  <span>{icon}</span>
                  {value}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">O que precisa ser feito</label>
            <textarea
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary placeholder:text-outline/50 transition-all font-medium resize-none"
              placeholder="Descreva a tarefa detalhadamente..."
            />
          </div>

          {/* Responsible + Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Responsáveis</label>
              {responsibles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {responsibles.map((r, i) => (
                    <span key={i} className="bg-secondary/10 text-secondary px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 font-bold">
                      {r}
                      <button type="button" onClick={() => setResponsibles(responsibles.filter((_, index) => index !== i))} className="hover:text-secondary/70">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="relative">
                <select
                  value=""
                  onChange={e => {
                    const val = e.target.value;
                    if (val && !responsibles.includes(val)) {
                      setResponsibles([...responsibles, val]);
                    }
                  }}
                  className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary transition-all font-medium appearance-none pr-10"
                >
                  <option value="">Selecione da equipe...</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.name}>{p.name} ({p.role || 'Usuário'})</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-outline absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Prioridade</label>
              <div className="flex gap-2">
                {(['Baixa', 'Média', 'Alta'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                      priority === p
                        ? priorityColors[p]
                        : 'bg-surface-container-highest border-outline-variant/10 text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-2 text-emerald-400">
                <CalendarDays className="w-3.5 h-3.5" />
                Prazo Ideal (Meta)
              </label>
              <input
                type="date"
                value={idealDate}
                onChange={e => setIdealDate(e.target.value)}
                className="w-full bg-surface-container-highest border border-emerald-500/20 rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-2 text-error">
                <CalendarDays className="w-3.5 h-3.5" />
                Prazo Fatal (Limite)
              </label>
              <input
                type="date"
                value={fatalDate}
                onChange={e => setFatalDate(e.target.value)}
                className="w-full bg-surface-container-highest border border-error/20 rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-error transition-all font-medium"
                required
              />
            </div>
          </div>


          {/* Actions */}
          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-3 font-bold text-on-surface-variant hover:bg-surface-container-highest rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-secondary text-on-secondary font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingTask ? 'Salvar Alterações' : 'Criar Tarefa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
