import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  CircleDollarSign, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical,
  Filter,
  Download,
  Calendar,
  User,
  Scale,
  Gavel,
  CreditCard,
  History,
  ShieldAlert,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  FileText,
  Percent,
  X,
  Loader2,
  Check,
  Trash2,
  CalendarClock,
  Wallet,
  Database
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

// --- Interfaces ---

interface Transacao {
  id: string;
  cliente_id?: string;
  cliente_nome: string;
  numero_processo: string;
  tipo_servico: 'criminal' | 'cível' | 'previdenciário';
  status_processo: 'em andamento' | 'finalizado' | 'suspenso';
  valor_total_contrato: number;
  tipo_cobranca: 'à vista' | 'parcelado' | 'êxito';
  data_assinatura: string;
  data_pagamento_acordada: string;
  forma_pagamento: 'PIX' | 'Transferência' | 'Dinheiro' | 'Cartão';
  total_parcelas: number;
  valor_parcela: number;
  parcelas_pagas: number;
  status_financeiro: 'em dia' | 'atrasado' | 'inadimplente' | 'quitado' | 'pendente';
  valor_recebido: number;
  dias_atraso: number;
  custos_processo: number;
  risco_inadimplencia: 'baixo' | 'médio' | 'alto';
  recorrente: boolean;
  potencial_indicacao: boolean;
  observacoes: string;
  created_at?: string;
}

// --- Constants ---

const TIPO_SERVICO_LABELS = {
  criminal: { label: 'Criminal', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  cível: { label: 'Cível', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  previdenciário: { label: 'Previdenciário', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' }
};

const STATUS_FINANCEIRO_LABELS: Record<string, { label: string, color: string }> = {
  'em dia': { label: 'Em Dia', color: 'text-emerald-400 bg-emerald-400/10' },
  'pendente': { label: 'Pendente', color: 'text-blue-400 bg-blue-400/10' },
  'atrasado': { label: 'Atrasado', color: 'text-amber-400 bg-amber-400/10' },
  'inadimplente': { label: 'Inadimplente', color: 'text-red-400 bg-red-400/10' },
  'quitado': { label: 'Quitado', color: 'text-purple-400 bg-purple-400/10' }
};

const RISCO_LABELS: Record<string, string> = {
  baixo: 'bg-emerald-500',
  médio: 'bg-amber-500',
  alto: 'bg-red-500'
};

// --- Components ---

function NumericInput({ value, onChange, label, placeholder }: { value: number, onChange: (v: number) => void, label: string, placeholder?: string }) {
  const [displayValue, setDisplayValue] = useState(value === 0 ? '' : value.toString());

  useEffect(() => {
    setDisplayValue(value === 0 ? '' : value.toString());
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setDisplayValue('');
      onChange(0);
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setDisplayValue(val);
      onChange(num);
    }
  };

  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-outline uppercase tracking-wider">{label}</label>
      <input 
        type="text" 
        inputMode="decimal"
        placeholder={placeholder || "0.00"}
        className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary font-bold"
        value={displayValue}
        onChange={handleChange}
      />
    </div>
  );
}

function NewContractModal({ isOpen, onClose, onSuccess, initialData }: { isOpen: boolean; onClose: () => void; onSuccess: (contract: Transacao) => void; initialData?: Transacao | null }) {
  const [crmClients, setCrmClients] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [isManual, setIsManual] = useState(false);
  
  const defaultForm = {
    cliente_nome: '',
    numero_processo: '',
    tipo_servico: 'cível',
    status_processo: 'em andamento',
    valor_total_contrato: 0,
    tipo_cobranca: 'à vista',
    data_assinatura: new Date().toISOString().split('T')[0],
    data_pagamento_acordada: '',
    forma_pagamento: 'PIX',
    total_parcelas: 1,
    valor_parcela: 0,
    parcelas_pagas: 0,
    status_financeiro: 'pendente',
    valor_recebido: 0,
    custos_processo: 0,
    risco_inadimplencia: 'baixo',
    recorrente: false,
    potencial_indicacao: false,
    observacoes: ''
  };

  const [formData, setFormData] = useState<Partial<Transacao>>(defaultForm);

  useEffect(() => {
    if (isOpen) {
      fetchClients();
      if (initialData) {
        setFormData(initialData);
        setIsManual(true);
      } else {
        setFormData(defaultForm);
        setIsManual(false);
      }
    }
  }, [isOpen, initialData]);

  async function fetchClients() {
    setLoadingClients(true);
    const { data } = await supabase.from('clients').select('id, name').order('name');
    setCrmClients(data || []);
    setLoadingClients(false);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let status = formData.status_financeiro || 'em dia';
    let diasAtraso = 0;
    
    if (formData.data_pagamento_acordada) {
      const today = new Date();
      const agreed = new Date(formData.data_pagamento_acordada);
      if (today > agreed && status !== 'quitado') {
        status = 'atrasado';
        diasAtraso = Math.floor((today.getTime() - agreed.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    const newContract: Transacao = {
      ...formData,
      id: initialData ? initialData.id : Math.random().toString(36).substr(2, 9),
      status_financeiro: status,
      dias_atraso: diasAtraso,
      valor_recebido: formData.valor_recebido || 0,
    } as Transacao;
    
    onSuccess(newContract);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-surface/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-surface-container w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-outline-variant/20 animate-in fade-in zoom-in-95 duration-200 my-8">
        <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low shrink-0">
          <div>
            <h3 className="font-headline font-bold text-xl text-on-surface">{initialData ? 'Editar Contrato' : 'Novo Contrato Estratégico'}</h3>
            <p className="text-xs text-on-surface-variant mt-1">{initialData ? 'Atualize as informações do cliente ou fluxo.' : 'Configure o fluxo e as datas de vencimento'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-high rounded-full text-on-surface-variant transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-secondary uppercase tracking-[2px] border-b border-outline-variant/10 pb-2">1. Identificação do Cliente</h4>
            <div className="flex gap-4 items-center mb-2">
              <button type="button" onClick={() => setIsManual(false)} className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all", !isManual ? "bg-secondary text-on-secondary" : "bg-surface-container-high text-outline")}>Selecionar do CRM</button>
              <button type="button" onClick={() => setIsManual(true)} className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all", isManual ? "bg-secondary text-on-secondary" : "bg-surface-container-high text-outline")}>Adicionar Manualmente</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!isManual ? (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-outline uppercase tracking-wider">Cliente do CRM</label>
                  <select required className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary" onChange={(e) => {
                    const client = crmClients.find(c => c.id === e.target.value);
                    setFormData({ ...formData, cliente_id: client?.id, cliente_nome: client?.name });
                  }}>
                    <option value="">Selecione um cliente...</option>
                    {crmClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-outline uppercase tracking-wider">Nome do Cliente (Manual)</label>
                  <input required type="text" placeholder="Nome completo" className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary" value={formData.cliente_nome} onChange={e => setFormData({ ...formData, cliente_nome: e.target.value })} />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-bold text-outline uppercase tracking-wider">Número do Processo</label>
                <input type="text" placeholder="0000000-00..." className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary" value={formData.numero_processo} onChange={e => setFormData({ ...formData, numero_processo: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-[2px] border-b border-outline-variant/10 pb-2">2. Financeiro e Cobrança</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-outline uppercase tracking-wider">Data do Pagamento Acordada</label>
                <input type="date" required className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary font-bold" value={formData.data_pagamento_acordada} onChange={e => setFormData({ ...formData, data_pagamento_acordada: e.target.value })} />
                <p className="text-[9px] text-amber-400 font-bold uppercase mt-1 italic">Para o resumo mensal.</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-outline uppercase tracking-wider">Forma de Pagamento</label>
                <select className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary" value={formData.forma_pagamento} onChange={e => setFormData({ ...formData, forma_pagamento: e.target.value as any })}>
                  <option value="PIX">PIX</option>
                  <option value="Transferência">Transferência</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartão">Cartão</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <NumericInput label="Valor Total (R$)" value={formData.valor_total_contrato || 0} onChange={v => setFormData({ ...formData, valor_total_contrato: v })} />
              <div className="space-y-1">
                <label className="text-xs font-bold text-outline uppercase tracking-wider">Tipo de Cobrança</label>
                <select className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary" value={formData.tipo_cobranca} onChange={e => setFormData({ ...formData, tipo_cobranca: e.target.value as any })}>
                  <option value="à vista">À Vista</option>
                  <option value="parcelado">Parcelado</option>
                  <option value="êxito">Êxito</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-outline uppercase tracking-wider">Status Inicial</label>
                <select className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary" value={formData.status_financeiro} onChange={e => setFormData({ ...formData, status_financeiro: e.target.value as any })}>
                  <option value="pendente">Pendente de Pagamento</option>
                  <option value="em dia">Em Dia</option>
                  <option value="quitado">Quitado</option>
                  <option value="atrasado">Atrasado</option>
                </select>
              </div>
            </div>
            
            {formData.tipo_cobranca === 'parcelado' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-outline uppercase tracking-wider">Quantidade de Parcelas</label>
                  <input type="number" min="1" className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary" value={formData.total_parcelas || 1} onChange={e => setFormData({ ...formData, total_parcelas: parseInt(e.target.value) || 1 })} />
                </div>
                <NumericInput label="Valor da Parcela Mensal (R$)" value={formData.valor_parcela || 0} onChange={v => setFormData({ ...formData, valor_parcela: v })} />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <NumericInput label="Valor Já Recebido (R$)" value={formData.valor_recebido || 0} onChange={v => setFormData({ ...formData, valor_recebido: v })} />
              <NumericInput label="Custos Processo (R$)" value={formData.custos_processo || 0} onChange={v => setFormData({ ...formData, custos_processo: v })} />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[2px] border-b border-outline-variant/10 pb-2">3. Observações</h4>
            <div className="space-y-1">
              <label className="text-xs font-bold text-outline uppercase tracking-wider">Notas de Gestão</label>
              <textarea rows={3} className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary text-sm resize-none" value={formData.observacoes} onChange={e => setFormData({ ...formData, observacoes: e.target.value })} />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 shrink-0">
            <button type="button" onClick={onClose} className="px-6 py-3 font-bold text-on-surface-variant hover:bg-surface-container-highest rounded-xl transition-all">Cancelar</button>
            <button type="submit" className="px-6 py-3 bg-secondary text-on-secondary font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-secondary/20">{initialData ? 'Salvar Alterações' : 'Salvar Contrato'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Main Page ---

export function Financeiro() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ativos' | 'quitados' | 'inadimplentes'>('ativos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contractToEdit, setContractToEdit] = useState<Transacao | null>(null);

  const handleOpenNew = () => {
    setContractToEdit(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (t: Transacao, e: React.MouseEvent) => {
    e.stopPropagation();
    setContractToEdit(t);
    setIsModalOpen(true);
  };

  const fetchTransacoes = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('financeiro_contratos').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      const today = new Date();
      // Auto-update atrasados on fetch just for UI display (we can save it too, but UI update is enough for now)
      const updatedData = data.map(t => {
        if (t.data_pagamento_acordada && t.status_financeiro !== 'quitado') {
          const agreed = new Date(t.data_pagamento_acordada);
          if (today > agreed && t.status_financeiro !== 'atrasado') {
            const dias_atraso = Math.floor((today.getTime() - agreed.getTime()) / (1000 * 60 * 60 * 24));
            // We update it async in the background to not block render
            supabase.from('financeiro_contratos').update({ status_financeiro: 'atrasado', dias_atraso }).eq('id', t.id).then();
            return { ...t, status_financeiro: 'atrasado' as any, dias_atraso };
          }
        }
        return t;
      });
      setTransacoes(updatedData as Transacao[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTransacoes();
  }, []);

  const handleSaveContract = async (contract: Transacao) => {
    if (contractToEdit) {
      const { error } = await supabase.from('financeiro_contratos').update(contract).eq('id', contract.id);
      if (!error) {
        setTransacoes(transacoes.map(t => t.id === contract.id ? contract : t));
      } else {
        alert("Erro ao salvar: " + error.message);
      }
    } else {
      const { error } = await supabase.from('financeiro_contratos').insert([contract]);
      if (!error) {
        setTransacoes([contract, ...transacoes]);
      } else {
        alert("Erro ao salvar: " + error.message);
      }
    }
  };

  const syncLocalToSupabase = async () => {
    const saved = localStorage.getItem('@AgendaJuridica:financeiro_data');
    if (saved) {
      const data = JSON.parse(saved) as Transacao[];
      if (data && data.length > 0) {
        const { error } = await supabase.from('financeiro_contratos').upsert(data);
        if (!error) {
          alert('Dados migrados com sucesso para a Nuvem!');
          localStorage.removeItem('@AgendaJuridica:financeiro_data');
          fetchTransacoes();
        } else {
          alert('Erro na migração: ' + error.message);
        }
      } else {
        alert('Nenhum dado local encontrado para migrar.');
      }
    } else {
      alert('Nenhum dado local encontrado para migrar.');
    }
  };

  const handleDeleteContract = async (id: string) => {
    if (window.confirm('Excluir dívida permanentemente?')) {
      const { error } = await supabase.from('financeiro_contratos').delete().eq('id', id);
      if (!error) {
        setTransacoes(transacoes.filter(t => t.id !== id));
        setExpandedRow(null);
      }
    }
  };

  const handleRegistrarPagamento = async (id: string) => {
    const t = transacoes.find(x => x.id === id);
    if (!t) return;
    
    let novasPagas = t.parcelas_pagas || 0;
    let novoRecebido = t.valor_recebido || 0;
    let novaData = t.data_pagamento_acordada;
    let novoStatus = t.status_financeiro;
    
    if (t.tipo_cobranca === 'parcelado') {
      novasPagas += 1;
      novoRecebido += (t.valor_parcela || 0);
      
      if (novaData) {
        const d = new Date(novaData);
        d.setMonth(d.getMonth() + 1);
        novaData = d.toISOString().split('T')[0];
      }
      
      if (novasPagas >= t.total_parcelas) {
        novoStatus = 'quitado';
      } else {
        novoStatus = 'pendente';
      }
    } else {
      novoRecebido = t.valor_total_contrato;
      novoStatus = 'quitado';
    }

    const updatedObj = { 
      ...t, 
      parcelas_pagas: novasPagas, 
      valor_recebido: novoRecebido,
      data_pagamento_acordada: novaData,
      status_financeiro: novoStatus,
      dias_atraso: 0
    };

    const { error } = await supabase.from('financeiro_contratos').update({
      parcelas_pagas: novasPagas, 
      valor_recebido: novoRecebido,
      data_pagamento_acordada: novaData,
      status_financeiro: novoStatus,
      dias_atraso: 0
    }).eq('id', id);

    if (!error) {
      setTransacoes(transacoes.map(x => x.id === id ? updatedObj as Transacao : x));
    }
  };

  // Monthly Summary Calculation
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const monthName = today.toLocaleString('pt-BR', { month: 'long' });
  
  const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const nextMonthName = nextMonthDate.toLocaleString('pt-BR', { month: 'long' });

  const transacoesMes = transacoes.filter(t => {
    if (!t.data_pagamento_acordada) return false;
    const date = new Date(t.data_pagamento_acordada);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const previstoReceberMes = transacoesMes.reduce((acc, t) => {
    if (t.status_financeiro === 'quitado') return acc;
    if (t.tipo_cobranca === 'parcelado') {
      return acc + (t.valor_parcela || 0);
    }
    return acc + (t.valor_total_contrato - t.valor_recebido);
  }, 0);

  const recebidoMes = transacoesMes.reduce((acc, t) => {
    return acc + t.valor_recebido;
  }, 0);

  // Next Month Provisioning
  const previsaoProxMes = transacoes.reduce((acc, t) => {
    if (t.status_financeiro === 'quitado') return acc;
    
    // If it's a monthly installment and there are still installments left
    if (t.tipo_cobranca === 'parcelado' && t.parcelas_pagas < t.total_parcelas) {
      return acc + (t.valor_parcela || 0);
    }
    // If it's a one-time payment scheduled for next month
    if (t.data_pagamento_acordada) {
      const d = new Date(t.data_pagamento_acordada);
      if (d.getMonth() === nextMonthDate.getMonth() && d.getFullYear() === nextMonthDate.getFullYear()) {
        return acc + (t.valor_total_contrato - t.valor_recebido);
      }
    }
    return acc;
  }, 0);

  const filtered = transacoes.filter(t => {
    const matchesSearch = t.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) || (t.numero_processo || '').includes(searchTerm);
    if (!matchesSearch) return false;
    if (activeTab === 'ativos') return t.status_financeiro !== 'quitado';
    if (activeTab === 'quitados') return t.status_financeiro === 'quitado';
    if (activeTab === 'inadimplentes') return t.status_financeiro === 'inadimplente' || t.status_financeiro === 'atrasado';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      <NewContractModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={handleSaveContract} initialData={contractToEdit} />

      {/* Header & New Contract Button */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface mb-2 flex items-center gap-3">
            <CircleDollarSign className="w-8 h-8 text-secondary" />
            Fluxo de Caixa & Gestão
          </h2>
          <p className="text-on-surface-variant text-sm max-w-2xl">Monitoramento mensal de recebimentos e inadimplência.</p>
        </div>
        <div className="flex gap-4 items-center">
          {localStorage.getItem('@AgendaJuridica:financeiro_data') && (
            <button onClick={syncLocalToSupabase} className="px-6 py-3 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2">
              <Database className="w-4 h-4" /> Migrar Dados para Nuvem
            </button>
          )}
          <button onClick={handleOpenNew} className="px-6 py-3 bg-secondary text-on-secondary hover:bg-secondary/90 rounded-2xl shadow-lg shadow-secondary/20 font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2">
            <Plus className="w-4 h-4" /> Novo Contrato
          </button>
        </div>
      </section>

      {/* Resumo do Mês Presente (Requested) */}
      <section className="bg-surface-container-low rounded-3xl border border-outline-variant/5 overflow-hidden shadow-2xl">
        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-secondary mb-4">
              <CalendarClock className="w-5 h-5" />
              <h3 className="text-xs font-black uppercase tracking-[2px]">Resumo de {monthName}</h3>
            </div>
            <p className="text-3xl font-black text-on-surface">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(previstoReceberMes + recebidoMes)}
            </p>
            <p className="text-[10px] text-outline font-bold uppercase">Total Projetado para o Mês</p>
          </div>

          <div className="bg-emerald-500/5 p-6 rounded-2xl border border-emerald-500/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Já Recebido</span>
              <Wallet className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-emerald-400">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(recebidoMes)}
            </p>
            <div className="w-full h-1.5 bg-emerald-500/10 rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-emerald-400" style={{ width: `${Math.min((recebidoMes / (previstoReceberMes + recebidoMes || 1)) * 100, 100)}%` }} />
            </div>
          </div>

          <div className="bg-amber-500/5 p-6 rounded-2xl border border-amber-500/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">A Receber</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-amber-400">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(previstoReceberMes)}
            </p>
            <p className="text-[9px] text-outline mt-2 font-bold uppercase italic">{transacoesMes.filter(t => t.status_financeiro === 'pendente' || t.status_financeiro === 'em dia' || t.status_financeiro === 'atrasado').length} pagamentos pendentes</p>
          </div>
        </div>
      </section>

      {/* Provisionamento do Mês Seguinte */}
      <section className="bg-surface-container-low rounded-3xl border border-outline-variant/5 overflow-hidden shadow-md p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-l-4 border-l-secondary">
        <div>
          <h3 className="text-[10px] font-black text-secondary uppercase tracking-[2px] flex items-center gap-2 mb-1">
            <ArrowUpRight className="w-4 h-4" /> Provisionamento
          </h3>
          <p className="text-xl font-black text-on-surface capitalize">Previsão de {nextMonthName}</p>
          <p className="text-xs text-outline mt-1 max-w-md">Valores previstos considerando contratos parcelados ativos e recebimentos programados para o próximo mês.</p>
        </div>
        <div className="bg-surface-container-high px-8 py-6 rounded-2xl border border-outline-variant/10 text-right min-w-[250px]">
          <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-2">Caixa Previsto</p>
          <p className="text-4xl font-black text-secondary">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(previsaoProxMes)}
          </p>
        </div>
      </section>

      {/* Main Stats (Secondary row) */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/5">
          <p className="text-[10px] font-black text-outline uppercase tracking-widest">Total Global Contratado</p>
          <p className="text-xl font-black text-on-surface mt-1">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transacoes.reduce((acc, t) => acc + t.valor_total_contrato, 0))}</p>
        </div>
        <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/5">
          <p className="text-[10px] font-black text-outline uppercase tracking-widest">Inadimplência Geral</p>
          <p className="text-xl font-black text-red-400 mt-1">{transacoes.filter(t => t.status_financeiro === 'atrasado').length} Clientes</p>
        </div>
      </section>

      {/* Table Section */}
      <section className="bg-surface-container-low rounded-3xl border border-outline-variant/5 overflow-hidden shadow-xl">
        <div className="p-6 border-b border-outline-variant/10 flex flex-col md:flex-row md:items-center gap-6 justify-between bg-surface-container-low/50">
          <div className="flex bg-surface-container-high p-1 rounded-xl w-fit">
            {[{ id: 'ativos', label: 'Ativos/Pendentes' }, { id: 'quitados', label: 'Quitados' }, { id: 'inadimplentes', label: 'Em Atraso' }].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={cn("px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", activeTab === tab.id ? "bg-surface-container-lowest text-secondary shadow-sm" : "text-outline hover:text-on-surface")}>{tab.label}</button>
            ))}
          </div>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
            <input type="text" placeholder="Buscar por cliente ou processo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-secondary/20 outline-none" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/10 bg-surface-container-highest/5">
                <th className="w-10 px-6 py-4"></th>
                <th className="px-6 py-4 text-[9px] font-black text-outline uppercase tracking-widest">Cliente</th>
                <th className="px-6 py-4 text-[9px] font-black text-outline uppercase tracking-widest">Data Acordada</th>
                <th className="px-6 py-4 text-[9px] font-black text-outline uppercase tracking-widest">Saldo Pendente</th>
                <th className="px-6 py-4 text-[9px] font-black text-outline uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {filtered.map((t) => {
                const isExpanded = expandedRow === t.id;
                return (
                  <React.Fragment key={t.id}>
                    <tr className={cn("group hover:bg-surface-container-highest/20 transition-all cursor-pointer", isExpanded && "bg-surface-container-high/30")} onClick={() => setExpandedRow(isExpanded ? null : t.id)}>
                      <td className="px-6 py-4 text-center">{isExpanded ? <ChevronUp className="w-4 h-4 text-secondary" /> : <ChevronDown className="w-4 h-4 text-outline" />}</td>
                      <td className="px-6 py-4"><div className="flex flex-col"><span className="text-sm font-bold text-on-surface">{t.cliente_nome}</span><span className="text-[10px] text-outline">{t.numero_processo}</span></div></td>
                      <td className="px-6 py-4"><div className="flex items-center gap-2 text-xs font-bold text-on-surface"><Calendar className="w-3.5 h-3.5 text-secondary" /> {t.data_pagamento_acordada ? new Date(t.data_pagamento_acordada).toLocaleDateString('pt-BR') : '—'}</div></td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-black text-sm text-on-surface">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.valor_total_contrato - t.valor_recebido)}
                          </span>
                          <span className="text-[9px] text-outline font-bold uppercase tracking-wider">
                            Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.valor_total_contrato)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className={cn("px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border", STATUS_FINANCEIRO_LABELS[t.status_financeiro]?.color || 'bg-surface-container-high')}>{t.status_financeiro}</span>
                          {t.tipo_cobranca === 'parcelado' && t.status_financeiro !== 'quitado' && (
                            <span className="text-[9px] text-outline font-bold uppercase tracking-wider">Faltam {t.total_parcelas - t.parcelas_pagas} parc.</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={(e) => handleEditClick(t, e)} className="p-2 hover:bg-secondary/10 rounded-lg text-outline hover:text-secondary transition-colors mr-1" title="Editar"><MoreVertical className="w-4 h-4" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteContract(t.id); }} className="p-2 hover:bg-error/10 rounded-lg text-outline hover:text-error transition-colors" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 bg-surface-container-low/80 border-t border-outline-variant/10">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                            <div className="space-y-3">
                              <h4 className="text-[10px] font-black text-secondary uppercase tracking-[2px] border-b border-secondary/20 pb-2">Contrato</h4>
                              <p className="text-xs text-on-surface-variant leading-relaxed italic">"{t.observacoes || 'Sem observações.'}"</p>
                              <div className="flex items-center gap-4 mt-4">
                                <div className="p-3 bg-surface-container-high rounded-xl">
                                  <p className="text-[9px] text-outline font-bold uppercase">Forma</p>
                                  <p className="text-xs font-bold text-on-surface">{t.forma_pagamento}</p>
                                </div>
                                <div className="p-3 bg-surface-container-high rounded-xl">
                                  <p className="text-[9px] text-outline font-bold uppercase">Cobrança</p>
                                  <p className="text-xs font-bold text-on-surface">{t.tipo_cobranca}</p>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-[2px] border-b border-amber-400/20 pb-2">Vencimento</h4>
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] text-outline font-bold uppercase">Dias em Atraso</p>
                                <span className={cn("text-xs font-black px-2 py-0.5 rounded", t.dias_atraso > 0 ? "text-red-400 bg-red-400/10" : "text-emerald-400")}>{t.dias_atraso} dias</span>
                              </div>
                              {t.tipo_cobranca === 'parcelado' && (
                                <div className="flex items-center justify-between mt-2">
                                  <p className="text-[10px] text-outline font-bold uppercase">Parcelas</p>
                                  <div className="text-right">
                                    <span className="text-xs font-black text-on-surface">{t.parcelas_pagas} de {t.total_parcelas}</span>
                                    <p className="text-[9px] text-outline uppercase font-bold">Faltam {t.total_parcelas - t.parcelas_pagas}</p>
                                  </div>
                                </div>
                              )}
                              {t.status_financeiro !== 'quitado' && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleRegistrarPagamento(t.id); }}
                                  className="w-full mt-4 py-3 bg-emerald-500/10 text-emerald-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2"
                                >
                                  <CheckCircle2 className="w-4 h-4" /> Registrar Pagamento
                                </button>
                              )}
                            </div>
                            <div className="space-y-3">
                              <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[2px] border-b border-emerald-400/20 pb-2">Rentabilidade</h4>
                              <div className="flex justify-between items-end">
                                <div><p className="text-[9px] text-outline font-bold uppercase">Lucro Previsto</p><p className="text-lg font-black text-on-surface">R$ {(t.valor_total_contrato - t.custos_processo).toLocaleString('pt-BR')}</p></div>
                                <div className="text-right"><p className="text-[9px] text-outline font-bold uppercase">Margem</p><p className="text-lg font-black text-emerald-400">{t.valor_total_contrato > 0 ? ((t.valor_total_contrato - t.custos_processo) / t.valor_total_contrato * 100).toFixed(1) : 0}%</p></div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
