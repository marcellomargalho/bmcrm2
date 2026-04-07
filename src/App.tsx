import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { useAuthInactivity } from '@/hooks/useAuthInactivity';
import { Login } from '@/pages/Login';
import { Signup } from '@/pages/Signup';
import { Dashboard } from '@/pages/Dashboard';
import { ProcessList } from '@/pages/ProcessList';
import { ProcessDetails } from '@/pages/ProcessDetails';
import { ClientManagement } from '@/pages/ClientManagement';
import { Agenda } from '@/pages/Agenda';
import { DocumentManagement } from '@/pages/DocumentManagement';
import { Settings } from '@/pages/Settings';
import { UpdatePassword } from '@/pages/UpdatePassword';
import { PendingApproval } from '@/pages/PendingApproval';
import { AINotebook } from '@/pages/AINotebook';
import { Intimacoes } from '@/pages/Intimacoes';
import { BlogManagement } from '@/pages/BlogManagement';
import { Analytics } from '@/pages/Analytics';
import { Atendimento } from '@/pages/Atendimento';
import { supabase } from '@/lib/supabase';

function ProtectedRoute({ 
  children, 
  isAuthenticated, 
  isApproved,
  isLoading 
}: { 
  children: React.ReactNode, 
  isAuthenticated: boolean, 
  isApproved: boolean,
  isLoading: boolean 
}) {
  const location = useLocation();
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-surface text-on-surface">Carregando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If not approved and trying to access any page other than pending-approval
  if (!isApproved && location.pathname !== '/pending-approval') {
    return <Navigate to="/pending-approval" replace />;
  }

  // If approved and trying to access pending-approval, go to dashboard
  if (isApproved && location.pathname === '/pending-approval') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isApproved, setIsApproved] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_approved, role')
        .eq('id', userId)
        .single();

      if (error) throw error;
      
      if (!data.is_approved) {
        setAuthError('Sua conta está aguardando aprovação de um administrador.');
        setIsApproved(false);
        setIsAuthenticated(false);
        return false;
      }
      
      setIsApproved(data.is_approved);
      setUserRole(data.role);
      setAuthError(null);
      return true;
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      // Fallback pra limpar login travado em caso de erro local
      if (err.message?.includes('Lock')) {
         supabase.auth.signOut();
      }
      setAuthError(err.message || 'Erro ao carregar perfil.');
      setIsApproved(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Safety timeout to ensure the app always resolves loading
    const safetyTimer = setTimeout(() => {
      setIsLoading(prev => {
        if (prev) console.warn('Auth initialization reached safety timeout');
        return false;
      });
    }, 5000);

    // Escuta as mudanças de autenticação (de forma não bloqueante para a trava de rede)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // Armazena o ID e deixa o React processar o próximo estado
        setSessionUserId(session.user.id);
      } else {
        setSessionUserId(null);
        setIsAuthenticated(false);
        setIsApproved(false);
        setUserRole(null);
        setIsLoading(false);
      }
      clearTimeout(safetyTimer);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  // Busca o perfil de forma independente (evita deadlock com a promessa de signInWithPassword)
  useEffect(() => {
    if (sessionUserId) {
      const loadProfile = async () => {
        // Resolve de forma assíncrona após a thread principal respirar (soltando qualquer lock do Supabase)
        await new Promise(r => setTimeout(r, 10)); 
        const success = await fetchProfile(sessionUserId);
        if (success) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          setIsApproved(false);
          setUserRole(null);
        }
      };
      
      loadProfile();
    }
  }, [sessionUserId]);

  const logout = React.useCallback(async () => {
    setIsAuthenticated(false);
    setIsApproved(false);
    setUserRole(null);
    setIsLoading(false);
    await supabase.auth.signOut();
  }, []);

  // Ativa o monitor de inatividade (Logout após 30 minutos sem ação)
  useAuthInactivity(logout, 30 * 60 * 1000);

  return (
    <Routes>
      <Route path="/login" element={
        isLoading ? (
          <div className="min-h-screen flex items-center justify-center bg-surface text-on-surface">Carregando...</div>
        ) : (
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login initialError={authError} />
        )
      } />
      <Route path="/signup" element={
        isLoading ? (
          <div className="min-h-screen flex items-center justify-center bg-surface text-on-surface">Carregando...</div>
        ) : (
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Signup />
        )
      } />
      <Route path="/update-password" element={<UpdatePassword />} />
      <Route path="/pending-approval" element={
        <ProtectedRoute isAuthenticated={isAuthenticated} isApproved={isApproved} isLoading={isLoading}>
          <PendingApproval />
        </ProtectedRoute>
      } />
      
      <Route path="/" element={
        <ProtectedRoute isAuthenticated={isAuthenticated} isApproved={isApproved} isLoading={isLoading}>
          <AppLayout onLogout={logout} userRole={userRole} />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="processos" element={<ProcessList />} />
        <Route path="processos/:id" element={<ProcessDetails />} />
        <Route path="clientes" element={<ClientManagement />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="documentos" element={<DocumentManagement />} />
        <Route path="ia-juridica" element={<AINotebook />} />
        <Route path="intimacoes" element={<Intimacoes />} />
        <Route path="blog" element={<BlogManagement />} />
        <Route path="atendimento" element={<Atendimento />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="configuracoes" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
