import React from 'react';
import { motion } from 'motion/react';
import { Gavel, Clock, LogOut, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function PendingApproval() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Force a complete refresh to clear all app state
    window.location.replace('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface overflow-hidden relative font-body">
      {/* Background Orbs (Static for Fluidity) */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[60%] h-[60%] bg-secondary/10 blur-[140px] rounded-full opacity-40" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[70%] h-[70%] bg-primary/10 blur-[160px] rounded-full opacity-30" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>
      </div>

      <main className="relative z-10 w-full max-w-[500px] px-6 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="glass-panel p-1 border border-outline-variant/10 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]"
        >
          <div className="bg-surface-container-low/40 backdrop-blur-2xl p-10 rounded-[2.3rem] border border-white/[0.03] space-y-8">
            <div className="flex flex-col items-center gap-6">
              <div className="w-20 h-20 rounded-2xl border border-secondary/30 flex items-center justify-center bg-surface-container-lowest/80 relative overflow-hidden">
                <div className="absolute inset-0 bg-secondary/5 animate-pulse" />
                <Clock className="text-secondary w-10 h-10 relative z-10 drop-shadow-[0_0_8px_rgba(241,189,137,0.4)]" />
              </div>
              
              <div className="space-y-2">
                <h1 className="font-headline font-black text-3xl tracking-tight text-on-surface">
                  Aguardando Aprovação
                </h1>
                <div className="flex items-center justify-center gap-3">
                  <div className="h-[1px] w-6 bg-secondary/30"></div>
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-[0.3em]">
                    Brenda Margalho Advocacia
                  </p>
                  <div className="h-[1px] w-6 bg-secondary/30"></div>
                </div>
              </div>
            </div>

            <div className="space-y-4 text-sm text-on-surface-variant leading-relaxed">
              <p>
                Sua solicitação de registro foi enviada com sucesso ao nosso sistema central.
              </p>
              <p>
                Por medidas de segurança, novas contas precisam ser <b>autorizadas manualmente</b> por um Administrador antes de acessar os dados do escritório.
              </p>
            </div>

            <div className="bg-surface-container-lowest/50 rounded-2xl p-6 border border-outline-variant/5 text-left flex items-start gap-4">
              <Mail className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-on-surface uppercase">O que fazer agora?</p>
                <p className="text-xs text-on-surface-variant">Você receberá uma notificação assim que seu acesso for liberado. Caso tenha urgência, entre em contato com a administração.</p>
              </div>
            </div>

            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border border-outline-variant/20 text-on-surface hover:bg-surface-container-high transition-all font-bold text-sm"
            >
              <LogOut className="w-4 h-4" />
              Sair e voltar ao Login
            </button>
          </div>
        </motion.div>
        
        <p className="mt-8 text-[10px] text-outline font-bold uppercase tracking-[0.4em] opacity-40">
          Brenda Margalho • Sistema Interno
        </p>
      </main>
    </div>
  );
}
