import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, Plus, Edit2, Eye, ChevronLeft, ChevronRight, History, Upload, Mail, Calendar as CalendarIcon, Calculator, TrendingUp, Clock, X, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Client } from '@/types';
import { supabase } from '@/lib/supabase';
import { NewProcessModal, ProcessRow } from '@/components/NewProcessModal';



export function ProcessList() {
  const navigate = useNavigate();
  const [processes, setProcesses] = useState<ProcessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState<ProcessRow | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [recentMovements, setRecentMovements] = useState<any[]>([]);

  async function fetchMovements() {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .not('process_number', 'is', null)
      .neq('process_number', '')
      .order('created_at', { ascending: false })
      .limit(6);
    setRecentMovements(data || []);
  }

  async function fetchProcesses() {
    setLoading(true);
    const { data } = await supabase
      .from('processes')
      .select('*, clients(name, cpf_cnpj)')
      .order('created_at', { ascending: false });
    setProcesses(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchProcesses();
    fetchMovements();
  }, []);

  const activeCount = processes.filter(p => p.status === 'Em Andamento').length;

  const filteredProcesses = filterText.trim()
    ? processes.filter(p => {
        const term = filterText.toLowerCase();
        const clientName = (p.clients?.name || '').toLowerCase();
        const number = p.number.toLowerCase();
        return clientName.includes(term) || number.includes(term);
      })
    : processes;

  return (
    <div className="space-y-8">
      <NewProcessModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProcess(null);
        }}
        onSuccess={() => {
          fetchProcesses();
          fetchMovements();
        }}
        editingProcess={editingProcess}
      />

      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface mb-2">Gestão de Processos</h2>
          <p className="text-on-surface-variant max-w-md">Visualize e gerencie todos os processos ativos e arquivados.</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all",
              showFilters
                ? "bg-secondary/10 text-secondary border-secondary/20"
                : "bg-surface-container-high text-on-surface border-outline-variant/10 hover:bg-surface-bright"
            )}
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filtros Avançados</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-secondary text-on-secondary font-headline font-bold hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-secondary/10"
          >
            <Plus className="w-5 h-5" />
            Novo Processo
          </button>
        </div>
      </section>

      {showFilters && (
        <section className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/10 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
              <input
                type="text"
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
                placeholder="Buscar por nome do cliente ou número do processo..."
                className="w-full bg-surface-container-highest border-none rounded-xl pl-11 pr-10 py-3 text-on-surface focus:ring-2 focus:ring-secondary placeholder:text-outline/50 transition-all font-medium text-sm"
                autoFocus
              />
              {filterText && (
                <button
                  onClick={() => setFilterText('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-surface-container-high rounded-full text-outline hover:text-on-surface transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {filterText && (
              <span className="text-xs text-on-surface-variant whitespace-nowrap">
                {filteredProcesses.length} resultado{filteredProcesses.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 md:col-span-2 bg-surface-container-low p-6 rounded-2xl border-l-4 border-secondary flex flex-col justify-between">
          <span className="text-outline text-xs uppercase tracking-widest font-semibold">Total de Processos</span>
          <div className="mt-4">
            <h3 className="text-5xl font-headline font-black text-on-surface">{processes.length}</h3>
            <p className="text-secondary text-sm font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              {activeCount} em andamento
            </p>
          </div>
        </div>
        <div className="bg-surface-container-low p-6 rounded-2xl flex flex-col justify-between border border-outline-variant/5">
          <span className="text-outline text-xs uppercase tracking-widest font-semibold">Arquivados</span>
          <div className="mt-4">
            <h3 className="text-3xl font-headline font-bold text-on-surface">{processes.filter(p => p.status === 'Arquivado').length}</h3>
            <p className="text-on-surface-variant text-sm mt-1">Processos encerrados</p>
          </div>
        </div>
      </section>

      <section className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-secondary" />
            </div>
          ) : processes.length === 0 ? (
            <div className="p-16 text-center">
              <p className="text-on-surface-variant font-medium mb-2">Nenhum processo cadastrado.</p>
              <button onClick={() => setIsModalOpen(true)} className="text-secondary font-bold hover:underline">
                Cadastrar o primeiro processo
              </button>
            </div>
          ) : filteredProcesses.length === 0 ? (
            <div className="p-16 text-center">
              <Search className="w-10 h-10 text-outline mx-auto mb-3" />
              <p className="text-on-surface-variant font-medium">Nenhum processo encontrado para "{filterText}"</p>
              <button onClick={() => setFilterText('')} className="mt-2 text-secondary font-bold hover:underline text-sm">Limpar filtro</button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50">
                  <th className="px-8 py-5 text-xs uppercase tracking-widest text-outline font-bold">Número do Processo</th>
                  <th className="px-6 py-5 text-xs uppercase tracking-widest text-outline font-bold">Cliente</th>
                  <th className="px-6 py-5 text-xs uppercase tracking-widest text-outline font-bold">Partes</th>
                  <th className="px-6 py-5 text-xs uppercase tracking-widest text-outline font-bold">Status</th>
                  <th className="px-6 py-5 text-xs uppercase tracking-widest text-outline font-bold text-center">Data</th>
                  <th className="px-8 py-5 text-xs uppercase tracking-widest text-outline font-bold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {filteredProcesses.map((proc) => (
                  <tr key={proc.id} className="hover:bg-surface-bright/20 transition-colors group">
                    <td className="px-8 py-6">
                      <span className="font-headline font-bold text-secondary block">{proc.number}</span>
                      <span className="text-[10px] text-outline uppercase tracking-tight">
                        {[proc.court, proc.comarca, proc.vara].filter(Boolean).join(' · ')}
                        {proc.area && ` · ${proc.area}`}
                      </span>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-[10px] font-bold text-primary">
                          {(proc.clients?.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-on-surface">{proc.clients?.name || '—'}</p>
                          <p className="text-[11px] text-outline">{proc.clients?.cpf_cnpj || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="space-y-2">
                        <div>
                          {proc.autor && (
                            <p className="text-xs text-on-surface">
                              <span className="text-[10px] text-outline font-bold">Autor: </span>{proc.autor}
                            </p>
                          )}
                          {proc.reu && (
                            <p className="text-xs text-on-surface-variant">
                              <span className="text-[10px] text-outline font-bold">Réu: </span>{proc.reu}
                            </p>
                          )}
                          {!proc.autor && !proc.reu && <span className="text-xs text-outline">—</span>}
                        </div>
                        {proc.responsible && (
                          <div className="flex flex-wrap gap-1">
                            {proc.responsible.split(',').map((r, i) => (
                              <span key={i} className="text-[9px] bg-secondary/10 text-secondary border border-secondary/10 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                                {r.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                        proc.status === 'Em Andamento' && "bg-secondary/10 text-secondary border-secondary/20",
                        proc.status === 'Urgente' && "bg-error/10 text-error border-error/20",
                        proc.status === 'Arquivado' && "bg-primary/10 text-primary border-primary/20"
                      )}>
                        {proc.status}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-center text-sm text-on-surface-variant">
                      {proc.created_at ? new Date(proc.created_at).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setEditingProcess(proc);
                            setIsModalOpen(true);
                          }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-secondary hover:bg-secondary/10 transition-all">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/processos/${proc.id}`)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-high transition-all"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h4 className="text-lg font-headline font-bold text-on-surface flex items-center gap-2">
            <History className="w-5 h-5 text-secondary" />
            Movimentações Recentes
          </h4>
          <div className="bg-surface-container-low/40 rounded-2xl p-6 relative overflow-hidden min-h-[120px]">
            <div className="absolute left-9 top-6 bottom-6 w-[1px] bg-outline-variant/20"></div>
            {recentMovements.length > 0 ? (
              <div className="space-y-6">
                {recentMovements.map((mov, i) => {
                  const isCompleted = mov.status === 'Concluída';
                  return (
                    <div key={mov.id} className="flex gap-6 relative group z-10">
                      <div className={cn(
                        "w-6 h-6 rounded-full ring-4 ring-surface flex items-center justify-center border transition-colors shrink-0",
                         i === 0 
                           ? "bg-secondary border-transparent text-on-secondary" 
                           : isCompleted 
                             ? "bg-emerald-500 border-transparent text-white" 
                             : "bg-surface-container-high border-outline-variant/30 text-secondary"
                      )}>
                        {i === 0 ? <div className="w-2 h-2 bg-on-secondary rounded-full"></div> : <Clock className="w-3 h-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] uppercase tracking-widest text-outline font-bold">
                          {new Date(mov.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <p className={cn(
                          "text-sm font-semibold mt-1",
                          isCompleted ? "text-on-surface-variant line-through" : "text-on-surface"
                        )}>
                          {mov.description}
                        </p>
                        <p className="text-xs text-on-surface-variant font-medium mt-0.5 border-l-2 border-secondary/30 pl-2">
                          {mov.task_type && <span className="mr-1 border bg-secondary/10 text-secondary border-secondary/20 px-1 rounded">[{mov.task_type}]</span>}
                          Processo: {mov.process_number}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 flex flex-col items-center justify-center relative z-10">
                <Clock className="w-8 h-8 text-outline mb-2" />
                <p className="text-sm font-medium text-on-surface-variant">Nenhuma movimentação associada aos processos.</p>
                <p className="text-xs text-outline mt-1">As tarefas cadastradas com números de processo aparecerão aqui.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-lg font-headline font-bold text-on-surface flex items-center gap-2">
            <Plus className="w-5 h-5 text-secondary" />
            Ações Rápidas
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Upload, label: 'Subir Documento' },
              { icon: Mail, label: 'Notificar Cliente' },
              { icon: CalendarIcon, label: 'Novo Prazo' },
              { icon: Calculator, label: 'Calcular Custas' }
            ].map((action, i) => (
              <button key={i} className="p-4 rounded-2xl bg-surface-container hover:bg-surface-bright transition-all border border-outline-variant/5 text-center group">
                <action.icon className="w-5 h-5 text-secondary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <span className="block text-xs font-bold text-on-surface">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
