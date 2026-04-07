import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, MapPin, Users, X, Info, AlertTriangle, Gavel, MessageCircle, Video, Check, PhoneCall, ExternalLink, Link as LinkIcon, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

interface CalendarEvent {

  id: string;
  type: string;
  title: string;
  time?: string;
  date: string;
  color: string;
  source: 'task' | 'appointment';
  responsible?: string;
  description?: string;
}

interface SiteRequest {
  id: string;
  visitor_name: string;
  visitor_phone: string;
  visitor_email?: string;
  area_interesse?: string;
  preferred_date?: string;
  preferred_time?: string;
  description?: string;
  meet_link?: string;
  status: string;
  created_at: string;
}

// ── SiteRequestsPanel ──────────────────────────────────────────────────
// Advances a date string to next Monday if it falls on a weekend
const nextWeekday = (dateStr: string): string => {
  const d = new Date(dateStr + 'T12:00:00');
  if (d.getDay() === 6) d.setDate(d.getDate() + 2);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

function SiteRequestsPanel() {
  const [requests, setRequests] = useState<SiteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [meetLinks, setMeetLinks] = useState<Record<string, string>>({});
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleData, setRescheduleData] = useState<Record<string, { date: string; time: string }>>({});

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('source', 'site')
      .in('status', ['pendente', 'confirmado'])
      .order('created_at', { ascending: false });
    setRequests((data || []) as SiteRequest[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRequests();
    const ch = supabase.channel('site_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetchRequests)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchRequests]);

  const confirmRequest = async (req: SiteRequest) => {
    const link = meetLinks[req.id] || '';
    await supabase.from('appointments').update({ status: 'confirmado', meet_link: link || null }).eq('id', req.id);
    setConfirmingId(null);
    fetchRequests();
  };

  const reject = async (id: string) => {
    if (!window.confirm('Recusar essa solicitação?')) return;
    await supabase.from('appointments').update({ status: 'recusado' }).eq('id', id);
    fetchRequests();
  };

  const reschedule = async (req: SiteRequest) => {
    const d = rescheduleData[req.id];
    if (!d?.date) return;
    await supabase.from('appointments').update({
      preferred_date: d.date,
      preferred_time: d.time || null,
      start_time: `${d.date}T${d.time ? d.time + ':00' : '09:00:00'}`,
      status: 'pendente',
    }).eq('id', req.id);
    setReschedulingId(null);
    fetchRequests();
  };

  const waMessage = (req: SiteRequest) => {
    const date = req.preferred_date
      ? new Date(req.preferred_date + 'T12:00:00').toLocaleDateString('pt-BR')
      : 'a confirmar';
    const time = req.preferred_time || 'a confirmar';
    const link = req.meet_link || (meetLinks[req.id] || '');
    let msg = `Olá ${req.visitor_name}! Sua consulta está confirmada para ${date} às ${time}.`;
    if (link) msg += ` Acesse a reunião: ${link}`;
    msg += ' — Brenda Margalho Advocacia';
    return `https://wa.me/${req.visitor_phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
  };

  const pending = requests.filter(r => r.status === 'pendente');
  const confirmed = requests.filter(r => r.status === 'confirmado');

  if (loading) return null;
  if (requests.length === 0) return null;

  return (
    <div className="bg-surface-container-low rounded-3xl border border-outline-variant/10 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/10 bg-surface-container/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Inbox className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h3 className="font-headline font-bold text-on-surface text-sm">Solicitações do Site</h3>
            <p className="text-[11px] text-on-surface-variant">Pedidos de consulta enviados pelo site institucional</p>
          </div>
        </div>
        {pending.length > 0 && (
          <span className="bg-amber-500/15 text-amber-400 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-amber-500/20">
            {pending.length} pendente{pending.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="divide-y divide-outline-variant/10">
        {requests.map(req => (
          <div key={req.id} className="p-5 hover:bg-surface-container/40 transition-colors">
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              {/* Avatar + info */}
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center shrink-0 font-headline font-bold text-secondary text-sm">
                  {req.visitor_name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-on-surface text-sm">{req.visitor_name}</span>
                    <span className={cn(
                      'text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border',
                      req.status === 'pendente'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-green-500/10 text-green-400 border-green-500/20'
                    )}>
                      {req.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant">
                    {req.visitor_phone && (
                      <span className="flex items-center gap-1">
                        <PhoneCall className="w-3 h-3" />{req.visitor_phone}
                      </span>
                    )}
                    {req.area_interesse && (
                      <span className="flex items-center gap-1">
                        <Info className="w-3 h-3" />{req.area_interesse}
                      </span>
                    )}
                    {req.preferred_date && (
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        {new Date(req.preferred_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        {req.preferred_time && <> às {req.preferred_time}</>}
                      </span>
                    )}
                  </div>
                  {req.description && (
                    <p className="text-xs text-on-surface-variant mt-1 italic line-clamp-2">{req.description}</p>
                  )}
                  {req.meet_link && (
                    <a
                      href={req.meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-primary hover:underline"
                    >
                      <Video className="w-3 h-3" /> {req.meet_link}
                    </a>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 shrink-0 min-w-[180px]">
                {req.status === 'pendente' && (
                  <>
                    {confirmingId === req.id ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <a
                            href="https://meet.google.com/new"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-[11px] font-bold text-primary hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" /> Criar Google Meet
                          </a>
                        </div>
                        <input
                          type="text"
                          placeholder="Cole o link do Meet aqui"
                          value={meetLinks[req.id] || ''}
                          onChange={e => setMeetLinks(prev => ({ ...prev, [req.id]: e.target.value }))}
                          className="w-full bg-surface-container border border-outline-variant/20 rounded-lg px-3 py-2 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary/50"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => confirmRequest(req)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-bold hover:bg-green-500/20 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" /> Confirmar
                          </button>
                          <button
                            onClick={() => setConfirmingId(null)}
                            className="px-3 py-2 rounded-lg border border-outline-variant/20 text-outline text-xs hover:bg-surface-container-high transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmingId(req.id)}
                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-bold hover:bg-green-500/20 transition-colors"
                      >
                        <Video className="w-3.5 h-3.5" /> Confirmar + Meet
                      </button>
                    )}
                    <a
                      href={waMessage(req)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 text-xs font-bold hover:bg-[#25D366]/20 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                    <button
                      onClick={() => reject(req.id)}
                      className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold hover:bg-red-500/20 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> Recusar
                    </button>

                    {/* Reagendar — pendente */}
                    {reschedulingId === req.id ? (
                      <div className="space-y-2 pt-1 border-t border-outline-variant/10">
                        <p className="text-[10px] uppercase tracking-widest text-outline font-bold">Reagendar</p>
                        <input
                          type="date"
                          min={nextWeekday(new Date().toISOString().split('T')[0])}
                          value={rescheduleData[req.id]?.date || ''}
                          onChange={e => setRescheduleData(prev => ({ ...prev, [req.id]: { ...prev[req.id], date: nextWeekday(e.target.value) } }))}
                          className="w-full bg-surface-container border border-outline-variant/20 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary/50"
                        />
                        <select
                          value={rescheduleData[req.id]?.time || ''}
                          onChange={e => setRescheduleData(prev => ({ ...prev, [req.id]: { ...prev[req.id], time: e.target.value } }))}
                          className="w-full bg-surface-container border border-outline-variant/20 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary/50 appearance-none"
                        >

                          {['09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00','18:00'].map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <button
                            onClick={() => reschedule(req)}
                            disabled={!rescheduleData[req.id]?.date}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-bold hover:bg-primary/20 transition-colors disabled:opacity-40"
                          >
                            <Check className="w-3.5 h-3.5" /> Salvar
                          </button>
                          <button
                            onClick={() => setReschedulingId(null)}
                            className="px-3 py-2 rounded-lg border border-outline-variant/20 text-outline text-xs hover:bg-surface-container-high transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setReschedulingId(req.id); setConfirmingId(null); }}
                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold hover:bg-blue-500/20 transition-colors"
                      >
                        <CalendarIcon className="w-3.5 h-3.5" /> Reagendar
                      </button>
                    )}
                  </>
                )}

                {req.status === 'confirmado' && (
                  <>
                    <a
                      href={waMessage(req)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 text-xs font-bold hover:bg-[#25D366]/20 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Reenviar WhatsApp
                    </a>

                    {/* Reagendar — confirmado */}
                    {reschedulingId === req.id ? (
                      <div className="space-y-2 pt-1 border-t border-outline-variant/10">
                        <p className="text-[10px] uppercase tracking-widest text-outline font-bold">Novo Horário</p>
                        <input
                          type="date"
                          min={nextWeekday(new Date().toISOString().split('T')[0])}
                          value={rescheduleData[req.id]?.date || ''}
                          onChange={e => setRescheduleData(prev => ({ ...prev, [req.id]: { ...prev[req.id], date: nextWeekday(e.target.value) } }))}
                          className="w-full bg-surface-container border border-outline-variant/20 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary/50"
                        />
                        <select
                          value={rescheduleData[req.id]?.time || ''}
                          onChange={e => setRescheduleData(prev => ({ ...prev, [req.id]: { ...prev[req.id], time: e.target.value } }))}
                          className="w-full bg-surface-container border border-outline-variant/20 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary/50 appearance-none"
                        >

                          {['09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00','18:00'].map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <button
                            onClick={() => reschedule(req)}
                            disabled={!rescheduleData[req.id]?.date}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-bold hover:bg-primary/20 transition-colors disabled:opacity-40"
                          >
                            <Check className="w-3.5 h-3.5" /> Salvar
                          </button>
                          <button
                            onClick={() => setReschedulingId(null)}
                            className="px-3 py-2 rounded-lg border border-outline-variant/20 text-outline text-xs hover:bg-surface-container-high transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setReschedulingId(req.id)}
                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold hover:bg-blue-500/20 transition-colors"
                      >
                        <CalendarIcon className="w-3.5 h-3.5" /> Reagendar
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Agenda() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<{id: string, name: string, role: string} | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New Event Form State
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('Reunião');
  const [newDate, setNewDate] = useState(nextWeekday(format(new Date(), 'yyyy-MM-dd')));
  const [newTime, setNewTime] = useState('09:00');
  const [newDesc, setNewDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchEvents = useCallback(async (u: any) => {
    setLoading(true);
    try {
      // 1. Fetch Tasks (Activities) - RLS handles visibility
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .or('fatal_date.not.is.null,ideal_date.not.is.null');

      // 2. Fetch Appointments - RLS handles visibility
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*');

      const unifiedEvents: CalendarEvent[] = [];

      tasks?.forEach(t => {
        if (t.fatal_date) {
          unifiedEvents.push({
            id: `task-fatal-${t.id}`,
            title: `[FATAL] ${t.description}`,
            date: t.fatal_date,
            type: t.task_type || 'Prazo',
            color: 'bg-error',
            source: 'task',
            responsible: t.responsible
          });
        }
        if (t.ideal_date) {
          unifiedEvents.push({
            id: `task-ideal-${t.id}`,
            title: t.description,
            date: t.ideal_date,
            type: t.task_type || 'Tarefa',
            color: 'bg-blue-500',
            source: 'task',
            responsible: t.responsible
          });
        }
      });

      appointments?.forEach(a => {
        unifiedEvents.push({
          id: `app-${a.id}`,
          title: a.title,
          date: a.start_time.split('T')[0],
          time: format(parseISO(a.start_time), 'HH:mm'),
          type: a.type,
          color: a.type === 'Audiência' ? 'bg-secondary' : 'bg-amber-500',
          source: 'appointment',
          description: a.description
        });
      });

      setEvents(unifiedEvents);
    } catch (err) {
      console.error('Error fetching calendar data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, name')
          .eq('id', user.id)
          .single();

        const u = {
          id: user.id,
          name: profile?.name || user.user_metadata?.full_name || '',
          role: profile?.role || ''
        };
        setUserData(u);
        fetchEvents(u);

        // Realtime
        const tasksChannel = supabase.channel('agenda_tasks')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchEvents(u))
          .subscribe();

        const appsChannel = supabase.channel('agenda_apps')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => fetchEvents(u))
          .subscribe();

        return () => {
          supabase.removeChannel(tasksChannel);
          supabase.removeChannel(appsChannel);
        };
      }
    });
  }, [fetchEvents]);

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;
    setSubmitting(true);

    const startTime = `${newDate}T${newTime}:00Z`;

    const { error } = await supabase
      .from('appointments')
      .insert({
        user_id: userData.id,
        title: newTitle,
        type: newType,
        start_time: startTime,
        description: newDesc
      });

    if (!error) {
      setIsModalOpen(false);
      setNewTitle('');
      setNewDesc('');
      fetchEvents(userData);
    }
    setSubmitting(false);
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const todayEvents = events.filter(e => isSameDay(parseISO(e.date), new Date()));

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface">Agenda Jurídica</h2>
            {userData?.role === 'Administrador' && (
              <span className="bg-secondary/15 text-secondary text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full border border-secondary/20">Modo Admin</span>
            )}
          </div>
          <p className="text-on-surface-variant">Controle seus prazos, audiências e reuniões com precisão absoluta.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-secondary text-on-secondary font-headline font-bold hover:opacity-90 transition-all shadow-lg shadow-secondary/20 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Novo Compromisso
          </button>
        </div>
      </div>

      <SiteRequestsPanel />

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-8 bg-surface-container-low rounded-3xl overflow-hidden shadow-2xl border border-outline-variant/5">
          <div className="p-6 flex items-center justify-between border-b border-outline-variant/10 bg-surface-container-low/80 backdrop-blur-md">
            <h3 className="text-xl font-headline font-bold text-on-surface capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </h3>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="p-2 rounded-xl hover:bg-surface-container-high text-outline transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setCurrentDate(new Date())}
                className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-secondary hover:bg-secondary/10 rounded-xl transition-colors"
              >
                Hoje
              </button>
              <button 
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="p-2 rounded-xl hover:bg-surface-container-high text-outline transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 bg-surface-container-low/50 border-b border-outline-variant/10">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
              <div key={day} className="py-3 text-center text-[10px] uppercase tracking-widest font-black text-outline">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 grid-rows-5 h-[650px]">
            {calendarDays.map((day, i) => {
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isToday = isSameDay(day, new Date());
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayEvents = events.filter(e => e.date === dateStr);
              
              return (
                <div 
                  key={i} 
                  className={cn(
                    "border-r border-b border-outline-variant/5 p-2 flex flex-col gap-1.5 transition-colors hover:bg-surface-container-high/30 group",
                    !isCurrentMonth && "opacity-20",
                    isToday && "bg-secondary/5"
                  )}
                >
                  <span className={cn(
                    "text-xs font-bold w-7 h-7 flex items-center justify-center rounded-xl mb-1 transition-all group-hover:scale-110",
                    isToday ? "bg-secondary text-on-secondary shadow-lg shadow-secondary/20" : "text-on-surface"
                  )}>
                    {format(day, 'd')}
                  </span>
                  
                  <div className="space-y-1 overflow-y-auto max-h-[100px] scrollbar-none">
                    {dayEvents.slice(0, 3).map(event => (
                      <div 
                        key={event.id}
                        className={cn(
                          "px-1.5 py-0.5 rounded-md border-l-2 text-[9px] font-bold truncate transition-all hover:brightness-110",
                          event.color,
                          "bg-opacity-20 border-opacity-100",
                          event.color === 'bg-error' ? 'text-error' : 
                          event.color === 'bg-secondary' ? 'text-secondary' : 'text-blue-400'
                        )}
                        title={event.title}
                      >
                        {event.time && <span className="mr-1 opacity-70">{event.time}</span>}
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[8px] font-black text-outline text-center uppercase tracking-tighter">
                        + {dayEvents.length - 3} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-surface-container-low p-8 rounded-[2.5rem] shadow-2xl border border-outline-variant/5 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-5">
                <CalendarIcon className="w-24 h-24 text-secondary rotate-12" />
             </div>
             
            <h4 className="text-lg font-headline font-bold text-on-surface mb-6 flex items-center gap-3 relative z-10">
              <Clock className="w-5 h-5 text-secondary" />
              Hoje, {format(new Date(), "d 'de' MMMM", { locale: ptBR })}
            </h4>
            
            <div className="space-y-4 relative z-10">
              {todayEvents.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center gap-4 bg-surface-container-high/30 rounded-3xl border border-dashed border-outline-variant/20 font-body">
                   <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center">
                      <Gavel className="w-6 h-6 text-outline opacity-40" />
                   </div>
                   <p className="text-sm text-outline font-medium">Sem compromissos para hoje.</p>
                </div>
              ) : (
                todayEvents.map((event) => (
                  <div key={event.id} className="group p-5 rounded-3xl bg-surface-container-high/40 hover:bg-surface-container-high transition-all border border-outline-variant/10 cursor-pointer shadow-sm hover:shadow-md">
                    <div className="flex justify-between items-start mb-3">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-opacity-15 border border-opacity-20",
                        event.color,
                        event.color === 'bg-error' ? 'text-error border-error' : 
                        event.color === 'bg-secondary' ? 'text-secondary border-secondary' : 'text-blue-400 border-blue-400'
                      )}>
                        {event.type}
                      </span>
                      {event.time && <span className="text-xs font-black text-secondary">{event.time}</span>}
                    </div>
                    <h5 className="text-sm font-bold text-on-surface group-hover:text-secondary transition-colors mb-2">{event.title}</h5>
                    
                    {event.responsible && (
                       <p className="text-[10px] text-on-surface-variant font-medium flex items-center gap-1.5 opacity-80 uppercase tracking-tighter">
                         <Users className="w-3.5 h-3.5" />
                         Resp: {event.responsible}
                       </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-surface-container-low p-8 rounded-[2.5rem] shadow-2xl border border-outline-variant/5">
            <h4 className="text-lg font-headline font-bold text-on-surface mb-6">Próximos Prazos</h4>
            <div className="space-y-4">
              {events
                .filter(e => e.color === 'bg-error' && new Date(e.date) > new Date())
                .sort((a,b) => a.date.localeCompare(b.date))
                .slice(0, 3)
                .map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-high/30 border border-outline-variant/10 hover:border-error/30 transition-colors">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-on-surface block truncate">{item.title.replace('[FATAL] ', '')}</span>
                      <span className="text-[10px] text-error font-black uppercase tracking-tighter">DATA: {format(parseISO(item.date), 'dd/MM/yyyy')}</span>
                    </div>
                  </div>
                ))}
              {events.filter(e => e.color === 'bg-error').length === 0 && (
                <p className="text-xs text-outline text-center py-4">Nenhum prazo fatal pendente.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New Appointment Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-surface/60 backdrop-blur-sm" 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-[500px] bg-surface-container-low p-1 border border-outline-variant/10 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]"
            >
              <div className="bg-surface-container-low backdrop-blur-2xl p-8 sm:p-10 rounded-[2.3rem] border border-white/[0.03]">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-2xl font-headline font-black text-on-surface">Novo Compromisso</h3>
                    <p className="text-on-surface-variant text-sm mt-1">Sincronizado com sua agenda pessoal.</p>
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 rounded-full hover:bg-surface-container-high transition-colors"
                  >
                    <X className="w-5 h-5 text-outline" />
                  </button>
                </div>

                <form onSubmit={handleCreateAppointment} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline ml-1">Título</label>
                    <input 
                      type="text" 
                      required
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      placeholder="Ex: Reunião com Cliente Silva"
                      className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-2xl px-5 py-4 text-sm text-on-surface outline-none focus:border-secondary/50 transition-all font-body shadow-inner"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline ml-1">Tipo</label>
                      <select 
                        value={newType}
                        onChange={e => setNewType(e.target.value)}
                        className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-2xl px-5 py-4 text-sm text-on-surface outline-none focus:border-secondary/50 appearance-none font-body shadow-inner"
                      >
                        <option value="Reunião">Reunião</option>
                        <option value="Audiência">Audiência</option>
                        <option value="Conciliação">Conciliação</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline ml-1">Horário</label>
                      <select
                        required
                        value={newTime}
                        onChange={e => setNewTime(e.target.value)}
                        className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-2xl px-5 py-4 text-sm text-on-surface outline-none focus:border-secondary/50 font-body shadow-inner appearance-none"
                      >
                        {['09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00','18:00'].map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline ml-1">Data</label>
                    <input 
                      type="date" 
                      required
                      min={nextWeekday(format(new Date(), 'yyyy-MM-dd'))}
                      value={newDate}
                      onChange={e => setNewDate(nextWeekday(e.target.value))}
                      className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-2xl px-5 py-4 text-sm text-on-surface outline-none focus:border-secondary/50 font-body shadow-inner"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline ml-1">Descrição</label>
                    <textarea 
                      value={newDesc}
                      onChange={e => setNewDesc(e.target.value)}
                      rows={3}
                      placeholder="Observações importantes..."
                      className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-2xl px-5 py-4 text-sm text-on-surface outline-none focus:border-secondary/50 transition-all resize-none font-body shadow-inner"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-secondary text-on-secondary font-headline font-black py-5 rounded-2xl shadow-xl shadow-secondary/20 hover:opacity-90 active:scale-[0.98] transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                  >
                    {submitting ? 'Criando...' : 'Salvar Compromisso'}
                    {!submitting && <Plus className="w-4 h-4" />}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
