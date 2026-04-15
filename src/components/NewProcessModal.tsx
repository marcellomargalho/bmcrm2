import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Loader2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Client } from '@/types';

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
}

export function NewProcessModal({ isOpen, onClose, onSuccess, editingProcess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void; editingProcess?: ProcessRow | null | any }) {
  const [formData, setFormData] = useState({
    client_id: '',
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
  const [clients, setClients] = useState<Client[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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
          client_id: editingProcess.client_id || '',
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
      } else {
        setFormData({ client_id: '', number: '', court: '', comarca: '', vara: '', autor: '', reu: '', area: '', type: '', responsible: '', status: 'Em Andamento' });
      }
    }
  }, [isOpen, editingProcess]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão inválida. Faça login novamente.');

      if (!formData.client_id) throw new Error('Selecione um cliente.');
      if (!formData.number) throw new Error('Informe o número do processo.');

      const payload = {
        user_id: user.id,
        client_id: formData.client_id,
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

      if (editingProcess) {
        const { error: updateError } = await supabase.from('processes').update(payload).eq('id', editingProcess.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('processes').insert([payload]);
        if (insertError) throw insertError;
      }

      // Update client process count
      const { count } = await supabase
        .from('processes')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', formData.client_id);
      await supabase.from('clients').update({ process_count: count || 0 }).eq('id', formData.client_id);

      onSuccess();
      onClose();
      setFormData({ client_id: '', number: '', court: '', comarca: '', vara: '', autor: '', reu: '', area: '', type: '', responsible: '', status: 'Em Andamento' });
    } catch (err: any) {
      setError(err.message || 'Erro ao criar processo.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = "w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary placeholder:text-outline/50 transition-all font-medium";
  const labelCls = "text-xs font-bold text-on-surface-variant uppercase tracking-wider";

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

          {/* Cliente vinculado */}
          <div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">Vinculação do Cliente</p>
            <div className="space-y-1">
              <label className={labelCls}>Cliente *</label>
              {loadingClients ? (
                <div className="flex items-center gap-2 py-3 text-on-surface-variant text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Carregando clientes...
                </div>
              ) : (
                <select
                  required
                  value={formData.client_id}
                  onChange={e => setFormData({ ...formData, client_id: e.target.value })}
                  className={cn(inputCls, "appearance-none")}
                >
                  <option value="">Selecione o cliente</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.cpf_cnpj}
                    </option>
                  ))}
                </select>
              )}
            </div>
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
