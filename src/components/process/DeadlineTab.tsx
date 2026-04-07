import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Plus, Edit2, Trash2, CalendarClock, BellRing, Wand2, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Deadline {
  id: string;
  type: string;
  due_date: string;
  status: string;
  created_at: string;
}

export function DeadlineTab({ processId }: { processId: string }) {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState<Deadline | null>(null);
  
  const [formData, setFormData] = useState({
    type: '',
    dueDate: new Date().toISOString().slice(0, 10),
    syncAgenda: true,
    sendAlerts: true,
  });
  const [submitting, setSubmitting] = useState(false);

  async function fetchDeadlines() {
    setLoading(true);
    const { data } = await supabase
      .from('process_deadlines')
      .select('*')
      .eq('process_id', processId)
      .order('due_date', { ascending: true });
    
    setDeadlines(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchDeadlines();
  }, [processId]);

  function getDeadlineStatus(dueDate: string, status: string) {
    if (status === 'concluído') {
      return { label: 'Concluído', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate + 'T00:00:00');
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: `Atrasado há ${Math.abs(diffDays)} dias`, color: 'text-error bg-error/10 border-error/20' };
    } else if (diffDays === 0) {
      return { label: 'Vence Hoje (Crítico)', color: 'text-error bg-error/10 border-error/20 font-bold animate-pulse' };
    } else if (diffDays <= 3) {
      return { label: `Vence em ${diffDays} dias`, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
    } else {
      return { label: `Em dia (${diffDays} dias)`, color: 'text-secondary bg-secondary/10 border-secondary/20' };
    }
  }

  function openNewModal() {
    setEditingDeadline(null);
    setFormData({
      type: '',
      dueDate: new Date().toISOString().slice(0, 10),
      syncAgenda: true,
      sendAlerts: true,
    });
    setIsModalOpen(true);
  }

  function openEditModal(deadline: Deadline) {
    setEditingDeadline(deadline);
    setFormData({
      type: deadline.type,
      dueDate: deadline.due_date,
      syncAgenda: true,
      sendAlerts: true,
    });
    setIsModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Tem certeza que deseja excluir este prazo?')) return;
    await supabase.from('process_deadlines').delete().eq('id', id);
    fetchDeadlines();
  }

  async function toggleStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'concluído' ? 'pendente' : 'concluído';
    await supabase.from('process_deadlines').update({ status: newStatus }).eq('id', id);
    fetchDeadlines();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    
    const token = await supabase.auth.getUser();
    const userId = token.data.user?.id;

    const payload = {
      process_id: processId,
      type: formData.type,
      due_date: formData.dueDate,
      user_id: userId
    };

    if (editingDeadline) {
      await supabase.from('process_deadlines').update(payload).eq('id', editingDeadline.id);
    } else {
      await supabase.from('process_deadlines').insert([payload]);
    }

    fetchDeadlines();
    setIsModalOpen(false);
    setSubmitting(false);
  }

  async function generateAutoDeadline() {
    if (!window.confirm('Verificar última movimentação para sugerir prazo?')) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    
    setFormData({
      type: 'Contestação (Prazo em Dobro Litisconsorte)',
      dueDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().slice(0, 10),
      syncAgenda: true,
      sendAlerts: true,
    });
    setEditingDeadline(null);
    setLoading(false);
    setIsModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h3 className="text-xl font-headline font-bold text-on-surface">Controle de Prazos Fatais</h3>
          <p className="text-sm text-on-surface-variant">Monitoramento de datas limite e contagem regressiva.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={generateAutoDeadline}
            className="px-4 py-2 border border-secondary/30 bg-secondary/5 text-secondary font-bold text-xs rounded-xl hover:bg-secondary/10 transition-all flex items-center gap-2"
          >
            <Wand2 className="w-4 h-4" />
            Gerar Automático
          </button>
          <button 
            onClick={openNewModal}
            className="px-4 py-2 bg-secondary text-on-secondary font-bold text-xs rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-secondary/10"
          >
            <Plus className="w-4 h-4" />
            Novo Prazo
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-secondary" /></div>
      ) : deadlines.length === 0 ? (
        <div className="text-center py-16 bg-surface-container-lowest border border-outline-variant/5 rounded-3xl">
          <CalendarClock className="w-12 h-12 text-outline mx-auto mb-4" />
          <p className="font-bold text-on-surface">Nenhum prazo ativo neste processo</p>
          <p className="text-sm text-on-surface-variant font-medium mt-1">Gere prazos automaticamente a partir da movimentação ou crie um manual.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {deadlines.map((deadline) => {
            const dateObj = new Date(deadline.due_date + 'T00:00:00');
            const dateStr = dateObj.toLocaleDateString('pt-BR');
            const statusInfo = getDeadlineStatus(deadline.due_date, deadline.status);
            const isDone = deadline.status === 'concluído';

            return (
              <div key={deadline.id} className={cn(
                "p-5 rounded-2xl border transition-all flex flex-col justify-between group h-full",
                isDone ? "bg-surface-container-lowest/50 border-outline-variant/10 opacity-70" : "bg-surface-container-low border-outline-variant/20 hover:border-secondary/40 shadow-sm"
              )}>
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold border",
                      statusInfo.color
                    )}>
                      {statusInfo.label}
                    </span>
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditModal(deadline)} className="p-1.5 text-outline hover:text-secondary bg-surface-container-high rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(deadline.id)} className="p-1.5 text-outline hover:text-error bg-error/5 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  
                  <h4 className={cn("font-bold text-sm leading-snug mb-2", isDone ? "line-through text-on-surface-variant" : "text-on-surface")}>
                    {deadline.type}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-outline">
                    <CalendarClock className="w-3.5 h-3.5" />
                    Data limite: {dateStr}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-outline-variant/10 flex justify-between items-center">
                  <span className="text-[10px] text-on-surface-variant italic flex items-center gap-1">
                    <BellRing className="w-3 h-3 text-secondary/70" /> 
                    {isDone ? 'Alertas desligados' : 'Sincronizado'}
                  </span>
                  
                  <button 
                    onClick={() => toggleStatus(deadline.id, deadline.status)}
                    className={cn(
                      "flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border",
                      isDone 
                        ? "text-surface-container bg-emerald-500 border-emerald-500 hover:bg-emerald-600" 
                        : "text-outline bg-surface-container-high border-outline-variant/20 hover:text-emerald-500 hover:border-emerald-500/50"
                    )}
                  >
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2 border-current"></div>}
                    {isDone ? 'Concluído' : 'Marcar Feito'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Deadline */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-surface/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface-container w-full max-w-lg rounded-3xl shadow-2xl border border-outline-variant/20 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center">
              <h3 className="font-headline font-bold text-xl text-on-surface flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-secondary" />
                {editingDeadline ? 'Editar Prazo' : 'Novo Prazo Fatal'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-surface-container-highest rounded-full text-on-surface-variant">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tipo (Nome do Prazo)</label>
                <input
                  required
                  type="text"
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-secondary"
                  placeholder="Ex: Réplica, Apelação, Depósito..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Data Limite (Fatal)</label>
                <input
                  required
                  type="date"
                  value={formData.dueDate}
                  onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-secondary"
                />
              </div>

              <div className="pt-4 border-t border-outline-variant/10 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input type="checkbox" checked={formData.syncAgenda} onChange={e => setFormData({...formData, syncAgenda: e.target.checked})} className="sr-only peer" />
                    <div className="w-10 h-6 bg-surface-container-higher peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-secondary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-surface after:border-outline-variant/20 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
                  </div>
                  <span className="text-sm font-bold text-on-surface group-hover:text-secondary transition-colors">Integrar com Calendário (Agenda)</span>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input type="checkbox" checked={formData.sendAlerts} onChange={e => setFormData({...formData, sendAlerts: e.target.checked})} className="sr-only peer" />
                    <div className="w-10 h-6 bg-surface-container-higher peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-secondary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-surface after:border-outline-variant/20 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
                  </div>
                  <span className="text-sm font-bold text-on-surface group-hover:text-secondary transition-colors">Ativar Alertas (Notificações UI/E-mail)</span>
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 font-bold text-on-surface-variant hover:bg-surface-container-highest rounded-xl transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-secondary text-on-secondary font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-2">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Salvar Prazo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
