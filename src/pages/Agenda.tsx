import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, Users, X, AlertTriangle, Gavel, MessageCircle, Video, Check, PhoneCall, Inbox, Target, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useAuthUser } from '@/lib/authContext';
import { getCached, setCached } from '@/lib/pageCache';

type EventCategory = 'fatal' | 'ideal' | 'hearing' | 'appointment';

interface CalendarEvent {
  id: string;
  category: EventCategory;
  type: string;
  title: string;
  time?: string;
  date: string;
  source: 'task' | 'appointment' | 'hearing';
  responsible?: string;
  description?: string;
  clientName?: string;
  processNumber?: string;
  taskType?: string;
}

const CATEGORY_META: Record<EventCategory, {
  label: string;
  shortTag: string;
  pillClass: string;
  badgeClass: string;
  dotClass: string;
}> = {
  fatal: {
    label: 'Prazo Fatal',
    shortTag: 'FATAL',
    pillClass: 'bg-error/15 text-error border-error',
    badgeClass: 'bg-error/15 text-error border-error/30',
    dotClass: 'bg-error',
  },
  ideal: {
    label: 'Meta Ideal',
    shortTag: 'META',
    pillClass: 'bg-blue-500/15 text-blue-400 border-blue-500',
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    dotClass: 'bg-blue-500',
  },
  hearing: {
    label: 'Audiência',
    shortTag: 'AUD',
    pillClass: 'bg-secondary/15 text-secondary border-secondary',
    badgeClass: 'bg-secondary/15 text-secondary border-secondary/30',
    dotClass: 'bg-secondary',
  },
  appointment: {
    label: 'Compromisso',
    shortTag: 'COMP',
    pillClass: 'bg-amber-500/15 text-amber-400 border-amber-500',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    dotClass: 'bg-amber-500',
  },
};

function getDeadlineUrgency(dateStr: string): { label: string; className: string; diffDays: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (diffDays < 0) {
    const abs = Math.abs(diffDays);
    return { label: `Atrasado ${abs}d`, className: 'bg-error text-white', diffDays };
  }
  if (diffDays === 0) {
    return { label: 'Vence hoje', className: 'bg-error/20 text-error border border-error/40', diffDays };
  }
  if (diffDays === 1) {
    return { label: 'Amanhã', className: 'bg-amber-500/20 text-amber-400 border border-amber-500/40', diffDays };
  }
  return { label: `Em ${diffDays}d`, className: 'bg-surface-container-highest text-on-surface-variant', diffDays };
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
    try {
      const { data } = await supabase
        .from('appointments')
        .select('*')
        .eq('source', 'site')
        .in('status', ['pendente', 'confirmado'])
        .order('created_at', { ascending: false });
      setRequests((data || []) as SiteRequest[]);
    } catch (err) {
      console.error('Erro ao carregar solicitações:', err);
    } finally {
      setLoading(false);
    }
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
  const authUser = useAuthUser();
  const cachedEvents = getCached<CalendarEvent[]>('agenda_events_v2');

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [categoryFilter, setCategoryFilter] = useState<'all' | EventCategory>('all');
  const [events, setEvents] = useState<CalendarEvent[]>(() => cachedEvents || []);
  const [loading, setLoading] = useState<boolean>(() => !cachedEvents);
  const [userData, setUserData] = useState<{id: string, name: string, role: string} | null>(() =>
    authUser ? { id: authUser.id, name: authUser.name, role: authUser.role } : null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New Event Form State
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('Reunião');
  const [newDate, setNewDate] = useState(nextWeekday(format(new Date(), 'yyyy-MM-dd')));
  const [newTime, setNewTime] = useState('09:00');
  const [newDesc, setNewDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchEvents = useCallback(async (_u?: any, showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const [{ data: tasks }, { data: appointments }, { data: hearings }] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, description, fatal_date, ideal_date, task_type, responsible, client_name, process_number, status')
          .neq('status', 'Concluída')
          .or('fatal_date.not.is.null,ideal_date.not.is.null'),
        supabase
          .from('appointments')
          .select('id, title, start_time, type, description'),
        supabase
          .from('hearings')
          .select('id, process_number, client_name, hearing_type, hearing_date, hearing_time, observations')
          .neq('status', 'cancelada'),
      ]);

      const unifiedEvents: CalendarEvent[] = [];

      tasks?.forEach(t => {
        if (t.fatal_date) {
          unifiedEvents.push({
            id: `task-fatal-${t.id}`,
            category: 'fatal',
            title: t.description || t.task_type || 'Prazo Fatal',
            date: t.fatal_date,
            type: 'Prazo Fatal',
            taskType: t.task_type || undefined,
            source: 'task',
            responsible: t.responsible || undefined,
            clientName: t.client_name || undefined,
            processNumber: t.process_number || undefined,
          });
        }
        if (t.ideal_date) {
          unifiedEvents.push({
            id: `task-ideal-${t.id}`,
            category: 'ideal',
            title: t.description || t.task_type || 'Meta Ideal',
            date: t.ideal_date,
            type: 'Meta Ideal',
            taskType: t.task_type || undefined,
            source: 'task',
            responsible: t.responsible || undefined,
            clientName: t.client_name || undefined,
            processNumber: t.process_number || undefined,
          });
        }
      });

      hearings?.forEach(h => {
        if (!h.hearing_date) return;
        unifiedEvents.push({
          id: `hearing-${h.id}`,
          category: 'hearing',
          title: `Audiência ${h.hearing_type || ''}`.trim(),
          date: h.hearing_date,
          time: h.hearing_time ? h.hearing_time.slice(0, 5) : undefined,
          type: 'Audiência',
          source: 'hearing',
          clientName: h.client_name || undefined,
          processNumber: h.process_number || undefined,
          description: h.observations || undefined,
        });
      });

      appointments?.forEach(a => {
        const isAud = a.type === 'Audiência' || a.type === 'Conciliação';
        unifiedEvents.push({
          id: `app-${a.id}`,
          category: isAud ? 'hearing' : 'appointment',
          title: a.title,
          date: a.start_time.split('T')[0],
          time: format(parseISO(a.start_time), 'HH:mm'),
          type: a.type,
          source: 'appointment',
          description: a.description || undefined,
        });
      });

      setEvents(unifiedEvents);
      setCached('agenda_events_v2', unifiedEvents);
    } catch (err) {
      console.error('Error fetching calendar data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authUser) {
      setUserData({ id: authUser.id, name: authUser.name, role: authUser.role });
    }
    const hasCache = Boolean(getCached('agenda_events_v2'));
    fetchEvents(authUser, !hasCache);

    const tasksChannel = supabase.channel('agenda_tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchEvents(authUser, false))
      .subscribe();

    const appsChannel = supabase.channel('agenda_apps')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => fetchEvents(authUser, false))
      .subscribe();

    const hearingsChannel = supabase.channel('agenda_hearings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hearings' }, () => fetchEvents(authUser, false))
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(appsChannel);
      supabase.removeChannel(hearingsChannel);
    };
  }, [authUser?.id, fetchEvents]);

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

  const visibleEvents = useMemo(() => {
    if (categoryFilter === 'all') return events;
    return events.filter(e => e.category === categoryFilter);
  }, [events, categoryFilter]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    const priorityOrder: Record<EventCategory, number> = { fatal: 0, hearing: 1, ideal: 2, appointment: 3 };
    for (const ev of visibleEvents) {
      const list = map.get(ev.date) || [];
      list.push(ev);
      map.set(ev.date, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => priorityOrder[a.category] - priorityOrder[b.category]);
    }
    return map;
  }, [visibleEvents]);

  const selectedDateStr = format(selectedDay, 'yyyy-MM-dd');
  const selectedDayEvents = eventsByDate.get(selectedDateStr) || [];
  const isSelectedToday = isSameDay(selectedDay, new Date());

  const fatalRadar = useMemo(() => {
    return events
      .filter(e => e.category === 'fatal')
      .map(e => ({ ...e, urgency: getDeadlineUrgency(e.date) }))
      .filter(e => e.urgency.diffDays <= 30)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 6);
  }, [events]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h2 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface">Agenda Jurídica</h2>
            {userData?.role === 'Administrador' && (
              <span className="bg-secondary/15 text-secondary text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-secondary/20">Modo Admin</span>
            )}
          </div>
          <p className="text-sm text-on-surface-variant">Clique em qualquer dia no calendário para ver todos os prazos fatais, metas ideais e audiências.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-secondary text-on-secondary font-headline font-bold hover:opacity-90 transition-opacity shadow-lg shadow-secondary/20 text-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Compromisso
          </button>
        </div>
      </div>

      <SiteRequestsPanel />

      {/* Legenda clara e filtros rápidos por tipo de prazo */}
      <div className="flex flex-wrap items-center gap-2 bg-surface-container-low px-4 py-3 rounded-2xl border border-outline-variant/10">
        <span className="text-[10px] font-black uppercase tracking-widest text-outline mr-1">Exibir:</span>
        <button
          onClick={() => setCategoryFilter('all')}
          className={cn(
            "px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border",
            categoryFilter === 'all'
              ? "bg-secondary text-on-secondary border-secondary"
              : "bg-surface-container-high text-on-surface-variant border-outline-variant/10 hover:text-on-surface"
          )}
        >
          Todos ({events.length})
        </button>
        {(Object.keys(CATEGORY_META) as EventCategory[]).map((cat) => {
          const meta = CATEGORY_META[cat];
          const count = events.filter(e => e.category === cat).length;
          const active = categoryFilter === cat;
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(active ? 'all' : cat)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border",
                active
                  ? meta.pillClass
                  : "bg-surface-container-high/60 text-on-surface-variant border-outline-variant/10 hover:text-on-surface"
              )}
            >
              <span className={cn("w-2 h-2 rounded-full", meta.dotClass)} />
              <span>{meta.label}</span>
              <span className="opacity-70 text-[11px]">({count})</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-12 gap-6 items-start">
        <div className="col-span-12 lg:col-span-8 bg-surface-container-low rounded-3xl overflow-hidden shadow-xl border border-outline-variant/10">
          <div className="px-6 py-4 flex items-center justify-between border-b border-outline-variant/10 bg-surface-container-low">
            <h3 className="text-xl font-headline font-bold text-on-surface capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </h3>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="p-2 rounded-xl hover:bg-surface-container-high text-outline hover:text-on-surface transition-colors"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={() => {
                  const now = new Date();
                  setCurrentDate(now);
                  setSelectedDay(now);
                }}
                className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-secondary hover:bg-secondary/10 rounded-xl transition-colors"
              >
                Hoje
              </button>
              <button 
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="p-2 rounded-xl hover:bg-surface-container-high text-outline hover:text-on-surface transition-colors"
                aria-label="Próximo mês"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 bg-surface-container-high/30 border-b border-outline-variant/10">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
              <div key={day} className="py-2.5 text-center text-[10px] uppercase tracking-widest font-black text-outline">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 auto-rows-[minmax(112px,auto)]">
            {calendarDays.map((day, i) => {
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isToday = isSameDay(day, new Date());
              const isSelected = isSameDay(day, selectedDay);
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDate.get(dateStr) || [];
              const fatalCount = dayEvents.filter(e => e.category === 'fatal').length;
              
              return (
                <button
                  type="button"
                  key={i}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "border-r border-b border-outline-variant/10 p-2 flex flex-col gap-1.5 text-left transition-colors hover:bg-surface-container-high/40 focus:outline-none",
                    !isCurrentMonth && "opacity-30 bg-surface-container-lowest/30",
                    isToday && !isSelected && "bg-secondary/5",
                    isSelected && "bg-secondary/10 ring-2 ring-inset ring-secondary/60"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={cn(
                      "text-xs font-bold w-7 h-7 flex items-center justify-center rounded-xl",
                      isToday
                        ? "bg-secondary text-on-secondary shadow-md"
                        : isSelected
                        ? "bg-surface-container-highest text-secondary"
                        : "text-on-surface"
                    )}>
                      {format(day, 'd')}
                    </span>
                    {fatalCount > 0 && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-error/20 text-error">
                        {fatalCount} fatal
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1 w-full">
                    {dayEvents.slice(0, 3).map(event => {
                      const meta = CATEGORY_META[event.category];
                      return (
                        <div 
                          key={event.id}
                          className={cn(
                            "px-1.5 py-1 rounded-md border-l-2 text-[10px] leading-tight font-semibold truncate flex items-center gap-1",
                            meta.pillClass
                          )}
                          title={`${meta.label}: ${event.title}${event.clientName ? ` — ${event.clientName}` : ''}`}
                        >
                          <span className="text-[8px] font-black uppercase opacity-80 shrink-0">
                            {event.time || meta.shortTag}
                          </span>
                          <span className="truncate">{event.clientName ? `${event.clientName.split(' ')[0]} · ${event.title}` : event.title}</span>
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] font-bold text-secondary bg-secondary/10 rounded px-1.5 py-0.5 text-center">
                        + {dayEvents.length - 3} itens
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Painel lateral: Detalhes do dia selecionado + Radar de Prazos Fatais */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-surface-container-low p-6 rounded-3xl shadow-xl border border-outline-variant/10">
            <div className="flex items-start justify-between gap-2 mb-5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-secondary block mb-1">
                  {isSelectedToday ? 'Agenda de Hoje' : 'Dia Selecionado'}
                </span>
                <h4 className="text-lg font-headline font-bold text-on-surface capitalize flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-secondary shrink-0" />
                  {format(selectedDay, "d 'de' MMMM, EEEE", { locale: ptBR })}
                </h4>
              </div>
              {!isSelectedToday && (
                <button
                  onClick={() => {
                    const now = new Date();
                    setSelectedDay(now);
                    setCurrentDate(now);
                  }}
                  className="text-[10px] font-bold text-secondary hover:underline shrink-0 mt-1"
                >
                  Ir para hoje
                </button>
              )}
            </div>
            
            <div className="space-y-3 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
              {loading && selectedDayEvents.length === 0 ? (
                <p className="text-xs text-outline py-6 text-center">Carregando prazos...</p>
              ) : selectedDayEvents.length === 0 ? (
                <div className="py-10 text-center flex flex-col items-center gap-3 bg-surface-container-high/20 rounded-2xl border border-dashed border-outline-variant/20">
                  <Gavel className="w-6 h-6 text-outline opacity-40" />
                  <p className="text-xs text-outline font-medium">Nenhum prazo ou compromisso neste dia.</p>
                </div>
              ) : (
                selectedDayEvents.map((event) => {
                  const meta = CATEGORY_META[event.category];
                  const urgency = (event.category === 'fatal' || event.category === 'ideal')
                    ? getDeadlineUrgency(event.date)
                    : null;

                  return (
                    <div key={event.id} className="p-4 rounded-2xl bg-surface-container-high/40 border border-outline-variant/10 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border", meta.badgeClass)}>
                          {event.type}
                        </span>
                        {event.time && (
                          <span className="text-xs font-black text-secondary flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {event.time}
                          </span>
                        )}
                        {urgency && (
                          <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold", urgency.className)}>
                            {urgency.label}
                          </span>
                        )}
                      </div>

                      <h5 className="text-sm font-bold text-on-surface leading-snug">{event.title}</h5>

                      {(event.clientName || event.processNumber) && (
                        <div className="text-xs text-on-surface-variant space-y-0.5 pt-1 border-t border-outline-variant/10">
                          {event.clientName && (
                            <p className="font-semibold text-on-surface/90 truncate">Cliente: {event.clientName}</p>
                          )}
                          {event.processNumber && (
                            <p className="font-mono text-[11px] text-outline truncate">Proc: {event.processNumber}</p>
                          )}
                        </div>
                      )}

                      {event.responsible && (
                        <p className="text-[11px] text-outline font-medium flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 shrink-0" />
                          <span>Resp: {event.responsible}</span>
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-surface-container-low p-6 rounded-3xl shadow-xl border border-outline-variant/10">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-headline font-bold text-on-surface flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-error" />
                Radar de Prazos Fatais
              </h4>
              <span className="text-[10px] font-bold text-outline uppercase">Atrasados e 30d</span>
            </div>
            <div className="space-y-2.5">
              {fatalRadar.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    const d = parseISO(item.date);
                    setSelectedDay(d);
                    setCurrentDate(d);
                  }}
                  className="w-full text-left p-3.5 rounded-2xl bg-surface-container-high/30 border border-outline-variant/10 hover:border-error/40 transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono font-bold text-on-surface-variant">
                      {format(parseISO(item.date), 'dd/MM/yyyy')}
                    </span>
                    <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold", item.urgency.className)}>
                      {item.urgency.label}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-on-surface line-clamp-2">{item.title}</p>
                  {item.clientName && (
                    <p className="text-[11px] text-outline truncate">{item.clientName}</p>
                  )}
                </button>
              ))}
              {fatalRadar.length === 0 && (
                <p className="text-xs text-outline text-center py-4">Nenhum prazo fatal atrasado ou nos próximos 30 dias.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New Appointment Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75" onClick={() => setIsModalOpen(false)}>
          <div
            className="relative w-full max-w-[500px] bg-surface-container-low border border-outline-variant/20 rounded-3xl shadow-2xl p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-headline font-black text-on-surface">Novo Compromisso</h3>
                <p className="text-on-surface-variant text-xs mt-1">Adicione uma reunião, audiência ou lembrete à agenda.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full hover:bg-surface-container-high transition-colors"
              >
                <X className="w-5 h-5 text-outline" />
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Título</label>
                <input 
                  type="text" 
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Ex: Reunião com Cliente Silva"
                  className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl px-4 py-3 text-sm text-on-surface outline-none focus:border-secondary/50 font-body"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Tipo</label>
                  <select 
                    value={newType}
                    onChange={e => setNewType(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl px-4 py-3 text-sm text-on-surface outline-none focus:border-secondary/50 appearance-none font-body"
                  >
                    <option value="Reunião">Reunião</option>
                    <option value="Audiência">Audiência</option>
                    <option value="Conciliação">Conciliação</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Horário</label>
                  <select
                    required
                    value={newTime}
                    onChange={e => setNewTime(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl px-4 py-3 text-sm text-on-surface outline-none focus:border-secondary/50 font-body appearance-none"
                  >
                    {['09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00','18:00'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Data</label>
                <input 
                  type="date" 
                  required
                  min={nextWeekday(format(new Date(), 'yyyy-MM-dd'))}
                  value={newDate}
                  onChange={e => setNewDate(nextWeekday(e.target.value))}
                  className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl px-4 py-3 text-sm text-on-surface outline-none focus:border-secondary/50 font-body"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Descrição</label>
                <textarea 
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  rows={3}
                  placeholder="Observações importantes..."
                  className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl px-4 py-3 text-sm text-on-surface outline-none focus:border-secondary/50 resize-none font-body"
                />
              </div>

              <button 
                type="submit"
                disabled={submitting}
                className="w-full bg-secondary text-on-secondary font-headline font-black py-3.5 rounded-xl shadow-lg shadow-secondary/20 hover:opacity-90 transition-opacity uppercase tracking-widest text-xs flex items-center justify-center gap-2"
              >
                {submitting ? 'Criando...' : 'Salvar Compromisso'}
                {!submitting && <Plus className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
