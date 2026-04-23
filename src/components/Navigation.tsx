import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

function useUser() {
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);
  return user;
}
import { 
  LayoutDashboard, 
  Gavel, 
  Users, 
  Calendar, 
  FileText, 
  Settings, 
  HelpCircle,
  Bell,
  LogOut,
  CheckCheck,
  ClipboardList,
  X,
  Sparkles,
  Bookmark,
  Globe,
  BarChart2,
  MessageSquare,
  Headset,
  Palette
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Gavel, label: 'Processos', path: '/processos' },
  { icon: Users, label: 'Clientes', path: '/clientes' },
  { icon: Calendar, label: 'Agenda', path: '/agenda' },
  { icon: Bookmark, label: 'Intimações', path: '/intimacoes', adminOnly: true },
  { icon: FileText, label: 'Documentos', path: '/documentos' },
  { icon: Sparkles, label: 'IA Jurídica', path: '/ia-juridica', badge: 'Breve' },
  { icon: Palette, label: 'Marketing Visual', path: '/marketing', adminOnly: true },
  { icon: MessageSquare, label: 'Atendimento', path: '/atendimento', adminOnly: true },
  { icon: BarChart2, label: 'Analytics', path: '/analytics', adminOnly: true },
  { icon: Globe, label: 'Blog (Site)', path: '/blog', adminOnly: true },
  { icon: Settings, label: 'Configurações', path: '/configuracoes' },
];

const taskTypeColors: Record<string, string> = {
  'Petição': 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  'Protocolo': 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  'Diligência': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  'Audiência de Instrução ou Conciliação': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  'Análise de processo': 'bg-secondary/15 text-secondary border-secondary/20',
};

function NotificationDropdown({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fetch unread count separately to get total accurate count
  async function fetchUnreadCount() {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    
    if (!error) setUnreadCount(count || 0);
  }

  async function fetchNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*, tasks(description, task_type, fatal_date, ideal_date)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(15);
    setNotifications(data || []);
  }

  useEffect(() => {
    if (!userId) return;
    fetchNotifications();
    fetchUnreadCount();

    // Realtime subscription
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => { 
          fetchNotifications(); 
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function markAllRead() {
    setMarking(true);
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    
    if (error) {
      console.error('Error marking all as read:', error);
    } else {
      await Promise.all([fetchNotifications(), fetchUnreadCount()]);
    }
    setMarking(false);
  }

  async function markSingleRead(id: string) {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (!error) {
       setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
       fetchUnreadCount();
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative text-primary hover:text-secondary transition-colors"
        aria-label="Notificações"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-secondary text-on-secondary rounded-full border-2 border-surface font-bold text-[10px] flex items-center justify-center px-0.5">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-[380px] max-h-[520px] bg-surface-container rounded-2xl shadow-2xl border border-outline-variant/20 z-[200] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-5 py-4 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low shrink-0">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-secondary" />
              <h3 className="font-headline font-bold text-sm text-on-surface">Notificações</h3>
              {unreadCount > 0 && (
                <span className="bg-secondary/15 text-secondary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={marking}
                  className="text-[10px] text-outline hover:text-secondary font-bold flex items-center gap-1 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Marcar tudo como lida
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-surface-container-high rounded-full text-outline transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center gap-3">
                <Bell className="w-8 h-8 text-outline" />
                <p className="text-sm text-on-surface-variant font-medium">Nenhuma notificação</p>
                <p className="text-xs text-outline">Você receberá alertas quando for atribuído a uma tarefa.</p>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/10">
                {notifications.map(n => {
                  const taskType = n.task_type || n.tasks?.task_type;
                  const colorCls = taskTypeColors[taskType] || 'bg-secondary/10 text-secondary border-secondary/20';
                  const timeAgo = formatTimeAgo(n.created_at);

                  return (
                    <div
                      key={n.id}
                      onClick={() => !n.is_read && markSingleRead(n.id)}
                      className={cn(
                        "px-5 py-4 cursor-pointer transition-all hover:bg-surface-container-low",
                        !n.is_read && "bg-secondary/5 border-l-2 border-secondary"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn("mt-0.5 shrink-0 w-7 h-7 rounded-lg flex items-center justify-center", colorCls)}>
                          <ClipboardList className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn("text-xs font-bold", n.is_read ? "text-on-surface-variant" : "text-on-surface")}>
                              {n.title}
                            </p>
                            {!n.is_read && (
                              <span className="w-2 h-2 bg-secondary rounded-full shrink-0 mt-0.5" />
                            )}
                          </div>
                          {taskType && (
                            <span className={cn("mt-1.5 inline-flex text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border", colorCls)}>
                              {taskType}
                            </span>
                          )}
                          {n.body && (
                            <p className="text-[11px] text-on-surface-variant mt-1.5 line-clamp-2 leading-relaxed">
                              {n.body}
                            </p>
                          )}
                          <p className="text-[10px] text-outline mt-2">{timeAgo}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Agora mesmo';
  if (mins < 60) return `Há ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `Há ${days} dia${days > 1 ? 's' : ''}`;
}

export function Sidebar({ onLogout, userRole }: { onLogout: () => void, userRole: string | null }) {
  const user = useUser();
  const userName = user?.user_metadata?.full_name || 'Usuário';
  const role = userRole || user?.user_metadata?.role || 'Advogado';
  const isEstagiario = role === 'Estagiário';

  const [intimacoesCount, setIntimacoesCount] = useState<number | null>(null);

  // Busca apenas intimações de HOJE não lidas para o badge
  useEffect(() => {
    if (isEstagiario) return;
    async function fetchTodayUnread() {
      try {
        // 1. Get DJEN settings
        const { data: settings } = await supabase
          .from('system_settings')
          .select('key, value')
          .in('key', ['djen_nome_padrao', 'djen_oab_padrao']);

        const nome = settings?.find(s => s.key === 'djen_nome_padrao')?.value || '';
        const oab = settings?.find(s => s.key === 'djen_oab_padrao')?.value || '';
        if (!nome && !oab) return;

        // 2. Fetch a page of results to find today's items
        const url = new URL('https://comunicaapi.pje.jus.br/api/v1/comunicacao');
        if (nome) url.searchParams.append('nomeAdvogado', nome);
        else if (oab) url.searchParams.append('numeroOab', oab);
        url.searchParams.append('itensPorPagina', '20');
        const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
        if (!res.ok) return;

        const data = await res.json();
        const today = new Date().toISOString().slice(0, 10);
        const todayItems: { id: number }[] = (data.items || []).filter(
          (i: { data_disponibilizacao?: string }) => i.data_disponibilizacao?.startsWith(today)
        );
        if (todayItems.length === 0) { setIntimacoesCount(0); return; }

        // 3. Check which ones the current user has already read
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setIntimacoesCount(todayItems.length); return; }

        const { data: lidas } = await supabase
          .from('intimacoes_lidas')
          .select('intimacao_id')
          .eq('user_id', user.id)
          .in('intimacao_id', todayItems.map(i => i.id));

        const lidasSet = new Set((lidas || []).map((l: { intimacao_id: number }) => l.intimacao_id));
        const unreadCount = todayItems.filter(i => !lidasSet.has(i.id)).length;
        setIntimacoesCount(unreadCount);
      } catch { /* silently fail */ }
    }
    fetchTodayUnread();
  }, [isEstagiario]);

  const filteredNavItems = navItems.filter(item => {
    // Se o item for adminOnly, escondemos APENAS se o usuário for explicitamente "Estagiário"
    // Isso garante que Administradores e Advogados vejam tudo.
    if ((item as any).adminOnly && role === 'Estagiário') return false;
    return true;
  });

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-surface-container border-r border-outline-variant/10 flex flex-col z-50">
      <div className="p-8 pt-10">
        <div className="flex items-center">
          <div 
            aria-label="Brenda Margalho - Advocacia Logo"
            className="h-[35px] w-[160px] bg-secondary transition-all hover:bg-primary"
            style={{
              WebkitMaskImage: "url('/logo.png')",
              WebkitMaskSize: "contain",
              WebkitMaskRepeat: "no-repeat",
              WebkitMaskPosition: "left center",
              maskImage: "url('/logo.png')",
              maskSize: "contain",
              maskRepeat: "no-repeat",
              maskPosition: "left center"
            }}
          />
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 active:scale-95",
              isActive 
                ? "bg-surface-container-high text-secondary border-r-2 border-secondary font-semibold" 
                : "text-primary opacity-70 hover:bg-surface-container-low hover:opacity-100"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-headline text-sm tracking-tight flex-1">{item.label}</span>
            {item.badge && (
              <span className="text-[8px] font-black uppercase tracking-widest bg-secondary/10 text-secondary px-1.5 py-0.5 rounded-md border border-secondary/20">
                {item.badge}
              </span>
            )}
            {item.path === '/intimacoes' && intimacoesCount !== null && intimacoesCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(202,168,113,0.6)] animate-pulse"></span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-6 mt-auto space-y-2">
        <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-primary opacity-70 hover:bg-surface-container-low hover:opacity-100 transition-all w-full text-left active:scale-95">
          <HelpCircle className="w-5 h-5" />
          <span className="font-headline text-sm tracking-tight">Suporte</span>
        </button>

        <button 
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-error opacity-70 hover:bg-error/10 hover:opacity-100 transition-all w-full text-left active:scale-95"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-headline text-sm tracking-tight">Sair</span>
        </button>
        
        <div className="pt-4 border-t border-outline-variant/10">
          <div className="flex items-center gap-3 p-2 bg-surface-container-low rounded-2xl border border-outline-variant/10">
            <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center border border-outline-variant/20 shrink-0">
              <span className="font-headline font-bold text-secondary">{userName.charAt(0).toUpperCase()}</span>
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-on-surface truncate">{userName}</p>
              <p className="text-[10px] text-on-surface-variant truncate">{role}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function TopBar({ userRole }: { userRole: string | null }) {
  const user = useUser();
  const userName = user?.user_metadata?.full_name || 'Usuário';
  const role = userRole || user?.user_metadata?.role || 'Advogado';

  return (
    <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-16 bg-surface/80 backdrop-blur-xl flex justify-end items-center px-8 z-40 shadow-[0_20px_40px_rgba(4,16,21,0.4)]">
      <div className="flex items-center gap-6">
        {user?.id && (
          <NotificationDropdown userId={user.id} />
        )}
        
        <div className="h-8 w-[1px] bg-outline-variant/20"></div>
        
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-headline font-bold text-on-surface leading-none">{userName}</p>
            <p className="text-[10px] text-outline">{role}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-surface-container-high ring-2 ring-secondary/20 flex items-center justify-center">
            <span className="font-headline font-bold text-secondary text-xs">{userName.charAt(0).toUpperCase()}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
