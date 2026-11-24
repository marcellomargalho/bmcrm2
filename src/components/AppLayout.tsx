import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { getCached, setCached } from '@/lib/pageCache';
import { Sidebar, TopBar } from './Navigation';

export function AppLayout({ onLogout, userRole }: { onLogout: () => void, userRole: string | null }) {
  useEffect(() => {
    // Pedir permissão para Notificações Desktop
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    // Subscrever canal global de agendamentos novos
    const channel = supabase
      .channel('global-appointments')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'appointments' },
        (payload) => {
          console.log('Novo agendamento recebido (global):', payload);
          // Toast visual dentro do sistema
          toast.success(`Novo atendimento: ${payload.new.visitor_name || 'Alguém no site'} procurou contato!`, { duration: 6000 });
          
          // Push O.S. (Web Push) se permitido e se o usuário não estiver focado na página
          if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
            new Notification('Novo Atendimento CRM', {
              body: `${payload.new.visitor_name || 'Novo Lead'} solicitou contato. Abra o CRM para gerenciar.`,
              icon: '/logo.png', // Fallback opcional para favicon
            });
          }
        }
      )
      .subscribe();

    // Prefetch silencioso em background das abas mais acessadas após o carregamento inicial
    const prefetchTimer = setTimeout(async () => {
      try {
        if (!getCached('processes_page0_todos')) {
          supabase
            .from('processes')
            .select('*, clients(name, cpf_cnpj, status), process_clients(client_id, role, clients(name, cpf_cnpj, status))', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(0, 24)
            .then(({ data, count }) => {
              if (data) setCached('processes_page0_todos', { data, count: count ?? data.length });
            });
        }
        if (!getCached('clients_page0')) {
          supabase
            .from('clients')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(0, 24)
            .then(({ data, count }) => {
              if (data) setCached('clients_page0', { data, count: count ?? data.length });
            });
        }
      } catch { /* ignore prefetch errors */ }
    }, 900);

    return () => {
      clearTimeout(prefetchTimer);
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-surface print:bg-white">
      <div className="print:hidden">
        <Sidebar onLogout={onLogout} userRole={userRole} />
      </div>
      <div className="ml-64 print:ml-0">
        <div className="print:hidden">
          <TopBar userRole={userRole} onLogout={onLogout} />
        </div>
        <main className="pt-16 print:pt-0 p-8 print:p-0 min-h-screen">
          <Outlet />
          <Toaster 
            position="top-right"
            toastOptions={{
              className: 'font-body text-sm',
              style: {
                background: '#1d2a30',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              },
            }} 
          />
        </main>
      </div>
    </div>
  );
}
