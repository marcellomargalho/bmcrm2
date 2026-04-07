import React, { useState, useEffect } from 'react';
import { User, Bell, Shield, CreditCard, Globe, Moon, Sun, Save, Camera, Users, CheckCircle, XCircle, ChevronDown, Trophy, TrendingUp, Award, Target, Star, Loader2, Bookmark, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export function Settings() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('perfil');
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

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileData) {
          setProfile(profileData);
        }
      }
    }
    getProfile();
    
    // Load DJEN settings from Supabase (global admin config)
    async function loadDjenSettings() {
      const { data } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['djen_nome_padrao', 'djen_oab_padrao']);
      if (data) {
        setDjenName(data.find(s => s.key === 'djen_nome_padrao')?.value || '');
        setDjenOab(data.find(s => s.key === 'djen_oab_padrao')?.value || '');
      }
    }
    loadDjenSettings();
  }, []);

  const isAdmin = profile?.role === 'Administrador';

  useEffect(() => {
    if (isAdmin) {
      if (activeTab === 'equipe') fetchProfiles();
      if (activeTab === 'productivity') fetchProductivityData();
    }
  }, [isAdmin, activeTab]);

  const fetchProductivityData = async () => {
    setLoadingProductivity(true);
    try {
      // 1. Fetch all profiles
      const { data: allProfiles } = await supabase.from('profiles').select('id, name, role');
      
      // 2. Fetch all COMPLETED tasks
      const { data: allTasks } = await supabase
        .from('tasks')
        .select('task_type, responsible, status')
        .eq('status', 'Concluída');

      // 3. Scoring Rules
      const SCORING: Record<string, number> = {
        'Audiência': 15,
        'Audiência de Instrução ou Conciliação': 15,
        'Petição': 10,
        'Diligência': 8,
        'Protocolo': 5,
        'Análise de Processo': 5,
        'Default': 3
      };

      // 4. Calculate Scores
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
          taskCount: userTasks.length
        };
      }).sort((a, b) => b.points - a.points);

      setProductivityData(stats);
    } catch (err) {
      console.error("Erro ao carregar produtividade:", err);
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
    
    if (!error) {
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

  const userName = profile?.name || user?.user_metadata?.full_name || '';
  const userEmail = profile?.email || user?.email || '';
  const role = profile?.role || 'Advogado';

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <section>
        <h2 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface mb-2">Configurações</h2>
        <p className="text-on-surface-variant">Personalize sua experiência no sistema e gerencie sua segurança.</p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
        <aside className="md:col-span-4 space-y-2">
          {[
            { id: 'perfil', icon: User, label: 'Perfil Profissional' },
            { id: 'equipe', icon: Users, label: 'Gestão de Equipe', adminOnly: true },
            { id: 'productivity', icon: Trophy, label: 'Produtividade', adminOnly: true },
            { id: 'intimacoes_config', icon: Bookmark, label: 'Monitoramento DJEN', adminOnly: true },
            { id: 'notifications', icon: Bell, label: 'Notificações' },
            { id: 'security', icon: Shield, label: 'Segurança e Acesso' },
            { id: 'billing', icon: CreditCard, label: 'Assinatura e Planos' },
            { id: 'region', icon: Globe, label: 'Idioma e Region' },
          ].filter(item => !item.adminOnly || isAdmin).map((item) => (
            <button 
              key={item.id} 
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-headline text-sm font-bold transition-all",
                activeTab === item.id 
                  ? "bg-secondary text-on-secondary shadow-lg shadow-secondary/10" 
                  : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </aside>

        <main className="md:col-span-8 space-y-10">
          {activeTab === 'perfil' && (
            <>
              <div className="bg-surface-container-low p-8 rounded-3xl border border-outline-variant/5 space-y-8">
                <div className="flex items-center gap-6">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-2xl ring-4 ring-secondary/20 bg-surface-container-high flex items-center justify-center">
                      <span className="font-headline font-bold text-secondary text-3xl">{userName ? userName.charAt(0).toUpperCase() : 'U'}</span>
                    </div>
                    <button className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center text-white">
                      <Camera className="w-6 h-6" />
                    </button>
                  </div>
                  <div>
                    <h4 className="text-xl font-headline font-bold text-on-surface">{userName}</h4>
                    <p className="text-sm text-on-surface-variant font-medium tracking-wide">{role}</p>
                    <button className="mt-2 text-xs font-bold text-secondary hover:underline uppercase tracking-widest">Alterar Foto</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Nome de Exibição</label>
                    <input 
                      type="text" 
                      defaultValue={userName} 
                      className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-secondary/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">E-mail de Contato</label>
                    <input 
                      type="email" 
                      defaultValue={userEmail} 
                      className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-secondary/20 outline-none"
                    />
                  </div>
                   <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Função</label>
                    <div className="relative">
                      <select 
                        defaultValue={role} 
                        disabled={true}
                        className={cn(
                          "w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-secondary/20 outline-none appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                      >
                        <option value="Estagiário">Estagiário</option>
                        <option value="Advogado">Advogado</option>
                        <option value="Assessor Jurídico">Assessor Jurídico</option>
                        <option value="Administrador">Administrador</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Shield className="w-3.5 h-3.5 text-outline opacity-50" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Área de Atuação</label>
                    <select className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-secondary/20 outline-none appearance-none">
                      <option>Penal</option>
                      <option>Civil</option>
                      <option>Trabalhista</option>
                    </select>
                  </div>
                </div>

                {/* DJEN block removed — now in admin-only Monitoramento DJEN tab */}

                <div className="pt-6 border-t border-outline-variant/10 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Tema do Sistema</span>
                    <div className="flex bg-surface-container-lowest rounded-lg p-1 border border-outline-variant/10">
                      <button className="p-1.5 rounded bg-surface-container-high text-secondary"><Moon className="w-4 h-4" /></button>
                      <button className="p-1.5 rounded text-outline hover:text-on-surface"><Sun className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <button 
                    className="flex items-center gap-2 px-8 py-3 bg-secondary text-on-secondary font-headline font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-secondary/10"
                  >
                    <Save className="w-4 h-4" />
                    Salvar Alterações
                  </button>
                </div>
              </div>

              <div className="bg-error/5 p-8 rounded-3xl border border-error/10 space-y-4">
                <h4 className="text-lg font-headline font-bold text-error">Zona de Risco</h4>
                <p className="text-sm text-on-surface-variant">Ao excluir sua conta, todos os seus dados, processos e documentos serão permanentemente removidos. Esta ação não pode ser desfeita.</p>
                <button className="px-6 py-2.5 bg-transparent border border-error/30 text-error text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-error hover:text-white transition-all">Excluir Minha Conta</button>
              </div>
            </>
          )}

          {activeTab === 'productivity' && isAdmin && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-surface-container-low p-8 rounded-3xl border border-outline-variant/5">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h4 className="text-xl font-headline font-bold text-on-surface tracking-tight">Ranking de Produtividade</h4>
                    <p className="text-sm text-on-surface-variant">Análise de pontos por colaborador.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex bg-surface-container-high rounded-xl p-1 border border-outline-variant/10">
                      {[
                        { id: 'Advogado', label: 'Advogados' },
                        { id: 'Estagiário', label: 'Estagiários' },
                        { id: 'Assessor Jurídico', label: 'Assessores' }
                      ].map(role => (
                        <button
                          key={role.id}
                          onClick={() => setProductivityRoleFilter(role.id)}
                          className={cn(
                            "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                            productivityRoleFilter === role.id 
                              ? "bg-secondary text-on-secondary shadow-sm" 
                              : "text-outline hover:text-on-surface"
                          )}
                        >
                          {role.label}
                        </button>
                      ))}
                    </div>
                    <button 
                      onClick={fetchProductivityData}
                      className="p-2.5 bg-surface-container-high rounded-xl text-secondary hover:scale-105 transition-all shadow-sm"
                    >
                      {loadingProductivity ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trophy className="w-5 h-5" />}
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
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                        <div className="bg-secondary/5 border border-secondary/10 p-6 rounded-2xl flex items-center gap-4">
                          <div className="relative">
                            <Star className="w-10 h-10 text-secondary opacity-20" />
                            <Award className="w-6 h-6 text-secondary absolute inset-0 m-auto" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-outline uppercase tracking-widest">Líder da Categoria</p>
                            <p className="text-base font-bold text-on-surface truncate max-w-[120px]">{leader?.name || 'Nenhum'}</p>
                          </div>
                        </div>
                        <div className="bg-secondary/5 border border-secondary/10 p-6 rounded-2xl flex items-center gap-4">
                          <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary">
                            <Target className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-outline uppercase tracking-widest">Média do Cargo</p>
                            <p className="text-base font-bold text-on-surface">{avgPoints} pts</p>
                          </div>
                        </div>
                        <div className="bg-secondary/5 border border-secondary/10 p-6 rounded-2xl flex items-center gap-4">
                          <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary">
                            <TrendingUp className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-outline uppercase tracking-widest">Total Acumulado</p>
                            <p className="text-base font-bold text-on-surface">{totalPoints} pts</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {loadingProductivity ? (
                          <div className="py-20 flex flex-col items-center justify-center gap-4 opacity-50">
                            <Loader2 className="w-10 h-10 animate-spin text-secondary" />
                            <p className="text-sm font-medium">Calculando performance...</p>
                          </div>
                        ) : filteredData.length === 0 ? (
                          <div className="text-center py-20 bg-surface-container-lowest/30 rounded-3xl border border-dashed border-outline-variant/20">
                            <div className="w-16 h-16 bg-surface-container-high rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                              <Trophy className="w-8 h-8 text-outline" />
                            </div>
                            <p className="text-sm font-bold text-outline uppercase tracking-widest">Nenhum {productivityRoleFilter} encontrado.</p>
                          </div>
                        ) : (
                          filteredData.map((p, index) => {
                            const maxPoints = Math.max(...filteredData.map(d => d.points)) || 1;
                            const progress = (p.points / maxPoints) * 100;
                            
                            return (
                              <div key={p.id} className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 flex items-center gap-6 group hover:border-secondary/20 transition-all">
                                <div className="w-8 flex flex-col items-center justify-center">
                                  {index === 0 ? (
                                    <Award className="w-6 h-6 text-amber-400" />
                                  ) : (
                                    <span className="text-base font-black text-outline/40">#{index + 1}</span>
                                  )}
                                </div>
                                
                                <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center font-headline font-black text-secondary border border-outline-variant/10">
                                  {p.name?.charAt(0).toUpperCase()}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-end mb-2">
                                    <div>
                                      <h5 className="text-sm font-bold text-on-surface truncate">{p.name}</h5>
                                      <p className="text-[10px] text-outline font-medium uppercase tracking-wider">{p.role}</p>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-base font-black text-secondary">{p.points}</span>
                                      <span className="text-[10px] text-outline font-black ml-1 uppercase">pts</span>
                                    </div>
                                  </div>
                                  <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-gradient-to-r from-secondary to-secondary/60 rounded-full transition-all duration-1000 ease-out"
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-between mt-2">
                                    <span className="text-[9px] font-bold text-outline uppercase tracking-widest">{p.taskCount} tarefas concluídas</span>
                                    <span className="text-[9px] font-bold text-secondary uppercase tracking-widest">{Math.round(progress)}% da meta</span>
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

              {/* Guia de Pontos */}
              <div className="p-8 bg-surface-container-lowest rounded-3xl border border-outline-variant/10">
                <h5 className="text-xs font-black text-outline uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400" />
                  Guia de Pontuação
                </h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Audiência', pts: 15, color: 'bg-emerald-500' },
                    { label: 'Petição', pts: 10, color: 'bg-blue-500' },
                    { label: 'Diligência', pts: 8, color: 'bg-amber-500' },
                    { label: 'Outros', pts: 3, color: 'bg-outline' },
                  ].map(item => (
                    <div key={item.label} className="p-3 bg-surface-container-low rounded-xl flex flex-col items-center gap-1 border border-outline-variant/5">
                      <span className="text-[10px] font-bold text-on-surface-variant">{item.label}</span>
                      <span className={cn("text-xs font-black", item.pts >= 10 ? "text-secondary" : "text-outline")}>+{item.pts} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'intimacoes_config' && isAdmin && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-surface-container-low p-8 rounded-3xl border border-outline-variant/5 space-y-8">
                <div>
                  <h4 className="text-xl font-headline font-bold text-on-surface tracking-tight flex items-center gap-3">
                    <Bookmark className="w-5 h-5 text-secondary" />
                    Monitoramento DJEN
                  </h4>
                  <p className="text-sm text-on-surface-variant mt-1">
                    Configure o advogado que será monitorado globalmente pela equipe na aba de Intimações.
                  </p>
                </div>

                <div className="p-4 bg-secondary/5 border border-secondary/15 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    As configurações abaixo são <strong className="text-on-surface">globais e compartilhadas</strong> com toda a equipe (exceto estagiários). Ao salvar, a aba de Intimações automaticamente buscará as publicações do advogado configurado.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Nome do Advogado Monitorado</label>
                    <input 
                      type="text" 
                      value={djenName}
                      onChange={(e) => setDjenName(e.target.value)}
                      placeholder="Ex: Nome Completo"
                      className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-secondary/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">OAB do Advogado</label>
                    <input 
                      type="text" 
                      value={djenOab}
                      onChange={(e) => setDjenOab(e.target.value)}
                      placeholder="Ex: 123456-SP"
                      className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-secondary/20 outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-outline-variant/10">
                  <div>
                    {djenName && (
                      <p className="text-xs text-on-surface-variant">
                        Monitorando: <strong className="text-on-surface">{djenName}</strong>
                        {djenOab && <span className="ml-1 text-outline">({djenOab})</span>}
                      </p>
                    )}
                  </div>
                  <button 
                    disabled={djenSaving}
                    onClick={async () => {
                      setDjenSaving(true);
                      const user = (await supabase.auth.getUser()).data.user;
                      await supabase.from('system_settings').upsert([
                        { key: 'djen_nome_padrao', value: djenName, updated_by: user?.id, updated_at: new Date().toISOString() },
                        { key: 'djen_oab_padrao', value: djenOab, updated_by: user?.id, updated_at: new Date().toISOString() },
                      ]);
                      setDjenSaving(false);
                      setDjenSaved(true);
                      setTimeout(() => setDjenSaved(false), 3000);
                    }}
                    className="flex items-center gap-2 px-8 py-3 bg-secondary text-on-secondary font-headline font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-secondary/10 disabled:opacity-60"
                  >
                    {djenSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {djenSaved ? 'Salvo!' : 'Salvar Configurações'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'equipe' && isAdmin && (
            <div className="bg-surface-container-low p-8 rounded-3xl border border-outline-variant/5 space-y-8">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xl font-headline font-bold text-on-surface tracking-tight">Membros da Equipe</h4>
                  <p className="text-sm text-on-surface-variant">Gerencie as permissões e aprovações de acesso ao CRM.</p>
                </div>
                <button 
                  onClick={fetchProfiles}
                  className="p-2 text-outline hover:text-secondary transition-colors"
                  title="Atualizar lista"
                >
                  <Globe className={cn("w-5 h-5", loadingProfiles && "animate-spin")} />
                </button>
              </div>

              <div className="space-y-4">
                {profiles.length === 0 ? (
                  <div className="text-center py-12 bg-surface-container-lowest/50 rounded-2xl border border-dashed border-outline-variant/20">
                    <p className="text-sm text-on-surface-variant">Nenhum colaborador encontrado.</p>
                  </div>
                ) : (
                  profiles.map((profile) => (
                    <div 
                      key={profile.id} 
                      className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 flex flex-col md:flex-row md:items-center gap-6 group hover:border-secondary/20 transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center font-headline font-black text-secondary text-xl border border-secondary/20 shadow-inner">
                          {profile.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="space-y-1">
                          <h5 className="text-base font-bold text-on-surface leading-tight">{profile.name}</h5>
                          <p className="text-xs text-outline font-medium">{profile.email}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 md:gap-8">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-black text-outline uppercase tracking-widest px-1">Função</span>
                          <div className="relative group/select">
                            <select 
                              value={profile.role || 'Advogado'} 
                              onChange={(e) => updateProfileRole(profile.id, e.target.value)}
                              className="appearance-none bg-surface-container-high/50 hover:bg-surface-container-high text-xs font-bold text-on-surface px-4 py-2 rounded-xl border border-outline-variant/20 focus:ring-2 focus:ring-secondary/20 outline-none cursor-pointer transition-all pr-10"
                            >
                              <option value="Estagiário">Estagiário</option>
                              <option value="Advogado">Advogado</option>
                              <option value="Assessor Jurídico">Assessor Jurídico</option>
                              <option value="Administrador">Administrador</option>
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-outline absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none group-hover/select:text-secondary transition-colors" />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-black text-outline uppercase tracking-widest px-1">Status</span>
                          <div className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border text-center min-w-[100px]",
                            profile.is_approved 
                              ? "bg-secondary/5 border-secondary/20 text-secondary" 
                              : "bg-error/5 border-error/20 text-error"
                          )}>
                            {profile.is_approved ? 'Ativo' : 'Pendente'}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-black text-transparent uppercase tracking-widest px-1 hidden md:block">Ações</span>
                          <button 
                            onClick={() => toggleApproval(profile.id, profile.is_approved)}
                            className={cn(
                              "flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm",
                              profile.is_approved
                                ? "bg-surface-container-high text-on-surface-variant hover:bg-error/10 hover:text-error hover:border-error/20 border border-transparent"
                                : "bg-secondary text-on-secondary hover:opacity-90 shadow-lg shadow-secondary/10"
                            )}
                          >
                            {profile.is_approved ? (
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
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
