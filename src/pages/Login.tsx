import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, AlertCircle, Mail, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';

export function Login({ initialError }: { initialError?: string | null }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  
  useEffect(() => {
    if (initialError) {
      setError(initialError);
    }
  }, [initialError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isResetMode) {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (resetError) {
        setError(resetError.message);
      } else {
        setResetSent(true);
      }
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    } else {
      setTimeout(() => setLoading(false), 5000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface overflow-hidden relative font-body">
      {/* Dynamic Premium Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[60%] h-[60%] bg-secondary/20 blur-[140px] rounded-full opacity-40" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[70%] h-[70%] bg-primary/20 blur-[160px] rounded-full opacity-30" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>
      </div>

      <main className="relative z-10 w-full max-w-[460px] px-6 py-12">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center mb-10"
        >
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="inline-flex items-center justify-center mb-6 group"
          >
            <div 
              aria-label="Brenda Margalho - Advocacia Logo"
              className="h-[50px] w-[220px] bg-secondary transition-all group-hover:bg-primary drop-shadow-[0_0_12px_rgba(241,189,137,0.3)]"
              style={{
                WebkitMaskImage: "url('/logo.png')",
                WebkitMaskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                maskImage: "url('/logo.png')",
                maskSize: "contain",
                maskRepeat: "no-repeat",
                maskPosition: "center"
              }}
            />
          </motion.div>
          <h1 className="font-headline font-black text-4xl tracking-tight text-on-surface mb-2 bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent">
            Brenda Margalho
          </h1>
          <div className="flex items-center justify-center gap-4">
            <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-secondary/40"></div>
            <p className="font-headline text-secondary/80 text-[10px] font-bold tracking-[0.4em] uppercase">
              Advocacia
            </p>
            <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-secondary/40"></div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          className="glass-panel p-1 border border-outline-variant/10 rounded-[2rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]"
        >
          <div className="bg-surface-container-low/40 backdrop-blur-2xl p-10 rounded-[1.8rem] border border-white/[0.03]">
            <form onSubmit={handleSubmit} className="space-y-6">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-error/10 border border-error/20 rounded-xl p-4 flex items-start gap-3 mb-4 overflow-hidden"
                  >
                    <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
                    <p className="text-sm text-error font-medium">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {resetSent ? (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="py-6 flex flex-col items-center gap-4 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(241,189,137,0.15)]">
                    <span className="text-secondary text-2xl font-bold">✓</span>
                  </div>
                  <p className="text-base text-on-surface font-bold">Verifique seu e-mail</p>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Enviamos as instruções para redefinição de senha para o seu endereço profissional.
                  </p>
                  <button 
                    type="button" 
                    onClick={() => { setIsResetMode(false); setResetSent(false); }} 
                    className="mt-6 px-6 py-2.5 rounded-full bg-surface-container-highest text-xs font-bold text-on-surface uppercase tracking-widest hover:bg-secondary hover:text-on-secondary transition-all duration-300 active:scale-95"
                  >
                    Voltar ao Login
                  </button>
                </motion.div>
              ) : (
                <>
                  <div className="space-y-2 group">
                    <label className="block text-[10px] font-black text-on-surface uppercase tracking-[0.2em] ml-1 group-focus-within:text-secondary transition-colors" htmlFor="email">
                      Identificação
                    </label>
                    <div className="relative flex items-center">
                      <Mail className="absolute left-4 w-4 h-4 text-outline group-focus-within:text-secondary transition-colors" />
                      <input 
                        className="w-full bg-surface-container-lowest/50 border border-outline-variant/10 rounded-2xl pl-11 pr-4 py-4 text-sm text-on-surface placeholder:text-outline/70 focus:bg-surface-container-lowest focus:border-secondary/40 focus:ring-4 focus:ring-secondary/5 transition-all duration-300 outline-none shadow-inner" 
                        id="email" 
                        name="email" 
                        placeholder="" 
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>

                  {!isResetMode && (
                    <div className="space-y-2 group">
                      <div className="flex justify-between items-center px-1">
                        <label className="block text-[10px] font-black text-on-surface uppercase tracking-[0.2em] group-focus-within:text-secondary transition-colors" htmlFor="password">
                          Chave de Acesso
                        </label>
                        <button 
                          type="button" 
                          onClick={() => setIsResetMode(true)} 
                          className="text-[10px] font-bold text-outline hover:text-secondary transition-colors"
                          tabIndex={-1}
                        >
                          Esqueci a senha
                        </button>
                      </div>
                      <div className="relative flex items-center">
                        <Lock className="absolute left-4 w-4 h-4 text-outline group-focus-within:text-secondary transition-colors" />
                        <input 
                          className="w-full bg-surface-container-lowest/50 border border-outline-variant/10 rounded-2xl pl-11 pr-4 py-4 text-sm text-on-surface placeholder:text-outline/70 focus:bg-surface-container-lowest focus:border-secondary/40 focus:ring-4 focus:ring-secondary/5 transition-all duration-300 outline-none shadow-inner" 
                          id="password" 
                          name="password" 
                          placeholder="••••••••" 
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={loading}
                          required
                        />
                      </div>
                    </div>
                  )}

                  {isResetMode && (
                    <div className="pt-2">
                       <button 
                        type="button" 
                        onClick={() => setIsResetMode(false)}
                        className="text-xs font-bold text-secondary hover:underline underline-offset-4"
                      >
                        Voltar para o Login
                      </button>
                    </div>
                  )}

                  <motion.button 
                    whileHover={{ scale: 1.01, boxShadow: "0 20px 40px -12px rgba(241,189,137,0.3)" }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-secondary text-surface font-headline font-black py-4.5 rounded-2xl shadow-[0_12px_24px_-8px_rgba(241,189,137,0.25)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden transition-all duration-300 mt-4" 
                    type="submit"
                    disabled={loading}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="uppercase tracking-widest text-xs">{isResetMode ? 'Processando...' : 'Autenticando...'}</span>
                      </>
                    ) : (
                      <>
                        <span className="uppercase tracking-[0.15em] text-xs font-black">{isResetMode ? 'Redefinir Acesso' : 'Entrar no Sistema'}</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </motion.button>
                </>
              )}
            </form>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="mt-12 text-center"
        >
          <p className="text-xs text-on-surface-variant font-medium tracking-wide">
            Novo colaborador? 
            <button 
              onClick={() => navigate('/signup')}
              className="text-secondary font-black hover:text-secondary/80 ml-2 uppercase tracking-widest border-b border-secondary/20 hover:border-secondary transition-all"
              disabled={loading}
            >
              Solicitar Registro
            </button>
          </p>
        </motion.div>
      </main>

      {/* Footer Info */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-bold text-outline opacity-40 uppercase tracking-[0.3em]">
        CRM Jurídico • Versão Premium 1.0
      </div>
    </div>
  );
}
