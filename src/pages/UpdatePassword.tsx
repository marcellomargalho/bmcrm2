import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function UpdatePassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center premium-gradient overflow-hidden relative">
      <main className="relative z-10 w-full max-w-[440px] px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-full border border-secondary/20 flex items-center justify-center bg-surface-container-lowest">
              <Lock className="text-secondary w-8 h-8" />
            </div>
          </div>
          <h1 className="font-headline font-extrabold text-3xl tracking-tighter text-on-surface mb-2">
            Nova Senha
          </h1>
          <p className="text-on-surface-variant text-sm">
            Digite sua nova senha abaixo.
          </p>
        </div>

        <div className="glass-panel p-10 rounded-xl shadow-[0_20px_40px_rgba(4,16,21,0.6)] border border-outline-variant/10">
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="bg-error/10 border border-error/20 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
                <p className="text-sm border-error/20 text-error">{error}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest" htmlFor="password">
                Nova Senha
              </label>
              <div className="group relative">
                <input 
                  className="w-full bg-surface-container-lowest border-none px-0 py-3 text-on-surface placeholder-outline focus:ring-0 transition-all duration-300 outline-none" 
                  id="password" 
                  type="password"
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-outline-variant/30 group-focus-within:h-[2px] group-focus-within:bg-secondary transition-all"></div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest" htmlFor="confirmPassword">
                Confirmar Senha
              </label>
              <div className="group relative">
                <input 
                  className="w-full bg-surface-container-lowest border-none px-0 py-3 text-on-surface placeholder-outline focus:ring-0 transition-all duration-300 outline-none" 
                  id="confirmPassword" 
                  type="password"
                  placeholder="••••••••" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-outline-variant/30 group-focus-within:h-[2px] group-focus-within:bg-secondary transition-all"></div>
              </div>
            </div>

            <button 
              className="w-full bg-secondary text-on-secondary font-headline font-bold py-4 rounded-xl hover:opacity-90 transition-all duration-200 shadow-lg shadow-secondary/10 flex items-center justify-center gap-2 disabled:opacity-50 inline-flex" 
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  Atualizar Senha
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
