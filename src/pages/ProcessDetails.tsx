import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Gavel, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

import { MovementTab } from '@/components/process/MovementTab';
import { DocumentTab } from '@/components/process/DocumentTab';
import { TaskTab } from '@/components/process/TaskTab';
import { NoteTab } from '@/components/process/NoteTab';
import { NewProcessModal } from '@/components/NewProcessModal';

export function ProcessDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [process, setProcess] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Movimentações');
  const [isEditingOpen, setIsEditingOpen] = useState(false);

  const fetchProcess = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from('processes')
      .select(`*, clients(name, cpf_cnpj, status)`)
      .eq('id', id)
      .single();
    
    setProcess(data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchProcess();
  }, [fetchProcess]);

  async function handleDelete() {
    if (window.confirm('Tem certeza que deseja excluir este processo? Essa ação não pode ser desfeita e todas as movimentações, tarefas e documentos associados podem ser perdidos.')) {
      await supabase.from('processes').delete().eq('id', id);
      navigate('/processos');
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-secondary" /></div>;
  }

  if (!process) {
    return (
      <div className="space-y-8">
        <button onClick={() => navigate('/processos')} className="flex items-center gap-2 text-outline hover:text-secondary">
          <ChevronLeft className="w-4 h-4" /> Volta para processos
        </button>
        <div className="text-center p-8 bg-surface-container rounded-3xl">Processo não encontrado no banco de dados.</div>
      </div>
    );
  }

  const tabs = ['Movimentações', 'Documentos', 'Tarefas', 'Notas'];

  return (
    <div className="space-y-8 pb-12">
      <NewProcessModal 
        isOpen={isEditingOpen} 
        onClose={() => setIsEditingOpen(false)} 
        onSuccess={() => {
          setIsEditingOpen(false);
          fetchProcess();
        }}
        editingProcess={process} 
      />
      <button 
        onClick={() => navigate('/processos')}
        className="flex items-center gap-2 text-outline hover:text-secondary transition-colors group"
      >
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-xs font-bold uppercase tracking-widest">Voltar para processos</span>
      </button>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="flex-1 space-y-8 w-full max-w-5xl mx-auto">
          <section className="bg-surface-container-low p-8 rounded-3xl shadow-xl border border-outline-variant/5">
            <div className="flex flex-col md:flex-row justify-between gap-6 mb-8">
              <div className="flex gap-6">
                <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
                  <Gavel className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-headline font-extrabold text-on-surface">{process.number}</h2>
                  <div className="flex flex-wrap gap-3 mt-2">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                      process.status === 'Em Andamento' && "bg-secondary/10 text-secondary border-secondary/20",
                      process.status === 'Urgente' && "bg-error/10 text-error border-error/20",
                      process.status === 'Arquivado' && "bg-primary/10 text-primary border-primary/20"
                    )}>
                      {process.status}
                    </span>
                    {process.area && <span className="px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase tracking-wider border border-outline-variant/10">{process.area}</span>}
                    {process.court && <span className="px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase tracking-wider border border-outline-variant/10">{process.court}</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button 
                  onClick={() => setIsEditingOpen(true)}
                  className="px-4 py-2 bg-surface-container-high text-on-surface text-xs font-bold rounded-xl hover:bg-surface-bright transition-all h-fit border border-outline-variant/10"
                >
                  Editar Processo
                </button>
                <button 
                  onClick={handleDelete}
                  className="px-4 py-2 bg-error/10 text-error hover:bg-error hover:text-white text-xs font-bold rounded-xl transition-all h-fit flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-outline-variant/10">
              <div className="space-y-1">
                <p className="text-[10px] text-outline uppercase tracking-widest font-bold">Cliente Vinculado</p>
                <p className="text-sm font-bold text-on-surface">{process.clients?.name || 'Não informado'}</p>
                <p className="text-xs text-on-surface-variant">{process.clients?.cpf_cnpj}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-outline uppercase tracking-widest font-bold">Partes</p>
                <p className="text-xs text-on-surface"><span className="text-outline font-bold">Autor:</span> {process.autor || '—'}</p>
                <p className="text-xs text-on-surface-variant"><span className="text-outline font-bold">Réu:</span> {process.reu || '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-outline uppercase tracking-widest font-bold">Equipe Responsável</p>
                {process.responsible ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {process.responsible.split(',').map((r: string, i: number) => (
                      <span key={i} className="text-[9px] bg-secondary/10 text-secondary border border-secondary/10 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                        {r.trim()}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-on-surface-variant">—</p>
                )}
              </div>
            </div>
          </section>

          <div className="bg-surface-container-low rounded-3xl overflow-hidden shadow-xl border border-outline-variant/5">
            <div className="flex border-b border-outline-variant/10 overflow-x-auto">
              {tabs.map((tab, i) => (
                <button 
                  key={i}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 whitespace-nowrap px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all hover:bg-surface-container-highest",
                    activeTab === tab ? "text-secondary border-b-2 border-secondary bg-secondary/5" : "text-outline hover:text-on-surface"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
            
            <div className="p-8 min-h-[500px]">
              {activeTab === 'Movimentações' && <MovementTab processId={process.id} />}
              {activeTab === 'Documentos' && <DocumentTab processId={process.id} />}
              {activeTab === 'Tarefas' && <TaskTab processId={process.id} />}
              {activeTab === 'Notas' && <NoteTab processId={process.id} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
