import React, { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, Filter, SortAsc, Mail, Phone, Scale, ChevronRight, Edit2, Share2, TrendingUp, X, Loader2, UserX, UserCheck, Trash2, MapPin, User, PlusCircle, Search } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import { Client } from '@/types';
import { supabase } from '@/lib/supabase';

type ProcessEntry = { number: string; court: string; responsible: string; type: string };
const emptyProcess = (): ProcessEntry => ({ number: '', court: '', responsible: '', type: '' });

function ProcessForm({ proc, index, onChange, onRemove, showRemove }: {
  key?: React.Key;
  proc: ProcessEntry; index: number;
  onChange: (index: number, field: keyof ProcessEntry, value: string) => void;
  onRemove: (index: number) => void;
  showRemove: boolean;
}) {
  return (
    <div className="p-4 bg-surface-container-highest/20 rounded-2xl border border-outline-variant/10 space-y-3 relative">
      {showRemove && (
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="absolute top-3 right-3 p-1 text-outline hover:text-error hover:bg-error/10 rounded-lg transition-all"
          title="Remover processo"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Processo {index + 1}</p>
      <div className="space-y-1">
        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Número do Processo</label>
        <input
          type="text"
          value={proc.number}
          onChange={e => onChange(index, 'number', e.target.value)}
          className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary placeholder:text-outline/50 transition-all font-medium"
          placeholder="0000000-00.0000.0.00.0000"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Local / Comarca</label>
          <input
            type="text"
            value={proc.court}
            onChange={e => onChange(index, 'court', e.target.value)}
            className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary placeholder:text-outline/50 transition-all font-medium"
            placeholder="TJSP, TRF3..."
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Responsáveis</label>
          <input
            type="text"
            value={proc.responsible}
            onChange={e => onChange(index, 'responsible', e.target.value)}
            className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary placeholder:text-outline/50 transition-all font-medium"
            placeholder="Nome do responsável"
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tipo de Processo</label>
        <select
          value={proc.type}
          onChange={e => onChange(index, 'type', e.target.value)}
          className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary transition-all font-medium appearance-none"
        >
          <option value="">Selecione o tipo</option>
          <option value="Penal">Penal</option>
          <option value="Civil">Civil</option>
          <option value="Previdenciário">Previdenciário</option>
          <option value="Administrativo">Administrativo</option>
          <option value="Contencioso">Contencioso</option>
        </select>
      </div>
    </div>
  );
}

function NewClientModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({ name: '', cpf_cnpj: '', email: '', phone: '' });
  const [processes, setProcesses] = useState<ProcessEntry[]>([emptyProcess()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  function handleProcessChange(index: number, field: keyof ProcessEntry, value: string) {
    setProcesses(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  }

  function addProcess() {
    setProcesses(prev => [...prev, emptyProcess()]);
  }

  function removeProcess(index: number) {
    setProcesses(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão inválida. Faça login novamente.');

      const validProcesses = processes.filter(p => p.number.trim() !== '');

      const { data: clientData, error: insertError } = await supabase.from('clients').insert([{
        user_id: user.id,
        name: formData.name,
        cpf_cnpj: formData.cpf_cnpj,
        email: formData.email,
        phone: formData.phone,
        status: 'Ativo',
        process_count: validProcesses.length
      }]).select().single();

      if (insertError) throw insertError;

      if (validProcesses.length > 0 && clientData) {
        await supabase.from('processes').insert(
          validProcesses.map(p => ({
            user_id: user.id,
            client_id: clientData.id,
            number: p.number,
            court: p.court || null,
            responsible: p.responsible || null,
            area: p.type || null,
            status: 'Em Andamento'
          }))
        );
      }

      onSuccess();
      onClose();
      setFormData({ name: '', cpf_cnpj: '', email: '', phone: '' });
      setProcesses([emptyProcess()]);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar cliente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-surface/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-surface-container w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-outline-variant/20 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low shrink-0">
          <div>
            <h3 className="font-headline font-bold text-xl text-on-surface">Novo Cliente</h3>
            <p className="text-xs text-on-surface-variant mt-1">Cadastre o cliente e vincule um ou mais processos</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-high rounded-full text-on-surface-variant transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-4 bg-error/10 text-error rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          {/* Dados do cliente */}
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Dados Pessoais</p>
          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Nome Completo</label>
            <input 
              required
              type="text" 
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary placeholder:text-outline/50 transition-all font-medium"
              placeholder="Digite o nome completo"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">CPF/CNPJ</label>
              <input 
                type="text" 
                value={formData.cpf_cnpj}
                onChange={e => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary placeholder:text-outline/50 transition-all font-medium"
                placeholder="000.000.000-00"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Telefone</label>
              <input 
                type="text" 
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary placeholder:text-outline/50 transition-all font-medium"
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">E-mail</label>
            <input 
              type="email" 
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary placeholder:text-outline/50 transition-all font-medium"
              placeholder="email@exemplo.com"
            />
          </div>

          {/* Processos */}
          <div className="pt-4 border-t border-outline-variant/10">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Processos (Opcional)</p>
              <button
                type="button"
                onClick={addProcess}
                className="flex items-center gap-1.5 text-xs font-bold text-secondary hover:text-secondary/70 transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                Adicionar Processo
              </button>
            </div>
            <div className="space-y-4">
              {processes.map((proc, idx) => (
                <ProcessForm
                  key={idx}
                  proc={proc}
                  index={idx}
                  onChange={handleProcessChange}
                  onRemove={removeProcess}
                  showRemove={processes.length > 1}
                />
              ))}
            </div>
          </div>
          
          <div className="pt-4 flex justify-end gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-3 font-bold text-on-surface-variant hover:bg-surface-container-highest rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-secondary text-on-secondary font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar Cliente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ClientProcesses({ clientId, userRole }: { clientId: string; userRole: string | null }) {
  const [processes, setProcesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = userRole === 'Administrador';

  async function fetchProcesses() {
    setLoading(true);

    // 1. Processos onde este cliente é o "Principal" (client_id direto)
    const { data: directProcesses } = await supabase
      .from('processes')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    // 2. Processos vinculados posteriormente via process_clients
    const { data: linkedProcesses } = await supabase
      .from('processes')
      .select('*, process_clients!inner(client_id, role)')
      .eq('process_clients.client_id', clientId);

    // 3. Mescla removendo duplicatas por id
    const allProcesses = [...(directProcesses || [])];
    if (linkedProcesses) {
      for (const lp of linkedProcesses) {
        const { process_clients, ...processData } = lp;
        if (!allProcesses.some(p => p.id === processData.id)) {
          allProcesses.push(processData);
        }
      }
    }

    // 4. Ordena por data de criação (mais recentes primeiro)
    allProcesses.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setProcesses(allProcesses);
    setLoading(false);
  }

  useEffect(() => {
    fetchProcesses();
  }, [clientId]);

  async function handleDeleteProcess(id: string) {
    const isAdmin = userRole === 'Administrador' || userRole === 'Advogado com Controladoria';
    if (!isAdmin) {
      alert('Apenas administradores podem excluir processos.');
      return;
    }
    if (window.confirm('Tem certeza que deseja excluir este processo? Essa ação não pode ser desfeita e todas as tarefas e movimentações serão excluídas permanentemente.')) {
      try {
        await supabase.from('tasks').delete().eq('process_id', id);
        await supabase.from('process_movements').delete().eq('process_id', id);
        await supabase.from('process_clients').delete().eq('process_id', id);
        await supabase.from('process_documents').delete().eq('process_id', id);
        await supabase.from('process_notes').delete().eq('process_id', id);
        await supabase.from('hearings').delete().eq('process_id', id);

        const { error } = await supabase.from('processes').delete().eq('id', id);
        if (error) throw error;
        fetchProcesses();
      } catch (err: any) {
        alert("Erro ao excluir processo: " + (err.message || "Erro desconhecido"));
      }
    }
  }

  return (
    <div>
      <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-3">Processos Vinculados</p>
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-secondary" />
        </div>
      ) : processes.length === 0 ? (
        <p className="text-sm text-on-surface-variant italic">Nenhum processo vinculado.</p>
      ) : (
        <div className="space-y-3">
          {processes.map(proc => (
            <div key={proc.id} className="p-3 bg-surface-container-highest/30 rounded-xl border border-outline-variant/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
                  <Scale className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-on-surface truncate">{proc.number}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {proc.court && (
                      <span className="flex items-center gap-1 text-[10px] text-on-surface-variant font-medium">
                        <MapPin className="w-3 h-3 text-secondary/70" /> {proc.court}
                      </span>
                    )}
                    {proc.area && (
                      <span className="flex items-center gap-1 text-[10px] text-on-surface-variant font-medium">
                        <Scale className="w-3 h-3 text-secondary/70" /> {proc.area}
                      </span>
                    )}
                    {proc.responsible && (
                      <span className="flex items-center gap-1 text-[10px] text-on-surface-variant font-medium">
                        <User className="w-3 h-3 text-secondary/70" /> {proc.responsible}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full bg-secondary/10 text-secondary whitespace-nowrap">
                    {proc.status}
                  </span>
                  {isAdmin && (
                    <button 
                      onClick={() => handleDeleteProcess(proc.id)}
                      className="p-1.5 text-outline hover:text-error hover:bg-error/10 rounded-md transition-all"
                      title="Excluir Processo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EditClientModal({ isOpen, onClose, onSuccess, client }: { isOpen: boolean; onClose: () => void; onSuccess: () => void; client: Client }) {
  const [formData, setFormData] = useState({
    name: client.name, cpf_cnpj: client.cpf_cnpj, email: client.email, phone: client.phone,
  });
  const [newProcesses, setNewProcesses] = useState<ProcessEntry[]>([emptyProcess()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setFormData({ name: client.name, cpf_cnpj: client.cpf_cnpj, email: client.email, phone: client.phone });
    setNewProcesses([emptyProcess()]);
  }, [client]);

  if (!isOpen) return null;

  function handleProcessChange(index: number, field: keyof ProcessEntry, value: string) {
    setNewProcesses(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  }

  function addProcess() {
    setNewProcesses(prev => [...prev, emptyProcess()]);
  }

  function removeProcess(index: number) {
    setNewProcesses(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const { error: updateError } = await supabase
        .from('clients')
        .update({ name: formData.name, cpf_cnpj: formData.cpf_cnpj, email: formData.email, phone: formData.phone })
        .eq('id', client.id);
      if (updateError) throw updateError;

      const validProcesses = newProcesses.filter(p => p.number.trim() !== '');

      if (validProcesses.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('processes').insert(
            validProcesses.map(p => ({
              user_id: user.id,
              client_id: client.id,
              number: p.number,
              court: p.court || null,
              responsible: p.responsible || null,
              area: p.type || null,
              status: 'Em Andamento'
            }))
          );
          // Conta processos diretos (client_id) + vinculados (process_clients), sem duplicatas
          const { count: directCount } = await supabase.from('processes').select('*', { count: 'exact', head: true }).eq('client_id', client.id);
          const { count: linkedCount } = await supabase.from('process_clients').select('*', { count: 'exact', head: true }).eq('client_id', client.id);
          // A contagem total é a union — process_clients já inclui todos (diretos e secundários)
          // Usa process_clients como fonte principal de contagem pois é onde todos ficam registrados
          const totalCount = linkedCount || directCount || 0;
          await supabase.from('clients').update({ process_count: totalCount }).eq('id', client.id);
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar cliente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-surface/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-surface-container w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-outline-variant/20 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low shrink-0">
          <div>
            <h3 className="font-headline font-bold text-xl text-on-surface">Editar Cliente</h3>
            <p className="text-xs text-on-surface-variant mt-1">Atualize os dados do cliente ou adicione novos processos</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-high rounded-full text-on-surface-variant transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && <div className="p-4 bg-error/10 text-error rounded-xl text-sm font-medium">{error}</div>}

          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Dados Pessoais</p>
          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Nome Completo</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary font-medium" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">CPF/CNPJ</label>
              <input type="text" value={formData.cpf_cnpj} onChange={e => setFormData({ ...formData, cpf_cnpj: e.target.value })} className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary font-medium" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Telefone</label>
              <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary font-medium" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">E-mail</label>
            <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary font-medium" />
          </div>

          {/* Adicionar novos processos */}
          <div className="pt-4 border-t border-outline-variant/10">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Adicionar Novos Processos</p>
              <button
                type="button"
                onClick={addProcess}
                className="flex items-center gap-1.5 text-xs font-bold text-secondary hover:text-secondary/70 transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                Adicionar Processo
              </button>
            </div>
            <div className="space-y-4">
              {newProcesses.map((proc, idx) => (
                <ProcessForm
                  key={idx}
                  proc={proc}
                  index={idx}
                  onChange={handleProcessChange}
                  onRemove={removeProcess}
                  showRemove={newProcesses.length > 1}
                />
              ))}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-3 font-bold text-on-surface-variant hover:bg-surface-container-highest rounded-xl transition-all">Cancelar</button>
            <button type="submit" disabled={submitting} className="px-6 py-3 bg-secondary text-on-secondary font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteClientModal({ isOpen, onClose, onConfirm, clientName, deleting }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; clientName: string; deleting: boolean }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-surface/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-surface-container w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-outline-variant/20 animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="w-12 h-12 rounded-2xl bg-error/10 flex items-center justify-center mb-4">
            <Trash2 className="w-6 h-6 text-error" />
          </div>
          <h3 className="font-headline font-bold text-xl text-on-surface mb-2">Excluir Cliente</h3>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Tem certeza que deseja excluir o cadastro de <span className="font-bold text-on-surface">{clientName}</span>? Essa ação não pode ser desfeita.
          </p>
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              disabled={deleting}
              className="flex-1 px-4 py-3 font-bold text-on-surface-variant hover:bg-surface-container-highest rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={deleting}
              className="flex-1 px-4 py-3 bg-error text-white font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ClientManagement() {
  const PAGE_SIZE = 25;
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebounce(searchText, 350);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);

  async function fetchCounts() {
    const [total, active, inactive] = await Promise.all([
      supabase.from('clients').select('id', { count: 'exact', head: true }),
      supabase.from('clients').select('id', { count: 'exact', head: true }).eq('status', 'Ativo'),
      supabase.from('clients').select('id', { count: 'exact', head: true }).eq('status', 'Inativo'),
    ]);
    setTotalCount(total.count ?? 0);
    setActiveCount(active.count ?? 0);
    setInactiveCount(inactive.count ?? 0);
  }

  const fetchClients = useCallback(async (reset = true) => {
    if (reset) {
      setLoading(true);
      setPage(0);
    } else {
      setLoadingMore(true);
    }

    const currentPage = reset ? 0 : page + 1;
    const from = currentPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from('clients')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (debouncedSearch.trim()) {
      query = query.ilike('name', `%${debouncedSearch.trim()}%`);
    }

    const { data, count } = await query;

    if (reset) {
      setClients(data || []);
      setPage(0);
      // Auto-select first on fresh load
      if (data && data.length > 0 && !selectedClient) {
        setSelectedClient(data[0]);
      } else if (selectedClient && data) {
        const updated = data.find(c => c.id === selectedClient.id);
        if (updated) setSelectedClient(updated);
      }
    } else {
      setClients(prev => [...prev, ...(data || [])]);
      setPage(currentPage);
    }

    const loaded = reset ? (data?.length ?? 0) : clients.length + (data?.length ?? 0);
    setHasMore(loaded < (count ?? 0));

    setLoading(false);
    setLoadingMore(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, page, clients.length]);

  // Refetch when search changes
  useEffect(() => {
    fetchClients(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    fetchCounts();
    async function fetchUserRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (profileData) {
          setUserRole(profileData.role);
        }
      }
    }
    fetchUserRole();
  }, []);

  const activeClients = activeCount;
  const inactiveClients = inactiveCount;

  async function toggleClientStatus(clientId: string, currentStatus: string) {
    const newStatus = currentStatus === 'Ativo' ? 'Inativo' : 'Ativo';
    await supabase.from('clients').update({ status: newStatus }).eq('id', clientId);
    fetchClients(true);
    fetchCounts();
  }

  async function handleDeleteClient() {
    if (!selectedClient) return;
    if (userRole !== 'Administrador') {
      alert('Apenas administradores podem excluir clientes.');
      return;
    }
    setDeleting(true);
    try {
      await supabase.from('clients').delete().eq('id', selectedClient.id);
      setIsDeleteModalOpen(false);
      setSelectedClient(null);
      fetchClients(true);
      fetchCounts();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8">
      <NewClientModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => { fetchClients(true); fetchCounts(); }} 
      />
      {selectedClient && (
        <EditClientModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => { fetchClients(true); fetchCounts(); }}
          client={selectedClient}
        />
      )}
      {selectedClient && (
        <DeleteClientModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteClient}
          clientName={selectedClient.name}
          deleting={deleting}
        />
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="text-secondary font-headline text-xs font-bold tracking-[0.2em] uppercase mb-2 block">Gestão de Portfólio</span>
          <h2 className="text-4xl font-headline font-extrabold text-on-surface tracking-tighter">Clientes</h2>
          <p className="text-on-surface-variant mt-2 max-w-md">Gerencie os relacionamentos e históricos processuais dos seus constituintes com precisão e elegância.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-secondary text-on-secondary px-6 py-3 rounded-xl font-headline font-bold flex items-center gap-2 hover:opacity-90 transition-all duration-200"
        >
          <UserPlus className="w-5 h-5" />
          Novo Cliente
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-4 bg-surface-container-low p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 scale-150 group-hover:scale-125 transition-transform duration-500">
            <Users className="text-8xl text-secondary" />
          </div>
          <p className="text-on-surface-variant text-sm mb-1">Total de Clientes</p>
          <h3 className="text-4xl font-headline font-extrabold text-on-surface">{totalCount}</h3>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-400">
            <TrendingUp className="w-4 h-4" />
            <span>Atualizado agora</span>
          </div>
        </div>
        <div className="col-span-12 md:col-span-8 bg-surface-container p-6 rounded-2xl flex items-center justify-between">
          <div className="flex flex-wrap gap-8">
            <div>
              <p className="text-on-surface-variant text-xs mb-1 uppercase tracking-wider">Ativos</p>
              <p className="text-2xl font-headline font-bold text-secondary">{activeClients}</p>
            </div>
            <div className="w-px h-10 bg-outline-variant/20 self-center"></div>
            <div>
              <p className="text-on-surface-variant text-xs mb-1 uppercase tracking-wider">Inativos</p>
              <p className="text-2xl font-headline font-bold text-on-surface-variant">{inactiveClients}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8 items-start">
        <div className="col-span-12 lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-headline font-bold text-lg text-on-surface">Clientes</h4>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Buscar cliente por nome..."
              className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl pl-11 pr-10 py-3 text-on-surface focus:ring-2 focus:ring-secondary focus:border-secondary placeholder:text-outline/50 transition-all font-medium text-sm"
            />
            {searchText && (
              <button
                onClick={() => setSearchText('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-surface-container-high rounded-full text-outline hover:text-on-surface transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-secondary" />
              <p className="text-sm text-on-surface-variant">Carregando clientes...</p>
            </div>
          ) : clients.length === 0 ? (
            <div className="p-12 text-center bg-surface-container-low rounded-2xl border border-outline-variant/10">
              <Users className="w-12 h-12 text-outline mx-auto mb-4" />
              {searchText ? (
                <>
                  <p className="text-on-surface-variant font-medium">Nenhum cliente encontrado para "{searchText}"</p>
                  <button onClick={() => setSearchText('')} className="mt-3 text-secondary font-bold hover:underline text-sm">Limpar busca</button>
                </>
              ) : (
                <>
                  <p className="text-on-surface-variant font-medium">Nenhum cliente cadastrado ainda.</p>
                  <button onClick={() => setIsModalOpen(true)} className="mt-4 text-secondary font-bold hover:underline">Cadastrar o primeiro</button>
                </>
              )}
            </div>
          ) : (
            <>
              {clients.map((client) => (
                <div 
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className={cn(
                    "p-5 rounded-2xl flex items-center gap-4 cursor-pointer transition-all duration-200 relative group",
                    selectedClient?.id === client.id 
                      ? "bg-surface-container-high ring-1 ring-secondary/30" 
                      : "bg-surface-container-low hover:bg-surface-container-high"
                  )}
                >
                  {selectedClient?.id === client.id && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-secondary rounded-r-full"></div>
                  )}
                  {client.avatar ? (
                    <img 
                      src={client.avatar} 
                      alt={client.name} 
                      className={cn(
                        "w-12 h-12 rounded-xl object-cover transition-all duration-300",
                        selectedClient?.id !== client.id && "grayscale group-hover:grayscale-0"
                      )}
                    />
                  ) : (
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg transition-all duration-300",
                      selectedClient?.id === client.id ? "bg-secondary text-on-secondary" : "bg-surface-container-highest text-on-surface-variant group-hover:bg-secondary/20 group-hover:text-secondary"
                    )}>
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <h5 className="font-headline font-bold text-on-surface">{client.name}</h5>
                    <p className="text-xs text-on-surface-variant">CPF/CNPJ: {client.cpf_cnpj} • Cadastrado em {new Date(client.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      "px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full",
                      client.status === 'Ativo' && "bg-secondary/10 text-secondary",
                      client.status === 'Inativo' && "bg-error/10 text-error"
                    )}>
                      {client.status}
                    </span>
                    <p className="text-xs text-on-surface-variant mt-1">{client.process_count} Processos</p>
                  </div>
                </div>
              ))}

              {/* Load more */}
              {hasMore && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => fetchClients(false)}
                    disabled={loadingMore}
                    className="px-6 py-2.5 rounded-xl bg-surface-container-high text-on-surface font-semibold hover:bg-secondary/10 hover:text-secondary transition-all text-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {loadingMore ? 'Carregando...' : 'Carregar mais clientes'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="col-span-12 lg:col-span-5">
          {selectedClient ? (
            <div className="bg-surface-container-low rounded-3xl overflow-hidden shadow-2xl sticky top-24 border border-outline-variant/5">
              <div className="relative h-32 bg-gradient-to-br from-surface-container-highest to-surface-container-low overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                  <img 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCD-AIKradJLqY7vS3WG7GEE_eCJMo9gxu_mZz0u2B8NicgBDm3s5RQNARl9j0xozwrV2CfMw1JyCFGxr5fYaB0OqMJnEoPXiGJ2WUvJ-4pkAOtmoPSdSCpz9xdNG8SLiiUi8DSPkP0Oo1iBM8M_vkiW1g0hJQWrDx_wFF1OeTSFeFVPuHv1n7W5MpZC8GWNEGUnNNZnYrVGSck34oMwiHbWSMElJQV9PQPooTQnAtUCGV9y6rloZwdxO0DLJcVW2hLEEvTNV7jtn-q" 
                    alt="Law Background" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="px-8 pb-8 -mt-12 relative">
                <div className="mb-6 flex items-end justify-between">
                  {selectedClient.avatar ? (
                    <img 
                      src={selectedClient.avatar} 
                      alt={selectedClient.name} 
                      className="w-24 h-24 rounded-2xl object-cover border-4 border-surface-container-low shadow-lg bg-surface-container"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl border-4 border-surface-container-low shadow-lg bg-surface-container-high flex items-center justify-center">
                      <span className="text-4xl font-headline font-bold text-secondary">{selectedClient.name.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditModalOpen(true)}
                      className="p-2 bg-surface-container-highest rounded-lg text-secondary hover:bg-secondary hover:text-on-secondary transition-all" title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleClientStatus(selectedClient.id, selectedClient.status)}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        selectedClient.status === 'Ativo'
                          ? "bg-error/10 text-error hover:bg-error hover:text-white"
                          : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white"
                      )}
                      title={selectedClient.status === 'Ativo' ? 'Encerrar Contrato' : 'Reativar Cliente'}
                    >
                      {selectedClient.status === 'Ativo' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                    {userRole === 'Administrador' && (
                      <button
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="p-2 bg-error/10 rounded-lg text-error hover:bg-error hover:text-white transition-all"
                        title="Excluir Cadastro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-2xl font-headline font-extrabold text-on-surface leading-tight">{selectedClient.name}</h3>
                  <p className="text-on-surface-variant flex items-center gap-2 mt-1">
                    <Mail className="w-4 h-4" />
                    {selectedClient.email}
                  </p>
                </div>

                <div className="flex gap-6 border-b border-outline-variant/10 mb-6">
                  <button className="pb-3 border-b-2 border-secondary text-secondary text-xs font-bold uppercase tracking-widest">Informações</button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-surface-container-lowest rounded-xl">
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">CPF/CNPJ</p>
                      <p className="text-sm font-medium">{selectedClient.cpf_cnpj}</p>
                    </div>
                    <div className="p-3 bg-surface-container-lowest rounded-xl">
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">Telefone</p>
                      <p className="text-sm font-medium">{selectedClient.phone}</p>
                    </div>
                  </div>

                  <ClientProcesses clientId={selectedClient.id} userRole={userRole} />
                </div>

                <button
                  onClick={() => toggleClientStatus(selectedClient.id, selectedClient.status)}
                  className={cn(
                    "w-full mt-8 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2",
                    selectedClient.status === 'Ativo'
                      ? "bg-error/10 text-error hover:bg-error/20"
                      : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                  )}
                >
                  {selectedClient.status === 'Ativo' ? (
                    <><UserX className="w-4 h-4" /> Encerrar Contrato</>
                  ) : (
                    <><UserCheck className="w-4 h-4" /> Reativar Cliente</>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex items-center justify-center bg-surface-container-low rounded-3xl border border-outline-variant/10">
              <p className="text-on-surface-variant">Selecione um cliente para ver detalhes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
