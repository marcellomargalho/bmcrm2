import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Plus, Edit2, Trash2, Clock, History, CloudDownload, X, FileText, Scale, Gavel } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Movement {
  id: string;
  type: string;
  description: string;
  date: string;
  responsible: string | null;
  created_at: string;
}

export function MovementTab({ processId }: { processId: string }) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null);
  
  const [formData, setFormData] = useState({
    type: 'Petição',
    description: '',
    date: new Date().toISOString().slice(0, 16), // YYYY-MM-DDThh:mm
    responsible: '',
    changeProcessStatus: ''
  });
  const [submitting, setSubmitting] = useState(false);

  async function fetchMovements() {
    setLoading(true);
    const { data } = await supabase
      .from('process_movements')
      .select('*')
      .eq('process_id', processId)
      .order('date', { ascending: false });
    
    setMovements(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchMovements();
  }, [processId]);

  function openNewModal() {
    setEditingMovement(null);
    setFormData({
      type: 'Petição',
      description: '',
      date: new Date().toISOString().slice(0, 16),
      responsible: '',
      changeProcessStatus: ''
    });
    setIsModalOpen(true);
  }

  function openEditModal(mov: Movement) {
    setEditingMovement(mov);
    // Remove os segundos e fuso se houver para o input datetime-local
    const dt = new Date(mov.date);
    const localDateTime = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    
    setFormData({
      type: mov.type,
      description: mov.description,
      date: localDateTime,
      responsible: mov.responsible || '',
      changeProcessStatus: ''
    });
    setIsModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Tem certeza que deseja excluir esta movimentação?')) return;
    await supabase.from('process_movements').delete().eq('id', id);
    fetchMovements();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    
    const token = await supabase.auth.getUser();
    const userId = token.data.user?.id;

    // Converte o datetime local para ISO UTC
    const utcDate = new Date(formData.date).toISOString();

    const payload = {
      process_id: processId,
      type: formData.type,
      description: formData.description,
      date: utcDate,
      responsible: formData.responsible || null,
      user_id: userId
    };

    if (editingMovement) {
      await supabase.from('process_movements').update(payload).eq('id', editingMovement.id);
    } else {
      await supabase.from('process_movements').insert([payload]);
    }

    // Se o usuário selecionou para trocar o status do processo
    if (formData.changeProcessStatus) {
      await supabase.from('processes').update({ status: formData.changeProcessStatus }).eq('id', processId);
      // reload na página inteira para o header atualizar (ou poderíamos usar context, mas reload é mais rápido aqui)
      window.location.reload();
    } else {
      fetchMovements();
      setIsModalOpen(false);
    }
    
    setSubmitting(false);
  }

  // Função de importar removida

  const typeIcons: Record<string, React.ReactNode> = {
    'Petição': <FileText className="w-4 h-4" />,
    'Despacho': <Scale className="w-4 h-4" />,
    'Audiência': <Clock className="w-4 h-4" />,
    'Julgamento': <Gavel className="w-4 h-4" />,
    'Protocolo': <CloudDownload className="w-4 h-4" />,
    'Diligência': <Clock className="w-4 h-4" />,
    'Audiência de Instrução ou Conciliação': <Gavel className="w-4 h-4" />,
    'Análise de Processo': <FileText className="w-4 h-4" />,
    'Outros': <History className="w-4 h-4" />
  };

  const typeColors: Record<string, string> = {
    'Petição': 'bg-blue-500',
    'Despacho': 'bg-purple-500',
    'Audiência': 'bg-emerald-500',
    'Julgamento': 'bg-error',
    'Protocolo': 'bg-indigo-500',
    'Diligência': 'bg-amber-500',
    'Audiência de Instrução ou Conciliação': 'bg-emerald-600',
    'Análise de Processo': 'bg-cyan-500',
    'Outros': 'bg-secondary'
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h3 className="text-xl font-headline font-bold text-on-surface">Timeline do Processo</h3>
          <p className="text-sm text-on-surface-variant">Histórico cronológico de movimentações.</p>
        </div>
        <div className="flex gap-3">
          {/* Import button removed */}
          <button 
            onClick={openNewModal}
            className="px-4 py-2 bg-secondary text-on-secondary font-bold text-xs rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-secondary/10"
          >
            <Plus className="w-4 h-4" />
            Movimentação Manual
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-secondary" /></div>
      ) : movements.length === 0 ? (
        <div className="text-center py-16 bg-surface-container-lowest border border-outline-variant/5 rounded-3xl">
          <History className="w-12 h-12 text-outline mx-auto mb-4" />
          <p className="font-bold text-on-surface">Nenhuma movimentação registrada</p>
          <p className="text-sm text-on-surface-variant font-medium mt-1">Adicione manualmente ou importe do tribunal.</p>
        </div>
      ) : (
        <div className="relative pl-6 space-y-8 before:absolute before:left-8 before:top-2 before:bottom-2 before:w-0.5 before:bg-outline-variant/10">
          {movements.map((mov) => {
            const dt = new Date(mov.date);
            const dateStr = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
            const timeStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const Icon = typeIcons[mov.type] || typeIcons['Outros'];
            const colorClass = typeColors[mov.type] || typeColors['Outros'];

            return (
              <div key={mov.id} className="relative flex gap-6 items-start group">
                {/* Timeline dot */}
                <div className={cn(
                  "w-5 h-5 rounded-full ring-4 ring-surface-container-low flex items-center justify-center shrink-0 mt-1.5 z-10 transition-transform group-hover:scale-110",
                  colorClass
                )}>
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>

                <div className="flex-1 bg-surface-container-low border border-outline-variant/5 hover:border-outline-variant/20 p-5 rounded-2xl shadow-sm transition-all group-hover:shadow-md relative">
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button onClick={() => openEditModal(mov)} className="p-1.5 text-outline hover:text-secondary bg-surface-container-highest rounded-lg transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(mov.id)} className="p-1.5 text-outline hover:text-error bg-error/5 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mb-2">
                    <span className={cn(
                      "px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md text-white/90",
                      colorClass
                    )}>
                      {mov.type}
                    </span>
                    <span className="text-xs font-bold text-on-surface-variant drop-shadow-sm flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-outline" />
                      {dateStr} às {timeStr}
                    </span>
                  </div>
                  
                  <p className="text-sm font-medium text-on-surface leading-relaxed mt-3 whitespace-pre-wrap">{mov.description}</p>
                  
                  {mov.responsible && (
                    <div className="mt-4 pt-3 border-t border-outline-variant/5 flex items-center gap-2">
                      <span className="text-[10px] text-outline uppercase tracking-widest font-bold">Lançado por:</span>
                      <span className="text-[10px] bg-secondary/10 text-secondary border border-secondary/10 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                        {mov.responsible}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Movement */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-surface/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface-container w-full max-w-lg rounded-3xl shadow-2xl border border-outline-variant/20 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center">
              <h3 className="font-headline font-bold text-xl text-on-surface">{editingMovement ? 'Editar Movimentação' : 'Nova Movimentação'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-surface-container-highest rounded-full text-on-surface-variant">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tipo</label>
                  <select
                    required
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-secondary appearance-none"
                  >
                    <option value="Petição">Petição</option>
                    <option value="Despacho">Despacho</option>
                    <option value="Audiência">Audiência</option>
                    <option value="Julgamento">Julgamento</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Data e Hora</label>
                  <input
                    required
                    type="datetime-local"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-secondary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Descrição</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-secondary min-h-[100px] resize-y"
                  placeholder="Descreva a movimentação..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Responsável</label>
                <input
                  type="text"
                  value={formData.responsible}
                  onChange={e => setFormData({ ...formData, responsible: e.target.value })}
                  className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-secondary"
                  placeholder="Quem lançou ou é dono desta movimentação?"
                />
              </div>

              <div className="space-y-1.5 pt-4 border-t border-outline-variant/10">
                <label className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1">
                  Atualizar Status do Processo? (Opcional)
                </label>
                <select
                  value={formData.changeProcessStatus}
                  onChange={e => setFormData({ ...formData, changeProcessStatus: e.target.value })}
                  className="w-full bg-surface-container-highest border border-secondary/20 rounded-xl px-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-secondary appearance-none"
                >
                  <option value="">Manter status atual</option>
                  <option value="Em Andamento">Em Andamento</option>
                  <option value="Urgente">Urgente</option>
                  <option value="Arquivado">Arquivado</option>
                </select>
                <p className="text-[10px] text-on-surface-variant">Se preenchido, o processo inteiro alterará seu status a partir desta movimentação.</p>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 font-bold text-on-surface-variant hover:bg-surface-container-highest rounded-xl transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-secondary text-on-secondary font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-2">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
