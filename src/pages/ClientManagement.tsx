import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Filter, SortAsc, Mail, Phone, Scale, ChevronRight, Edit2, Share2, TrendingUp, X, Loader2, UserX, UserCheck, Trash2, MapPin, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Client } from '@/types';
import { supabase } from '@/lib/supabase';

function NewClientModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '', cpf_cnpj: '', email: '', phone: '',
    process_number: '', process_court: '', process_responsible: '', process_type: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão inválida. Faça login novamente.');

      const { data: clientData, error: insertError } = await supabase.from('clients').insert([{
        user_id: user.id,
        name: formData.name,
        cpf_cnpj: formData.cpf_cnpj,
        email: formData.email,
        phone: formData.phone,
        status: 'Ativo',
        process_count: formData.process_number ? 1 : 0
      }]).select().single();

      if (insertError) throw insertError;

      // If process data was provided, create the process
      if (formData.process_number && clientData) {
        await supabase.from('processes').insert([{
          user_id: user.id,
          client_id: clientData.id,
          number: formData.process_number,
          court: formData.process_court || null,
          responsible: formData.process_responsible || null,
          area: formData.process_type || null,
          status: 'Em Andamento'
        }]);
      }

      onSuccess();
      onClose();
      setFormData({ name: '', cpf_cnpj: '', email: '', phone: '', process_number: '', process_court: '', process_responsible: '', process_type: '' });
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
            <p className="text-xs text-on-surface-variant mt-1">Cadastre o cliente e vincule um processo</p>
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

          {/* Dados do processo */}
          <div className="pt-4 border-t border-outline-variant/10">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">Processo (Opcional)</p>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Número do Processo</label>
                <input 
                  type="text" 
                  value={formData.process_number}
                  onChange={e => setFormData({ ...formData, process_number: e.target.value })}
                  className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary placeholder:text-outline/50 transition-all font-medium"
                  placeholder="0000000-00.0000.0.00.0000"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Local / Comarca</label>
                  <input 
                    type="text" 
                    value={formData.process_court}
                    onChange={e => setFormData({ ...formData, process_court: e.target.value })}
                    className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary placeholder:text-outline/50 transition-all font-medium"
                    placeholder="Ex: TJSP, TRF3, JFSP..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Responsáveis</label>
                  <input 
                    type="text" 
                    value={formData.process_responsible}
                    onChange={e => setFormData({ ...formData, process_responsible: e.target.value })}
                    className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary placeholder:text-outline/50 transition-all font-medium"
                    placeholder="Nomes dos responsáveis"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tipo de Processo</label>
                <select
                  value={formData.process_type}
                  onChange={e => setFormData({ ...formData, process_type: e.target.value })}
                  className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary placeholder:text-outline/50 transition-all font-medium appearance-none"
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

function ClientProcesses({ clientId }: { clientId: string }) {
  const [processes, setProcesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchProcesses() {
    setLoading(true);
    const { data } = await supabase
      .from('processes')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    setProcesses(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchProcesses();
  }, [clientId]);

  async function handleDeleteProcess(id: string) {
    if (window.confirm('Tem certeza que deseja excluir este processo? Essa ação não pode ser desfeita.')) {
      await supabase.from('processes').delete().eq('id', id);
      fetchProcesses();
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
                  <button 
                    onClick={() => handleDeleteProcess(proc.id)}
                    className="p-1.5 text-outline hover:text-error hover:bg-error/10 rounded-md transition-all"
                    title="Excluir Processo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
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
    process_number: '', process_court: '', process_responsible: '', process_type: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setFormData({
      name: client.name, cpf_cnpj: client.cpf_cnpj, email: client.email, phone: client.phone,
      process_number: '', process_court: '', process_responsible: '', process_type: ''
    });
  }, [client]);

  if (!isOpen) return null;

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

      // Add new process if provided
      if (formData.process_number) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('processes').insert([{
            user_id: user.id,
            client_id: client.id,
            number: formData.process_number,
            court: formData.process_court || null,
            responsible: formData.process_responsible || null,
            area: formData.process_type || null,
            status: 'Em Andamento'
          }]);
          // Update process count
          const { count } = await supabase.from('processes').select('*', { count: 'exact', head: true }).eq('client_id', client.id);
          await supabase.from('clients').update({ process_count: count || 0 }).eq('id', client.id);
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
            <p className="text-xs text-on-surface-variant mt-1">Atualize os dados do cliente ou adicione um processo</p>
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

          {/* Adicionar novo processo */}
          <div className="pt-4 border-t border-outline-variant/10">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">Adicionar Novo Processo</p>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Número do Processo</label>
                <input
                  type="text"
                  value={formData.process_number}
                  onChange={e => setFormData({ ...formData, process_number: e.target.value })}
                  className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary placeholder:text-outline/50 transition-all font-medium"
                  placeholder="0000000-00.0000.0.00.0000"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Local / Comarca</label>
                  <input
                    type="text"
                    value={formData.process_court}
                    onChange={e => setFormData({ ...formData, process_court: e.target.value })}
                    className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary placeholder:text-outline/50 transition-all font-medium"
                    placeholder="Ex: TJSP, TRF3, JFSP..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Responsáveis</label>
                  <input
                    type="text"
                    value={formData.process_responsible}
                    onChange={e => setFormData({ ...formData, process_responsible: e.target.value })}
                    className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary placeholder:text-outline/50 transition-all font-medium"
                    placeholder="Nomes dos responsáveis"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tipo de Processo</label>
                <select
                  value={formData.process_type}
                  onChange={e => setFormData({ ...formData, process_type: e.target.value })}
                  className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary placeholder:text-outline/50 transition-all font-medium appearance-none"
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
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function fetchClients() {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (data) {
      setClients(data);
      if (data.length > 0 && !selectedClient) {
        setSelectedClient(data[0]);
      } else if (selectedClient) {
        const updated = data.find(c => c.id === selectedClient.id);
        setSelectedClient(updated || data[0] || null);
      } else if (data.length === 0) {
        setSelectedClient(null);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchClients();
  }, []);

  const activeClients = clients.filter(c => c.status === 'Ativo').length;
  const inactiveClients = clients.filter(c => c.status === 'Inativo').length;

  async function toggleClientStatus(clientId: string, currentStatus: string) {
    const newStatus = currentStatus === 'Ativo' ? 'Inativo' : 'Ativo';
    await supabase.from('clients').update({ status: newStatus }).eq('id', clientId);
    fetchClients();
  }

  async function handleDeleteClient() {
    if (!selectedClient) return;
    setDeleting(true);
    try {
      // Delete only the client record (processes are kept)
      await supabase.from('clients').delete().eq('id', selectedClient.id);
      setIsDeleteModalOpen(false);
      setSelectedClient(null);
      fetchClients();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8">
      <NewClientModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchClients} 
      />
      {selectedClient && (
        <EditClientModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={fetchClients}
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
          <h3 className="text-4xl font-headline font-extrabold text-on-surface">{clients.length}</h3>
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
            <h4 className="font-headline font-bold text-lg text-on-surface">Recentes</h4>
            <div className="flex gap-2">
              <button className="p-2 text-on-surface-variant hover:text-secondary transition-colors"><Filter className="w-5 h-5" /></button>
              <button className="p-2 text-on-surface-variant hover:text-secondary transition-colors"><SortAsc className="w-5 h-5" /></button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-secondary" />
            </div>
          ) : clients.length === 0 ? (
            <div className="p-12 text-center bg-surface-container-low rounded-2xl border border-outline-variant/10">
              <Users className="w-12 h-12 text-outline mx-auto mb-4" />
              <p className="text-on-surface-variant font-medium">Nenhum cliente cadastrado ainda.</p>
              <button onClick={() => setIsModalOpen(true)} className="mt-4 text-secondary font-bold hover:underline">Cadastrar o primeiro</button>
            </div>
          ) : (
            clients.map((client) => (
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
            ))
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
                    <button
                      onClick={() => setIsDeleteModalOpen(true)}
                      className="p-2 bg-error/10 rounded-lg text-error hover:bg-error hover:text-white transition-all"
                      title="Excluir Cadastro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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

                  <ClientProcesses clientId={selectedClient.id} />
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
