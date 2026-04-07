import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Gavel, User, Mail, Lock, Loader2, AlertCircle, ChevronDown, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Advogado');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          role: role,
        }
      }
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center premium-gradient overflow-hidden relative">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/30 blur-[150px] rounded-full"></div>
      </div>

      <main className="relative z-10 w-full max-w-[480px] px-6 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-full border border-secondary/20 flex items-center justify-center bg-surface-container-lowest">
              <Gavel className="text-secondary w-8 h-8" />
            </div>
          </div>
          <h1 className="font-headline font-extrabold text-3xl tracking-tighter text-on-surface mb-1">
            Criar sua Conta
          </h1>
          <p className="font-headline text-secondary text-sm font-semibold tracking-[0.2em] uppercase">
            Brenda Margalho Advocacia
          </p>
        </div>

        <div className="glass-panel p-10 rounded-xl shadow-[0_20px_40px_rgba(4,16,21,0.6)] border border-outline-variant/10">
            {success ? (
              <div className="py-8 flex flex-col items-center gap-6 text-center animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center mb-2 shadow-[0_0_30px_rgba(241,189,137,0.15)]">
                  <CheckCircle className="text-secondary w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-headline font-bold text-on-surface">Conta Criada!</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Seu registro foi enviado com sucesso. Por segurança, um <b>Administrador</b> precisa aprovar seu acesso antes que você possa entrar no sistema.
                  </p>
                </div>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-secondary text-on-secondary font-headline font-bold py-4 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
                >
                  Entrar no Sistema
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-error/10 border border-error/20 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
                    <p className="text-sm border-error/20 text-error">{error}</p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest" htmlFor="name">
                    Nome Completo
                  </label>
                  <div className="group relative flex items-center">
                    <User className="w-4 h-4 text-outline absolute left-0" />
                    <input 
                      className="w-full bg-transparent border-none pl-7 py-3 text-on-surface placeholder-outline focus:ring-0 transition-all duration-300 outline-none" 
                      id="name" 
                      name="name" 
                      placeholder="Seu nome completo" 
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={loading}
                      required
                    />
                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-outline-variant/30 group-focus-within:h-[2px] group-focus-within:bg-secondary transition-all"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest" htmlFor="role">
                    Função
                  </label>
                  <div className="group relative flex items-center">
                    <select 
                      id="role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      disabled={loading}
                      className="w-full bg-transparent border-none pl-4 pr-10 py-3 text-on-surface placeholder-outline focus:ring-0 transition-all duration-300 outline-none appearance-none"
                    >
                      <option value="Estagiário" className="bg-surface-container-high text-on-surface">Estagiário</option>
                      <option value="Advogado" className="bg-surface-container-high text-on-surface">Advogado</option>
                      <option value="Assessor Jurídico" className="bg-surface-container-high text-on-surface">Assessor Jurídico</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-outline absolute right-4 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-outline-variant/30 group-focus-within:h-[2px] group-focus-within:bg-secondary transition-all"></div>
                  </div>
                </div>


                <div className="space-y-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest" htmlFor="email">
                    E-mail Profissional
                  </label>
                  <div className="group relative flex items-center">
                    <Mail className="w-4 h-4 text-outline absolute left-0" />
                    <input 
                      className="w-full bg-transparent border-none pl-7 py-3 text-on-surface placeholder-outline focus:ring-0 transition-all duration-300 outline-none" 
                      id="email" 
                      name="email" 
                      placeholder="seu@email.com.br" 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      required
                    />
                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-outline-variant/30 group-focus-within:h-[2px] group-focus-within:bg-secondary transition-all"></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest" htmlFor="password">
                    Senha
                  </label>
                  <div className="group relative flex items-center">
                    <Lock className="w-4 h-4 text-outline absolute left-0" />
                    <input 
                      className="w-full bg-transparent border-none pl-7 py-3 text-on-surface placeholder-outline focus:ring-0 transition-all duration-300 outline-none" 
                      id="password" 
                      name="password" 
                      placeholder="••••••••" 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      required
                    />
                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-outline-variant/30 group-focus-within:h-[2px] group-focus-within:bg-secondary transition-all"></div>
                  </div>
                </div>

                <div className="pt-4">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" className="mt-1 w-4 h-4 rounded border-outline-variant/30 bg-surface-container-lowest text-secondary focus:ring-secondary/20" required disabled={loading} />
                    <span className="text-xs text-on-surface-variant leading-relaxed">
                      Eu li e aceito os <button type="button" className="text-secondary font-bold hover:underline" disabled={loading}>Termos de Uso</button> e a <button type="button" className="text-secondary font-bold hover:underline" disabled={loading}>Política de Privacidade</button>.
                    </span>
                  </label>
                </div>

                <button 
                  className="w-full bg-secondary text-on-secondary font-headline font-bold py-4 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-secondary/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" 
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      Criar Conta
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm text-on-surface-variant">
            Já possui uma conta? 
            <button 
              onClick={() => navigate('/login')}
              className="text-secondary font-semibold hover:underline decoration-secondary/30 underline-offset-4 ml-1 disabled:opacity-50"
              disabled={loading}
            >
              Fazer login
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
