import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Loader2, ChevronDown, Search, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Client, PROCESS_CLIENT_ROLES } from '@/types';

export interface ProcessRow {
  id: string;
  number: string;
  court: string;
  comarca: string | null;
  vara: string | null;
  autor: string | null;
  reu: string | null;
  area: string | null;
  type: string | null;
  status: string;
  created_at?: string;
  client_id: string;
  responsible?: string | null;
  clients?: { name: string; cpf_cnpj: string } | null;
  process_clients?: { role: string; clients: { name: string; cpf_cnpj: string } | null }[];
}

interface SelectedClient {
  id: string;
  name: string;
  cpf_cnpj: string;
  role: string;
}

export function NewProcessModal({ isOpen, onClose, onSuccess, editingProcess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void; editingProcess?: ProcessRow | null | any }) {
  const [formData, setFormData] = useState({
    number: '',
    court: '',
    comarca: '',
    vara: '',
    autor: '',
    reu: '',
    area: '',
    type: '',
    responsible: '',
    status: 'Em Andamento',
  });

  const [selectedClients, setSelectedClients] = useState<SelectedClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Client search dropdown
  const [clientSearch, setClientSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredClients = clients.filter(c => {
    const term = clientSearch.toLowerCase();
    const alreadySelected = selectedClients.some(sc => sc.id === c.id);
    return !alreadySelected && (c.name.toLowerCase().includes(term) || c.cpf_cnpj.includes(term));
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setLoadingClients(true);
      supabase.from('clients').select('*').eq('status', 'Ativo').order('name').then(({ data }) => {
        setClients(data || []);
        setLoadingClients(false);
      });

      supabase.from('profiles').select('id, name, role').order('name').then(({ data }) => {
        setProfiles(data || []);
      });

      if (editingProcess) {
        setFormData({
          number: editingProcess.number || '',
          court: editingProcess.court || '',
          comarca: editingProcess.comarca || '',
          vara: editingProcess.vara || '',
          autor: editingProcess.autor || '',
          reu: editingProcess.reu || '',
          area: editingProcess.area || '',
          type: editingProcess.type || '',
          responsible: editingProcess.responsible || '',
          status: editingProcess.status || 'Em Andamento',
        });

        // Load existing linked clients from process_clients
        if (editingProcess.process_clients && editingProcess.process_clients.length > 0) {
          const loaded: SelectedClient[] = editingProcess.process_clients
            .filter((pc: any) => pc.clients)
            .map((pc: any) => ({
              id: pc.client_id || '',
              name: pc.clients?.name || '',
              cpf_cnpj: pc.clients?.cpf_cnpj || '',
              role: pc.role || 'Principal',
            }));
          setSelectedClients(loaded);
        } else if (editingProcess.client_id && editingProcess.clients) {
          // Fallback: migrate from legacy client_id
          setSelectedClients([{
            id: editingProcess.client_id,
            name: editingProcess.clients.name || '',
            cpf_cnpj: editingProcess.clients.cpf_cnpj || '',
            role: 'Principal',
          }]);
        } else {
          setSelectedClients([]);
        }
      } else {
        setFormData({ number: '', court: '', comarca: '', vara: '', autor: '', reu: '', area: '', type: '', responsible: '', status: 'Em Andamento' });
        setSelectedClients([]);
      }
      setClientSearch('');
      setDropdownOpen(false);
    }
  }, [isOpen, editingProcess]);

  if (!isOpen) return null;

  function addClient(client: Client) {
    setSelectedClients(prev => [
      ...prev,
      { id: client.id, name: client.name, cpf_cnpj: client.cpf_cnpj, role: prev.length === 0 ? 'Principal' : 'Interveniente' },
    ]);
    setClientSearch('');
    setDropdownOpen(false);
  }

  function removeClient(id: string) {
    setSelectedClients(prev => prev.filter(c => c.id !== id));
  }

  function changeClientRole(id: string, role: string) {
    setSelectedClients(prev => prev.map(c => c.id === id ? { ...c, role } : c));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão inválida. Faça login novamente.');

      if (selectedClients.length === 0) throw new Error('Vincule ao menos um cliente ao processo.');
      if (!formData.number) throw new Error('Informe o número do processo.');

      // The "Principal" client (or first selected) stays in client_id for backward compatibility
      const primaryClient = selectedClients.find(c => c.role === 'Principal') || selectedClients[0];

      const payload = {
        user_id: user.id,
        client_id: primaryClient.id,
        number: formData.number,
        court: formData.court || null,
        comarca: formData.comarca || null,
        vara: formData.vara || null,
        autor: formData.autor || null,
        reu: formData.reu || null,
        area: formData.area || null,
        type: formData.type || null,
        responsible: formData.responsible || null,
        status: formData.status,
      };

      let processId: string;

      if (editingProcess) {
        const { error: updateError } = await supabase.from('processes').update(payload).eq('id', editingProcess.id);
        if (updateError) throw updateError;
        processId = editingProcess.id;
      } else {
        const { data: insertData, error: insertError } = await supabase.from('processes').insert([payload]).select().single();
        if (insertError) throw insertError;
        processId = insertData.id;
      }

      // Sync process_clients: delete all existing, then re-insert
      await supabase.from('process_clients').delete().eq('process_id', processId);

      const pcRows = selectedClients.map(c => ({
        process_id: processId,
        client_id: c.id,
        role: c.role,
      }));
      const { error: pcError } = await supabase.from('process_clients').insert(pcRows);
      if (pcError) throw pcError;

      // Update process_count for all involved clients
      for (const c of selectedClients) {
        const { count } = await supabase
          .from('process_clients')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', c.id);
        await supabase.from('clients').update({ process_count: count || 0 }).eq('id', c.id);
      }

      onSuccess();
      onClose();
      setFormData({ number: '', court: '', comarca: '', vara: '', autor: '', reu: '', area: '', type: '', responsible: '', status: 'Em Andamento' });
      setSelectedClients([]);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar processo.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = "w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary placeholder:text-outline/50 transition-all font-medium";
  const labelCls = "text-xs font-bold text-on-surface-variant uppercase tracking-wider";

  const roleColors: Record<string, string> = {
    'Principal': 'bg-secondary/15 text-secondary border-secondary/25',
    'Interveniente': 'bg-primary/15 text-primary border-primary/25',
    'Terceiro Interessado': 'bg-amber-500/15 text-amber-600 border-amber-500/25',
    'Litisconsorte': 'bg-violet-500/15 text-violet-600 border-violet-500/25',
    'Assistente': 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25',
  };

  return (
    <div className="fixed inset-0 bg-surface/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-surface-container w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-outline-variant/20 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low shrink-0">
          <div>
            <h3 className="font-headline font-bold text-xl text-on-surface">{editingProcess ? 'Editar Processo' : 'Novo Processo'}</h3>
            <p className="text-xs text-on-surface-variant mt-1">{editingProcess ? 'Atualize os dados do processo judicial' : 'Cadastre um novo processo judicial'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-high rounded-full text-on-surface-variant transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-4 bg-error/10 text-error rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          {/* ── Clientes Vinculados (multi) ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-3.5 h-3.5 text-secondary" />
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Clientes Vinculados</p>
            </div>

            {/* Selected client tags */}
            {selectedClients.length > 0 && (
              <div className="space-y-2 mb-3">
                {selectedClients.map(c => (
                  <div key={c.id} className="flex items-center gap-2 bg-surface-container-highest rounded-xl px-3 py-2">
                    <div className="w-7 h-7 rounded-full bg-secondary/10 flex items-center justify-center text-[10px] font-bold text-secondary shrink-0">
                      {c.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-on-surface truncate">{c.name}</p>
                      <p className="text-[10px] text-outline truncate">{c.cpf_cnpj}</p>
                    </div>
                    <select
                      value={c.role}
                      onChange={e => changeClientRole(c.id, e.target.value)}
                      className={cn(
                        "text-[10px] font-bold border rounded-full px-2 py-0.5 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-secondary transition-colors",
                        roleColors[c.role] || 'bg-surface-container text-on-surface border-outline-variant/20'
                      )}
                    >
                      {PROCESS_CLIENT_ROLES.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeClient(c.id)}
                      className="p-1 rounded-full hover:bg-error/10 hover:text-error text-outline transition-colors shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Client search dropdown */}
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline pointer-events-none" />
                {loadingClients ? (
                  <div className="flex items-center gap-2 py-3 px-4 text-on-surface-variant text-sm bg-surface-container-highest rounded-xl">
                    <Loader2 className="w-4 h-4 animate-spin" /> Carregando clientes...
                  </div>
                ) : (
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={e => { setClientSearch(e.target.value); setDropdownOpen(true); }}
                    onFocus={() => setDropdownOpen(true)}
                    placeholder={selectedClients.length === 0 ? 'Buscar e adicionar cliente...' : 'Adicionar outro cliente...'}
                    className={cn(inputCls, "pl-11")}
                  />
                )}
              </div>

              {dropdownOpen && !loadingClients && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-surface-container rounded-2xl shadow-2xl border border-outline-variant/20 max-h-52 overflow-y-auto">
                  {filteredClients.length === 0 ? (
                    <p className="text-sm text-outline text-center py-4 font-medium">
                      {clientSearch ? `Nenhum cliente encontrado para "${clientSearch}"` : 'Todos os clientes já foram adicionados'}
                    </p>
                  ) : (
                    filteredClients.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => addClient(c)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container-high transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-full bg-secondary/10 flex items-center justify-center text-[10px] font-bold text-secondary shrink-0">
                          {c.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-on-surface truncate">{c.name}</p>
                          <p className="text-[10px] text-outline">{c.cpf_cnpj}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {selectedClients.length === 0 && !loadingClients && (
              <p className="text-[11px] text-outline mt-2 flex items-center gap-1">
                <span className="text-error font-bold">*</span> Pelo menos um cliente deve ser vinculado ao processo
              </p>
            )}
          </div>

          {/* Dados do processo */}
          <div className="pt-2 border-t border-outline-variant/10">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">Dados do Processo</p>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className={labelCls}>Número do Processo *</label>
                <input
                  required
                  type="text"
                  value={formData.number}
                  onChange={e => setFormData({ ...formData, number: e.target.value })}
                  className={inputCls}
                  placeholder="0000000-00.0000.0.00.0000"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className={labelCls}>Tribunal</label>
                  <select
                    value={formData.court}
                    onChange={e => setFormData({ ...formData, court: e.target.value })}
                    className={cn(inputCls, "appearance-none")}
                  >
                    <option value="">Selecione</option>
                    <option value="TJSP">TJSP</option>
                    <option value="TJRJ">TJRJ</option>
                    <option value="TJMG">TJMG</option>
                    <option value="TJRS">TJRS</option>
                    <option value="TJPR">TJPR</option>
                    <option value="TJSC">TJSC</option>
                    <option value="TJBA">TJBA</option>
                    <option value="TJPE">TJPE</option>
                    <option value="TJCE">TJCE</option>
                    <option value="TJGO">TJGO</option>
                    <option value="TJDF">TJDF</option>
                    <option value="TJMT">TJMT</option>
                    <option value="TJMS">TJMS</option>
                    <option value="TJES">TJES</option>
                    <option value="TJPA">TJPA</option>
                    <option value="TJMA">TJMA</option>
                    <option value="TJAM">TJAM</option>
                    <option value="TRT1">TRT1</option>
                    <option value="TRT2">TRT2</option>
                    <option value="TRT3">TRT3</option>
                    <option value="TRT4">TRT4</option>
                    <option value="TRT5">TRT5</option>
                    <option value="TRF1">TRF1</option>
                    <option value="TRF2">TRF2</option>
                    <option value="TRF3">TRF3</option>
                    <option value="TRF4">TRF4</option>
                    <option value="TRF5">TRF5</option>
                    <option value="JFSP">JFSP</option>
                    <option value="STJ">STJ</option>
                    <option value="STF">STF</option>
                    <option value="TST">TST</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Comarca</label>
                  <input
                    type="text"
                    value={formData.comarca}
                    onChange={e => setFormData({ ...formData, comarca: e.target.value })}
                    className={inputCls}
                    placeholder="Ex: São Paulo"
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Vara</label>
                  <input
                    type="text"
                    value={formData.vara}
                    onChange={e => setFormData({ ...formData, vara: e.target.value })}
                    className={inputCls}
                    placeholder="Ex: 1ª Vara Cível"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Partes */}
          <div className="pt-2 border-t border-outline-variant/10">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">Partes do Processo</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className={labelCls}>Autor / Requerente</label>
                <input
                  type="text"
                  value={formData.autor}
                  onChange={e => setFormData({ ...formData, autor: e.target.value })}
                  className={inputCls}
                  placeholder="Nome do autor"
                />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Réu / Requerido</label>
                <input
                  type="text"
                  value={formData.reu}
                  onChange={e => setFormData({ ...formData, reu: e.target.value })}
                  className={inputCls}
                  placeholder="Nome do réu"
                />
              </div>
            </div>
          </div>

          {/* Classificação */}
          <div className="pt-2 border-t border-outline-variant/10">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">Classificação e Status</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className={labelCls}>Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className={cn(inputCls, "appearance-none")}
                >
                  <option value="Em Andamento">Em Andamento</option>
                  <option value="Urgente">Urgente</option>
                  <option value="Concluído">Concluído</option>
                  <option value="Arquivado">Arquivado</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Área</label>
                <select
                  value={formData.area}
                  onChange={e => setFormData({ ...formData, area: e.target.value })}
                  className={cn(inputCls, "appearance-none")}
                >
                  <option value="">Selecione</option>
                  <option value="Cível">Cível</option>
                  <option value="Trabalhista">Trabalhista</option>
                  <option value="Penal">Penal</option>
                  <option value="Família">Família</option>
                  <option value="Tributário">Tributário</option>
                  <option value="Previdenciário">Previdenciário</option>
                  <option value="Administrativo">Administrativo</option>
                  <option value="Consumidor">Consumidor</option>
                  <option value="Ambiental">Ambiental</option>
                  <option value="Empresarial">Empresarial</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Tipo de Ação</label>
                <input
                  type="text"
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                  className={inputCls}
                  placeholder="Ex: Indenizatória..."
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-outline-variant/10">
            <div className="space-y-1.5">
              <label className={labelCls}>Equipe Responsável</label>

              {formData.responsible && (
                <div className="flex flex-wrap gap-1 mb-2 mt-2">
                  {formData.responsible.split(',').map((r, i) => {
                    const name = r.trim();
                    if (!name) return null;
                    return (
                      <span key={i} className="bg-secondary/10 text-secondary px-2 py-0.5 rounded-md text-[10px] flex items-center gap-1 font-bold">
                        {name}
                        <button type="button" onClick={() => {
                          const arr = formData.responsible.split(',').map(x => x.trim()).filter(x => x && x !== name);
                          setFormData({...formData, responsible: arr.join(', ')});
                        }} className="hover:text-secondary/70">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="relative">
                <select
                  value=""
                  onChange={e => {
                    const val = e.target.value;
                    if (!val) return;
                    const arr = formData.responsible ? formData.responsible.split(',').map(x => x.trim()).filter(x => x) : [];
                    if (!arr.includes(val)) {
                      arr.push(val);
                      setFormData({...formData, responsible: arr.join(', ')});
                    }
                  }}
                  className={cn(inputCls, "appearance-none pr-10")}
                >
                  <option value="">Adicionar usuário ao processo...</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.name}>{p.name} ({p.role || 'Usuário'})</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-outline absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
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
              className="px-6 py-3 bg-secondary text-on-secondary font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-secondary/10"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingProcess ? 'Atualizar Processo' : 'Salvar Processo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
