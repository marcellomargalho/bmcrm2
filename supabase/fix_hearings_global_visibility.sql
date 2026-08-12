-- =====================================================================
-- TORNAR AUDIÊNCIAS GLOBAIS: Todos os usuários autenticados podem ver/gerenciar
-- Execute este script no SQL Editor do Dashboard do Supabase.
-- =====================================================================

-- 1. Remover policy antiga restritiva de hearings
DROP POLICY IF EXISTS "Users can manage their own hearings" ON public.hearings;

-- 2. Criar policies globais para hearings
CREATE POLICY "Authenticated users can view all hearings" ON public.hearings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert hearings" ON public.hearings
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update hearings" ON public.hearings
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete hearings" ON public.hearings
  FOR DELETE TO authenticated USING (true);

-- 3. Remover policy antiga restritiva de hearing_logs
DROP POLICY IF EXISTS "Users can view logs of their own hearings" ON public.hearing_logs;

-- 4. Criar policy global para hearing_logs
CREATE POLICY "Authenticated users can view all hearing logs" ON public.hearing_logs
  FOR SELECT TO authenticated USING (true);
