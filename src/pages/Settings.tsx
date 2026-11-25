import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  Save,
  Users,
  CheckCircle,
  XCircle,
  ChevronDown,
  Trophy,
  TrendingUp,
  Award,
  Target,
  Star,
  Loader2,
  Bookmark,
  AlertCircle,
  Database,
  Key,
  Trash2,
  RefreshCw,
  Lock,
  Check,
  Mail,
  Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuthUser } from '@/lib/authContext';

export function Settings() {
  const authUser = useAuthUser();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('perfil');

  // Edição do Perfil
  const [displayName, setDisplayName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Alteração de Senha
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Equipe e Produtividade
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [productivityData, setProductivityData] = useState<any[]>([]);
  const [loadingProductivity, setLoadingProductivity] = useState(false);
  const [productivityRoleFilter, setProductivityRoleFilter] = useState('Advogado');

  // DJEN Configs
  const [djenName, setDjenName] = useState('');
  const [djenOab, setDjenOab] = useState('');
  const [djenSaving, setDjenSaving] = useState(false);
  const [djenSaved, setDjenSaved] = useState(false);

  // Datajud Configs
  const [datajudApiKey, setDatajudApiKey] = useState('');
  const [datajudSaving, setDatajudSaving] = useState(false);
  const [datajudSaved, setDatajudSaved] = useState(false);

  // Exclusão de Usuário
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Alteração de E-mail por Administrador
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
  const [editingEmailValue, setEditingEmailValue] = useState('');
  const [savingMemberEmail, setSavingMemberEmail] = useState(false);
  const [memberEmailError, setMemberEmailError] = useState('');

  useEffect(() => {
    async function loadInitial() {
      const userId = authUser?.id;
      let resolvedId = userId;

      if (!resolvedId) {
        const { data: { user: current } } = await supabase.auth.getUser();
        if (current) {
          setUser(current);
          resolvedId = current.id;
        }
      }

      if (resolvedId) {
        const [{ data: profileData }, { data: settingsData }] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', resolvedId).single(),
          supabase.from('system_settings').select('key, value').in('key', ['djen_nome_padrao', 'djen_oab_padrao', 'datajud_api_key']),
        ]);

        if (profileData) {
          setProfile(profileData);
          setDisplayName(profileData.name || '');
        }
        if (settingsData) {
          setDjenName(settingsData.find(s => s.key === 'djen_nome_padrao')?.value || '');
          setDjenOab(settingsData.find(s => s.key === 'djen_oab_padrao')?.value || '');
          setDatajudApiKey(settingsData.find(s => s.key === 'datajud_api_key')?.value || '');
        }
      }
    }
    loadInitial();
  }, [authUser?.id]);

  const role = profile?.role || authUser?.role || 'Advogado';
  const isStrictAdmin = role === 'Administrador';
  const isAdmin = isStrictAdmin || role === 'Advogado com Controladoria';

  useEffect(() => {
    if (isAdmin) {
      if (activeTab === 'equipe') fetchProfiles();
      if (activeTab === 'productivity') fetchProductivityData();
    }
  }, [isAdmin, activeTab]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !profile?.id) return;
    setSavingProfile(true);
    setProfileError('');
    try {
      const trimmed = displayName.trim();
      const { error } = await supabase
        .from('profiles')
        .update({ name: trimmed })
        .eq('id', profile.id);
      if (error) throw error;

      await supabase.auth.updateUser({ data: { full_name: trimmed } });
      setProfile((prev: any) => ({ ...prev, name: trimmed }));
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err: any) {
      setProfileError(err.message || 'Erro ao salvar nome.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);
    if (newPassword.length < 6) {
      setPasswordFeedback({ type: 'err', text: 'A nova senha deve ter pelo menos 6 caracteres.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'err', text: 'As senhas não conferem.' });
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      setPasswordFeedback({ type: 'ok', text: 'Senha alterada com sucesso.' });
    } catch (err: any) {
      setPasswordFeedback({ type: 'err', text: err.message || 'Não foi possível alterar a senha.' });
    } finally {
      setSavingPassword(false);
    }
  };

  const fetchProductivityData = async () => {
    setLoadingProductivity(true);
    try {
      const [{ data: allProfiles }, { data: allTasks }] = await Promise.all([
        supabase.from('profiles').select('id, name, role').eq('is_approved', true),
        supabase.from('tasks').select('task_type, responsible, status').eq('status', 'Concluída'),
      ]);

      const SCORING: Record<string, number> = {
        'Audiência': 15,
        'Audiência de Instrução ou Conciliação': 15,
        'Petição': 10,
        'Diligência': 8,
        'Protocolo': 5,
        'Análise de Processo': 5,
        'Default': 3,
      };

      const stats = (allProfiles || []).map(p => {
        const userTasks = (allTasks || []).filter(t =>
          t.responsible?.toLowerCase().includes(p.name?.toLowerCase())
        );

        const totalPoints = userTasks.reduce((acc, t) => {
          return acc + (SCORING[t.task_type || ''] || SCORING['Default']);
        }, 0);

        return {
          ...p,
          points: totalPoints,
          taskCount: userTasks.length,
        };
      }).sort((a, b) => b.points - a.points);

      setProductivityData(stats);
    } catch (err) {
      console.error('Erro ao carregar produtividade:', err);
    } finally {
      setLoadingProductivity(false);
    }
  };

  const fetchProfiles = async () => {
    setLoadingProfiles(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProfiles(data);
    }
    setLoadingProfiles(false);
  };

  const toggleApproval = async (profileId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_approved: !currentStatus })
      .eq('id', profileId);

    if (!error) {
      setProfiles(profiles.map(p =>
        p.id === profileId ? { ...p, is_approved: !currentStatus } : p
      ));
    }
  };

  const updateProfileRole = async (profileId: string, newRole: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', profileId);

    if (!error) {
      setProfiles(profiles.map(p =>
        p.id === profileId ? { ...p, role: newRole } : p
      ));
      if (profile?.id === profileId) {
        setProfile({ ...profile, role: newRole });
      }
    }
  };

  const deleteUser = async (profileId: string) => {
    setDeletingUserId(profileId);
    try {
      const { error } = await supabase.rpc('delete_user_by_admin', {
        user_id_to_delete: profileId,
      });

      if (error) {
        throw new Error(error.message || 'Falha ao excluir usuário. Verifique as permissões.');
      }

      setProfiles(profiles.filter(p => p.id !== profileId));
      setConfirmDeleteId(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Ocorreu um erro ao excluir o usuário.');
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleUpdateMemberEmail = async (memberId: string) => {
    if (!isStrictAdmin) return;
    const trimmed = editingEmailValue.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setMemberEmailError('Informe um e-mail válido.');
      return;
    }
    setSavingMemberEmail(true);
    setMemberEmailError('');
    try {
      const { data, error } = await supabase.functions.invoke('update-user-email', {
        body: { userId: memberId, newEmail: trimmed },
      });
      if (error) {
        let msg = error.message;
        try {
          const parsed = await (error as any).context?.json?.();
          if (parsed?.error) msg = parsed.error;
        } catch {}
        throw new Error(msg || 'Erro ao atualizar e-mail.');
      }
      if (data?.error) throw new Error(data.error);

      setProfiles(prev => prev.map(p => (p.id === memberId ? { ...p, email: trimmed } : p)));
      if (profile?.id === memberId) {
        setProfile((prev: any) => ({ ...prev, email: trimmed }));
      }
      setEditingEmailId(null);
      setEditingEmailValue('');
    } catch (err: any) {
      setMemberEmailError(err?.message || 'Não foi possível alterar o e-mail.');
    } finally {
      setSavingMemberEmail(false);
    }
  };

  const userName = profile?.name || authUser?.name || user?.user_metadata?.full_name || '';
  const userEmail = profile?.email || authUser?.email || user?.email || '';

  const accountTabs = [
    { id: 'perfil', icon: User, label: 'Meu Perfil', desc: 'Dados de acesso e senha' },
  ];

  const adminTabs = [
    { id: 'equipe', icon: Users, label: 'Equipe e Permissões', desc: 'Aprovar acessos e cargos' },
    { id: 'productivity', icon: Trophy, label: 'Produtividade', desc: 'Ranking de tarefas concluídas' },
    { id: 'intimacoes_config', icon: Bookmark, label: 'Monitoramento DJEN', desc: 'Advogado e OAB monitorados' },
    { id: 'datajud_config', icon: Database, label: 'API Datajud (CNJ)', desc: 'Chave pública de consulta' },
  ];

  const activeCount = profiles.filter(p => p.is_approved).length;
  const pendingCount = profiles.filter(p => !p.is_approved).length;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-outline-variant/10 pb-6">
        <div>
          <h2 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface mb-1">Configurações</h2>
          <p className="text-sm text-on-surface-variant">Gerencie sua conta e as integrações ativas do escritório.</p>
        </div>
        <div className="flex items-center gap-2.5 bg-surface-container-low px-4 py-2 rounded-2xl border border-outline-variant/10">
          <div className="w-8 h-8 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center font-headline font-bold text-sm">
            {userName ? userName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="text-left">
            <p className="text-xs font-bold text-on-surface leading-tight">{userName || 'Usuário'}</p>
            <p className="text-[10px] text-outline font-medium">{role}</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <aside className="lg:col-span-3 space-y-6 bg-surface-container-low p-4 rounded-3xl border border-outline-variant/10">
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-outline px-3 block mb-2">
              Conta Pessoal
            </span>
            {accountTabs.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left transition-colors',
                  activeTab === item.id
                    ? 'bg-secondary text-on-secondary shadow-md shadow-secondary/10'
                    : 'text-on-surface-variant hover:bg-surface-container-high/50 hover:text-on-surface'
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <div className="min-w-0">
                  <span className="font-headline text-sm font-bold block leading-tight">{item.label}</span>
                  <span className={cn('text-[11px] block truncate mt-0.5', activeTab === item.id ? 'text-on-secondary/80' : 'text-outline')}>
                    {item.desc}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {isAdmin && (
            <div className="space-y-1.5 pt-4 border-t border-outline-variant/10">
              <span className="text-[10px] font-black uppercase tracking-widest text-outline px-3 block mb-2">
                Administração
              </span>
              {adminTabs.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left transition-colors',
                    activeTab === item.id
                      ? 'bg-secondary text-on-secondary shadow-md shadow-secondary/10'
                      : 'text-on-surface-variant hover:bg-surface-container-high/50 hover:text-on-surface'
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-headline text-sm font-bold block leading-tight">{item.label}</span>
                    <span className={cn('text-[11px] block truncate mt-0.5', activeTab === item.id ? 'text-on-secondary/80' : 'text-outline')}>
                      {item.desc}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        <main className="lg:col-span-9 space-y-6">
          {activeTab === 'perfil' && (
            <>
              <form onSubmit={handleSaveProfile} className="bg-surface-container-low p-6 sm:p-8 rounded-3xl border border-outline-variant/10 space-y-6">
                <div className="flex items-center gap-5 pb-6 border-b border-outline-variant/10">
                  <div className="w-16 h-16 rounded-2xl bg-secondary/15 border border-secondary/25 flex items-center justify-center shrink-0">
                    <span className="font-headline font-extrabold text-secondary text-2xl">
                      {userName ? userName.charAt(0).toUpperCase() : 'U'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xl font-headline font-bold text-on-surface truncate">{userName || 'Carregando...'}</h4>
                    <p className="text-xs text-outline truncate mt-0.5">{userEmail}</p>
                    <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-lg bg-surface-container-high text-[11px] font-bold text-secondary border border-secondary/20">
                      <Shield className="w-3 h-3" /> {role}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-outline uppercase tracking-wider">Nome de Exibição</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                      className="w-full bg-surface-container-lowest border border-outline-variant/15 rounded-xl px-4 py-3 text-sm text-on-surface focus:border-secondary/60 outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-outline uppercase tracking-wider">E-mail de Acesso</label>
                    <input
                      type="email"
                      value={userEmail}
                      disabled
                      className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl px-4 py-3 text-sm text-outline cursor-not-allowed opacity-70"
                    />
                  </div>
                </div>

                {profileError && (
                  <p className="text-xs text-error font-semibold">{profileError}</p>
                )}

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-outline">
                    {profileSaved && (
                      <span className="text-emerald-400 font-bold inline-flex items-center gap-1.5">
                        <Check className="w-4 h-4" /> Nome atualizado!
                      </span>
                    )}
                  </span>
                  <button
                    type="submit"
                    disabled={savingProfile || !displayName.trim()}
                    className="flex items-center gap-2 px-6 py-3 bg-secondary text-on-secondary font-headline font-bold text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar Nome
                  </button>
                </div>
              </form>

              <form onSubmit={handleChangePassword} className="bg-surface-container-low p-6 sm:p-8 rounded-3xl border border-outline-variant/10 space-y-5">
                <div>
                  <h4 className="text-lg font-headline font-bold text-on-surface flex items-center gap-2">
                    <Lock className="w-4 h-4 text-secondary" />
                    Alterar Senha de Acesso
                  </h4>
                  <p className="text-xs text-on-surface-variant mt-1">Defina uma nova senha com pelo menos 6 caracteres.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-outline uppercase tracking-wider">Nova Senha</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full bg-surface-container-lowest border border-outline-variant/15 rounded-xl px-4 py-3 text-sm text-on-surface focus:border-secondary/60 outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-outline uppercase tracking-wider">Confirmar Senha</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="w-full bg-surface-container-lowest border border-outline-variant/15 rounded-xl px-4 py-3 text-sm text-on-surface focus:border-secondary/60 outline-none"
                    />
                  </div>
                </div>

                {passwordFeedback && (
                  <p className={cn('text-xs font-semibold', passwordFeedback.type === 'ok' ? 'text-emerald-400' : 'text-error')}>
                    {passwordFeedback.text}
                  </p>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingPassword || !newPassword || !confirmPassword}
                    className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-high text-on-surface font-headline font-bold text-xs rounded-xl hover:bg-secondary hover:text-on-secondary transition-colors disabled:opacity-50"
                  >
                    {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                    Atualizar Senha
                  </button>
                </div>
              </form>
            </>
          )}

          {activeTab === 'equipe' && isAdmin && (
            <div className="bg-surface-container-low p-6 sm:p-8 rounded-3xl border border-outline-variant/10 space-y-6">
              <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                  <h4 className="text-xl font-headline font-bold text-on-surface tracking-tight">Equipe e Permissões</h4>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {activeCount} ativo(s){pendingCount > 0 ? ` • ${pendingCount} aguardando aprovação` : ''}
                  </p>
                </div>
                <button
                  onClick={fetchProfiles}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container-high text-xs font-bold text-on-surface-variant hover:text-secondary transition-colors"
                  title="Atualizar lista"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', loadingProfiles && 'animate-spin')} />
                  Atualizar
                </button>
              </div>

              <div className="space-y-4">
                {profiles.length === 0 ? (
                  <div className="text-center py-12 bg-surface-container-lowest/50 rounded-2xl border border-dashed border-outline-variant/20">
                    <p className="text-sm text-on-surface-variant">Nenhum colaborador encontrado.</p>
                  </div>
                ) : (
                  profiles.map((member) => {
                    const isEditingEmail = editingEmailId === member.id;
                    return (
                      <div
                        key={member.id}
                        className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/10 space-y-4 hover:border-secondary/25 transition-colors"
                      >
                        {/* Linha 1: Identificação completa (sem cortar nome ou e-mail) + Status */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <div className="w-11 h-11 rounded-xl bg-secondary/10 flex items-center justify-center font-headline font-black text-secondary text-base border border-secondary/20 shrink-0">
                              {member.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h5 className="text-base font-bold text-on-surface leading-snug break-words">
                                {member.name}
                              </h5>
                              {!isEditingEmail ? (
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className="text-xs text-on-surface-variant break-all flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5 text-outline shrink-0" />
                                    {member.email}
                                  </span>
                                  {isStrictAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingEmailId(member.id);
                                        setEditingEmailValue(member.email || '');
                                        setMemberEmailError('');
                                      }}
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-secondary hover:underline"
                                      title="Alterar e-mail de acesso e notificações"
                                    >
                                      <Pencil className="w-3 h-3" />
                                      Alterar e-mail
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="mt-2 space-y-1.5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <input
                                      type="email"
                                      value={editingEmailValue}
                                      onChange={(e) => setEditingEmailValue(e.target.value)}
                                      placeholder="novo@email.com"
                                      className="flex-1 min-w-[220px] bg-surface-container-low border border-secondary/40 rounded-xl px-3 py-1.5 text-xs text-on-surface outline-none"
                                    />
                                    <button
                                      type="button"
                                      disabled={savingMemberEmail}
                                      onClick={() => handleUpdateMemberEmail(member.id)}
                                      className="px-3 py-1.5 rounded-xl bg-secondary text-on-secondary text-xs font-bold hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1"
                                    >
                                      {savingMemberEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                      Salvar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingEmailId(null);
                                        setMemberEmailError('');
                                      }}
                                      className="px-3 py-1.5 rounded-xl bg-surface-container-high text-xs font-bold text-on-surface-variant hover:text-on-surface"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                  {memberEmailError && (
                                    <p className="text-[11px] text-error font-semibold">{memberEmailError}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <span className={cn(
                            'px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border shrink-0',
                            member.is_approved
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : 'bg-error/10 border-error/20 text-error'
                          )}>
                            {member.is_approved ? 'Ativo' : 'Pendente'}
                          </span>
                        </div>

                        {/* Linha 2: Cargo e Ações confortáveis */}
                        <div className="pt-3 border-t border-outline-variant/10 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-outline">Cargo:</span>
                            <div className="relative">
                              <select
                                value={member.role || 'Advogado'}
                                onChange={(e) => updateProfileRole(member.id, e.target.value)}
                                className="appearance-none bg-surface-container-high text-xs font-bold text-on-surface pl-3.5 pr-8 py-2 rounded-xl border border-outline-variant/15 focus:border-secondary outline-none cursor-pointer"
                              >
                                <option value="Estagiário">Estagiário</option>
                                <option value="Advogado">Advogado</option>
                                <option value="Assessor Jurídico">Assessor Jurídico</option>
                                <option value="Advogado com Controladoria">Advogado com Controladoria</option>
                                <option value="Administrador">Administrador</option>
                              </select>
                              <ChevronDown className="w-3.5 h-3.5 text-outline absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleApproval(member.id, member.is_approved)}
                              className={cn(
                                'flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors',
                                member.is_approved
                                  ? 'bg-surface-container-high text-on-surface-variant hover:bg-amber-500/15 hover:text-amber-400'
                                  : 'bg-secondary text-on-secondary hover:opacity-90'
                              )}
                            >
                              {member.is_approved ? (
                                <>
                                  <XCircle className="w-3.5 h-3.5" />
                                  Desativar
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Aprovar
                                </>
                              )}
                            </button>

                            {confirmDeleteId === member.id ? (
                              <div className="flex items-center gap-1 bg-error/10 p-1 rounded-xl border border-error/20">
                                <button
                                  onClick={() => deleteUser(member.id)}
                                  disabled={deletingUserId === member.id}
                                  className="px-2.5 py-1 bg-error text-white text-[10px] font-black uppercase rounded-lg hover:opacity-90 flex items-center gap-1 disabled:opacity-50"
                                >
                                  {deletingUserId === member.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirmar'}
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="p-1 text-error hover:bg-error/20 rounded-lg"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(member.id)}
                                className="p-2 bg-surface-container-high text-outline hover:bg-error/10 hover:text-error rounded-xl transition-colors"
                                title="Excluir Usuário"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'productivity' && isAdmin && (
            <div className="space-y-6">
              <div className="bg-surface-container-low p-6 sm:p-8 rounded-3xl border border-outline-variant/10">
                <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                  <div>
                    <h4 className="text-xl font-headline font-bold text-on-surface tracking-tight">Ranking de Produtividade</h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">Pontuação baseada nas tarefas concluídas por colaborador.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex bg-surface-container-high rounded-xl p-1 border border-outline-variant/10">
                      {[
                        { id: 'Advogado', label: 'Advogados' },
                        { id: 'Estagiário', label: 'Estagiários' },
                        { id: 'Assessor Jurídico', label: 'Assessores' },
                      ].map(r => (
                        <button
                          key={r.id}
                          onClick={() => setProductivityRoleFilter(r.id)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors',
                            productivityRoleFilter === r.id
                              ? 'bg-secondary text-on-secondary'
                              : 'text-outline hover:text-on-surface'
                          )}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={fetchProductivityData}
                      className="p-2 bg-surface-container-high rounded-xl text-secondary hover:bg-secondary/15 transition-colors"
                      title="Recalcular"
                    >
                      {loadingProductivity ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {(() => {
                  const filteredData = productivityData.filter(p => p.role === productivityRoleFilter);
                  const totalPoints = filteredData.reduce((acc, p) => acc + p.points, 0);
                  const avgPoints = filteredData.length ? Math.round(totalPoints / filteredData.length) : 0;
                  const leader = filteredData[0];

                  return (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        <div className="bg-secondary/5 border border-secondary/15 p-4 rounded-2xl flex items-center gap-3">
                          <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary shrink-0">
                            <Award className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black text-outline uppercase tracking-wider">Líder</p>
                            <p className="text-sm font-bold text-on-surface truncate">{leader?.name || 'Nenhum'}</p>
                          </div>
                        </div>
                        <div className="bg-secondary/5 border border-secondary/15 p-4 rounded-2xl flex items-center gap-3">
                          <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary shrink-0">
                            <Target className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-outline uppercase tracking-wider">Média do Cargo</p>
                            <p className="text-sm font-bold text-on-surface">{avgPoints} pts</p>
                          </div>
                        </div>
                        <div className="bg-secondary/5 border border-secondary/15 p-4 rounded-2xl flex items-center gap-3">
                          <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary shrink-0">
                            <TrendingUp className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-outline uppercase tracking-wider">Total Acumulado</p>
                            <p className="text-sm font-bold text-on-surface">{totalPoints} pts</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {loadingProductivity ? (
                          <div className="py-12 flex flex-col items-center justify-center gap-3 opacity-60">
                            <Loader2 className="w-8 h-8 animate-spin text-secondary" />
                            <p className="text-xs font-medium">Calculando desempenho...</p>
                          </div>
                        ) : filteredData.length === 0 ? (
                          <div className="text-center py-12 bg-surface-container-lowest/30 rounded-2xl border border-dashed border-outline-variant/20">
                            <Trophy className="w-7 h-7 text-outline mx-auto mb-2 opacity-40" />
                            <p className="text-xs font-bold text-outline uppercase tracking-wider">Nenhum {productivityRoleFilter} encontrado.</p>
                          </div>
                        ) : (
                          filteredData.map((p, index) => {
                            const maxPoints = Math.max(...filteredData.map(d => d.points)) || 1;
                            const progress = (p.points / maxPoints) * 100;

                            return (
                              <div key={p.id} className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10 flex items-center gap-4">
                                <div className="w-7 flex justify-center shrink-0">
                                  {index === 0 ? (
                                    <Award className="w-5 h-5 text-amber-400" />
                                  ) : (
                                    <span className="text-sm font-black text-outline/50">#{index + 1}</span>
                                  )}
                                </div>

                                <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center font-headline font-black text-secondary shrink-0">
                                  {p.name?.charAt(0).toUpperCase()}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-baseline mb-1.5">
                                    <h5 className="text-sm font-bold text-on-surface truncate">{p.name}</h5>
                                    <div className="text-right shrink-0 ml-2">
                                      <span className="text-sm font-black text-secondary">{p.points}</span>
                                      <span className="text-[10px] text-outline font-bold ml-1">pts</span>
                                    </div>
                                  </div>
                                  <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-secondary rounded-full"
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-between mt-1.5 text-[10px] font-bold text-outline">
                                    <span>{p.taskCount} tarefas concluídas</span>
                                    <span className="text-secondary">{Math.round(progress)}% do líder</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="p-6 bg-surface-container-low rounded-3xl border border-outline-variant/10">
                <h5 className="text-xs font-black text-outline uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400" />
                  Pontuação por Tipo de Tarefa
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Audiência', pts: 15 },
                    { label: 'Petição', pts: 10 },
                    { label: 'Diligência', pts: 8 },
                    { label: 'Demais tarefas', pts: 3 },
                  ].map(item => (
                    <div key={item.label} className="p-3 bg-surface-container-lowest rounded-xl flex flex-col items-center gap-1 border border-outline-variant/10">
                      <span className="text-[11px] font-semibold text-on-surface-variant">{item.label}</span>
                      <span className={cn('text-xs font-black', item.pts >= 10 ? 'text-secondary' : 'text-outline')}>+{item.pts} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'intimacoes_config' && isAdmin && (
            <div className="bg-surface-container-low p-6 sm:p-8 rounded-3xl border border-outline-variant/10 space-y-6">
              <div>
                <h4 className="text-xl font-headline font-bold text-on-surface tracking-tight flex items-center gap-2.5">
                  <Bookmark className="w-5 h-5 text-secondary" />
                  Monitoramento DJEN
                </h4>
                <p className="text-xs text-on-surface-variant mt-1">
                  Define o advogado e a OAB monitorados automaticamente na aba de Intimações para toda a equipe.
                </p>
              </div>

              <div className="p-4 bg-secondary/5 border border-secondary/15 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Configuração global compartilhada com advogados, assessores e administradores.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-outline uppercase tracking-wider">Nome do Advogado</label>
                  <input
                    type="text"
                    value={djenName}
                    onChange={(e) => setDjenName(e.target.value)}
                    placeholder="Ex: Brenda Margalho"
                    className="w-full bg-surface-container-lowest border border-outline-variant/15 rounded-xl px-4 py-3 text-sm text-on-surface focus:border-secondary/60 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-outline uppercase tracking-wider">Número da OAB</label>
                  <input
                    type="text"
                    value={djenOab}
                    onChange={(e) => setDjenOab(e.target.value)}
                    placeholder="Ex: 12345-PA"
                    className="w-full bg-surface-container-lowest border border-outline-variant/15 rounded-xl px-4 py-3 text-sm text-on-surface focus:border-secondary/60 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-outline-variant/10">
                <div className="text-xs text-on-surface-variant">
                  {djenName && (
                    <span>
                      Ativo: <strong className="text-on-surface">{djenName}</strong>
                      {djenOab && <span className="ml-1 text-outline">({djenOab})</span>}
                    </span>
                  )}
                </div>
                <button
                  disabled={djenSaving}
                  onClick={async () => {
                    setDjenSaving(true);
                    const currentUser = authUser?.id ? { id: authUser.id } : (await supabase.auth.getUser()).data.user;
                    await supabase.from('system_settings').upsert([
                      { key: 'djen_nome_padrao', value: djenName, updated_by: currentUser?.id, updated_at: new Date().toISOString() },
                      { key: 'djen_oab_padrao', value: djenOab, updated_by: currentUser?.id, updated_at: new Date().toISOString() },
                    ]);
                    setDjenSaving(false);
                    setDjenSaved(true);
                    setTimeout(() => setDjenSaved(false), 3000);
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-secondary text-on-secondary font-headline font-bold text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {djenSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {djenSaved ? 'Salvo!' : 'Salvar Configurações'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'datajud_config' && isAdmin && (
            <div className="bg-surface-container-low p-6 sm:p-8 rounded-3xl border border-outline-variant/10 space-y-6">
              <div>
                <h4 className="text-xl font-headline font-bold text-on-surface tracking-tight flex items-center gap-2.5">
                  <Database className="w-5 h-5 text-secondary" />
                  API Datajud — CNJ
                </h4>
                <p className="text-xs text-on-surface-variant mt-1">
                  Chave pública usada para consultar andamentos processuais nos tribunais brasileiros.
                </p>
              </div>

              <div className="p-4 bg-secondary/5 border border-secondary/15 rounded-2xl flex items-start gap-3">
                <Key className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Disponibilizada pelo CNJ em{' '}
                  <a href="https://datajud-wiki.cnj.jus.br/api-publica/acesso" target="_blank" rel="noopener noreferrer" className="text-secondary font-bold hover:underline">
                    datajud-wiki.cnj.jus.br
                  </a>.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-outline uppercase tracking-wider">API Key (Chave Pública)</label>
                <input
                  type="text"
                  value={datajudApiKey}
                  onChange={(e) => setDatajudApiKey(e.target.value)}
                  placeholder="Cole aqui a chave pública do Datajud"
                  className="w-full bg-surface-container-lowest border border-outline-variant/15 rounded-xl px-4 py-3 text-sm font-mono text-on-surface focus:border-secondary/60 outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-outline-variant/10">
                <div className="text-xs text-on-surface-variant">
                  {datajudApiKey && (
                    <span>
                      Chave salva: <strong className="text-on-surface font-mono">{datajudApiKey.slice(0, 12)}...</strong>
                    </span>
                  )}
                </div>
                <button
                  disabled={datajudSaving}
                  onClick={async () => {
                    setDatajudSaving(true);
                    const currentUser = authUser?.id ? { id: authUser.id } : (await supabase.auth.getUser()).data.user;
                    await supabase.from('system_settings').upsert([{
                      key: 'datajud_api_key',
                      value: datajudApiKey,
                      updated_by: currentUser?.id,
                      updated_at: new Date().toISOString(),
                    }]);
                    setDatajudSaving(false);
                    setDatajudSaved(true);
                    setTimeout(() => setDatajudSaved(false), 3000);
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-secondary text-on-secondary font-headline font-bold text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {datajudSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {datajudSaved ? 'Salvo!' : 'Salvar API Key'}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
