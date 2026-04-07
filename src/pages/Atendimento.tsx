import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  MessageSquare, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ExternalLink,
  Search,
  Filter,
  MoreVertical,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper for formatting dates
function formatDate(dateStr: string) {
  if (!dateStr) return 'Não definida';
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

// Helper for status colors
const statusConfig: Record<string, { label: string, color: string, icon: any }> = {
  'novo': { label: 'Novo', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20', icon: AlertCircle },
  'em_atendimento': { label: 'Em Atendimento', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20', icon: MessageSquare },
  'agendado': { label: 'Agendado', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', icon: Calendar },
  'concluido': { label: 'Concluído', color: 'bg-purple-500/15 text-purple-400 border-purple-500/20', icon: CheckCircle2 },
  'cancelado': { label: 'Cancelado', color: 'bg-error/15 text-error border-error/20', icon: XCircle },
  'interno': { label: 'Interno', color: 'bg-surface-container text-outline border-outline-variant/20', icon: User },
};

export function Atendimento() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();

    const channel = supabase
      .channel('lista-atendimentos')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'appointments' },
        (payload) => {
          // Prepend the new appointment to the local state so the grid updates instantly
          setAppointments(prev => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const filteredAppointments = appointments.filter(a => {
    const matchesSearch = 
      (a.visitor_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.visitor_email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.area_interesse?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = statusFilter === 'todos' || a.status === statusFilter;
    
    return matchesSearch && matchesFilter;
  });

  const openWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá ${name}, tudo bem? Sou da equipe da Brenda Margalho Advocacia. Recebemos seu pedido de contato pelo site.`);
    window.open(`https://wa.me/${cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <MessageSquare className="w-6 h-6 text-secondary" />
            <h1 className="text-2xl font-headline font-bold text-on-surface">Gestão de Atendimento</h1>
          </div>
          <p className="text-on-surface-variant text-sm">
            Gerencie contatos e agendamentos vindos do seu site e blog.
          </p>
        </div>

        <button 
          onClick={fetchAppointments}
          className="flex items-center gap-2 px-4 py-2 bg-surface-container-high rounded-xl text-xs font-bold text-secondary hover:bg-surface-container-highest transition-all"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          Atualizar
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
          <input 
            type="text" 
            placeholder="Pesquisar por nome, email ou área..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-outline-variant/20 rounded-2xl focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none text-sm"
          />
        </div>
        
        <div className="flex items-center gap-2 bg-surface-container-low p-1.5 rounded-2xl border border-outline-variant/10">
          {['todos', 'novo', 'em_atendimento', 'agendado', 'concluido'].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all",
                statusFilter === f 
                  ? "bg-secondary text-surface-container shadow-lg" 
                  : "text-outline hover:bg-surface-container-high"
              )}
            >
              {f === 'todos' ? 'Todos' : statusConfig[f]?.label || f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Leads */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="w-12 h-12 border-4 border-secondary/20 border-t-secondary rounded-full animate-spin" />
          <p className="text-sm text-outline animate-pulse">Carregando seus atendimentos...</p>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="bg-surface-container-low rounded-3xl border border-outline-variant/10 p-16 text-center">
          <div className="w-16 h-16 bg-surface-container-high rounded-2xl flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="w-8 h-8 text-outline opacity-30" />
          </div>
          <h3 className="text-lg font-headline font-bold text-on-surface mb-2">Nenhum atendimento encontrado</h3>
          <p className="text-sm text-on-surface-variant max-w-sm mx-auto">
            Quando alguém preencher o formulário de contato ou agendamento no site, os dados aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredAppointments.map((lead) => {
            const status = lead.status || 'novo';
            const config = statusConfig[status] || statusConfig['interno'];
            const StatusIcon = config.icon;

            return (
              <div 
                key={lead.id} 
                className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 group"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center border border-secondary/20 shrink-0">
                      <span className="font-headline font-bold text-secondary text-lg">
                        {(lead.visitor_name || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-headline font-bold text-on-surface group-hover:text-secondary transition-colors">
                        {lead.visitor_name || 'Visitante Sem Nome'}
                      </h3>
                      <p className="text-[10px] text-outline uppercase tracking-widest font-bold">
                        ORIGEM: {lead.source || 'Não identificada'}
                      </p>
                    </div>
                  </div>
                  
                  <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border", config.color)}>
                    <StatusIcon className="w-3 h-3" />
                    {config.label}
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-3 text-sm text-on-surface-variant">
                    <Phone className="w-4 h-4 text-secondary/60" />
                    <span className="font-medium">{lead.visitor_phone || 'Telefone não informado'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-on-surface-variant">
                    <Mail className="w-4 h-4 text-secondary/60" />
                    <span className="font-medium">{lead.visitor_email || 'Email não informado'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-on-surface-variant">
                    <Clock className="w-4 h-4 text-secondary/60" />
                    <span className="font-medium">Recebido em: {new Date(lead.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                  {lead.area_interesse && (
                    <div className="mt-4 p-3 bg-surface-container rounded-xl border border-outline-variant/10">
                      <p className="text-[10px] text-outline font-bold uppercase tracking-widest mb-1">Área de Interesse</p>
                      <p className="text-sm text-on-surface font-medium">{lead.area_interesse}</p>
                    </div>
                  )}
                  {lead.preferred_date && (
                    <div className="mt-4 p-3 bg-secondary/5 rounded-xl border border-secondary/10">
                      <p className="text-[10px] text-secondary font-bold uppercase tracking-widest mb-1">Preferencia de Agendamento</p>
                      <p className="text-sm text-on-surface font-medium flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(lead.preferred_date)} às {lead.preferred_time || '--:--'}
                      </p>
                    </div>
                  )}
                  {lead.description && (
                    <div className="mt-4 p-3 bg-surface-container rounded-xl border border-outline-variant/10">
                      <p className="text-[10px] text-outline font-bold uppercase tracking-widest mb-1">Contexto / Descrição</p>
                      <p className="text-sm text-on-surface font-medium whitespace-pre-wrap">{lead.description}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => openWhatsApp(lead.visitor_phone, lead.visitor_name)}
                    className="flex-1 bg-secondary text-surface-container font-headline font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-secondary/90 transition-all active:scale-95 shadow-lg shadow-secondary/10"
                    disabled={!lead.visitor_phone}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Contatar via WhatsApp
                  </button>
                  
                  <div className="relative group/actions">
                    <button className="p-3 bg-surface-container-high rounded-xl text-on-surface hover:bg-surface-container-highest transition-all">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    <div className="absolute right-0 bottom-full mb-2 w-48 bg-surface-container rounded-xl shadow-2xl border border-outline-variant/20 hidden group-hover/actions:block overflow-hidden z-20">
                      <p className="px-4 py-2 text-[10px] text-outline font-bold uppercase tracking-widest bg-surface-container-low border-b border-outline-variant/10">Mudar Status</p>
                      <button onClick={() => updateStatus(lead.id, 'em_atendimento')} className="w-full text-left px-4 py-2.5 text-xs hover:bg-surface-container-high text-on-surface transition-colors">Em Atendimento</button>
                      <button onClick={() => updateStatus(lead.id, 'agendado')} className="w-full text-left px-4 py-2.5 text-xs hover:bg-surface-container-high text-on-surface transition-colors">Confirmar Agendamento</button>
                      <button onClick={() => updateStatus(lead.id, 'concluido')} className="w-full text-left px-4 py-2.5 text-xs hover:bg-surface-container-high text-on-surface transition-colors">Concluído</button>
                      <button onClick={() => updateStatus(lead.id, 'cancelado')} className="w-full text-left px-4 py-2.5 text-xs hover:bg-surface-container-high text-error transition-colors">Cancelar / Spam</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
