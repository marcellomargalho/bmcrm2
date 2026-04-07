import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ExternalLink, Calendar, Plus, Loader2, AlertCircle, Bookmark, RefreshCw, Printer, Bell, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchIntimacoesFromDjen, DjenIntimacao } from '@/lib/djen';
import { NewTaskModal } from '@/components/NewTaskModal';
import { supabase } from '@/lib/supabase';

// Colour mapping for tribunals
const TRIBUNAL_COLORS: Record<string, string> = {
  TRF1: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  TRF2: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  TRF3: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  TRF4: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  TRF5: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  TRF6: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  STJ: 'bg-red-500/15 text-red-400 border-red-500/20',
  STF: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
};

function getTribunalColor(sigla: string) {
  const key = Object.keys(TRIBUNAL_COLORS).find(k => sigla?.toUpperCase().includes(k));
  return key ? TRIBUNAL_COLORS[key] : 'bg-secondary/10 text-secondary border-secondary/20';
}

export function Intimacoes() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intimacoes, setIntimacoes] = useState<DjenIntimacao[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [advConfig, setAdvConfig] = useState({ nome: '', oab: '' });
  const [configLoaded, setConfigLoaded] = useState(false);
  const [lidasIds, setLidasIds] = useState<Set<number>>(new Set());
  const [markingId, setMarkingId] = useState<number | null>(null);

  // State for creating tasks from intimations
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedIntimacao, setSelectedIntimacao] = useState<DjenIntimacao | null>(null);

  const decodeHtmlEntities = (html: string) => {
    try {
      const txt = document.createElement('textarea');
      txt.innerHTML = html;
      return txt.value.replace(/<[^>]*>?/gm, '');
    } catch {
      return html;
    }
  };

  const performSearch = useCallback(async (nome: string, oab: string, silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    const result = await fetchIntimacoesFromDjen({ nomeAdvogado: nome, numeroOab: oab });

    if (!result) {
      setError('Não foi possível conectar à base do DJEN no momento. Tente novamente mais tarde.');
      setIntimacoes([]);
      setTotalCount(0);
    } else if (result.status === 'empty') {
      setError(result.message);
      setIntimacoes([]);
      setTotalCount(0);
    } else {
      setIntimacoes(result.items || []);
      setTotalCount(result.count || 0);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  // Load admin config from Supabase then trigger search
  useEffect(() => {
    async function loadConfig() {
      // Load DJEN settings
      const { data } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['djen_nome_padrao', 'djen_oab_padrao']);

      const nome = data?.find(s => s.key === 'djen_nome_padrao')?.value || '';
      const oab = data?.find(s => s.key === 'djen_oab_padrao')?.value || '';
      setAdvConfig({ nome, oab });
      setConfigLoaded(true);

      // Load already-read intimações for this user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: lidas } = await supabase
          .from('intimacoes_lidas')
          .select('intimacao_id')
          .eq('user_id', user.id);
        if (lidas) setLidasIds(new Set(lidas.map(l => Number(l.intimacao_id))));
      }

      if (nome || oab) {
        await performSearch(nome, oab);
      } else {
        setLoading(false);
        setError('Nenhum advogado configurado para monitoramento. Solicite ao Administrador configurar em Configurações → Monitoramento DJEN.');
      }
    }
    loadConfig();
  }, [performSearch]);

  const markAsRead = async (intimacaoId: number) => {
    setMarkingId(intimacaoId);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('intimacoes_lidas').upsert({
        user_id: user.id,
        intimacao_id: intimacaoId,
        lida_em: new Date().toISOString(),
      }, { onConflict: 'user_id,intimacao_id' });
      setLidasIds(prev => new Set([...prev, intimacaoId]));
    }
    setMarkingId(null);
  };

  const toggleExpand = (id: number) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Compute today's intimações (published today) — excluding already-read ones
  const today = new Date().toISOString().slice(0, 10);
  const todayItems = intimacoes.filter(i => i.data_disponibilizacao?.startsWith(today));
  const todayCount = todayItems.filter(i => !lidasIds.has(i.id)).length;

  return (
    <div className="max-w-7xl mx-auto space-y-10 print:space-y-6">
      {/* Header */}
      <section className="print:text-center print:border-b print:pb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface mb-1">Intimações DJEN</h2>
            <p className="text-on-surface-variant text-sm">
              Publicações do Diário de Justiça Eletrônico Nacional.
              {advConfig.nome && (
                <span className="ml-2 font-bold text-secondary">{advConfig.nome}{advConfig.oab && ` · OAB ${advConfig.oab}`}</span>
              )}
            </p>
          </div>
          {!loading && intimacoes.length > 0 && (
            <div className="flex items-center gap-3 print:hidden">
              <button
                onClick={() => performSearch(advConfig.nome, advConfig.oab, true)}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-surface-container-high text-on-surface text-xs font-bold uppercase tracking-widest hover:bg-surface-container-highest rounded-xl transition-all"
              >
                <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
                Atualizar
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-surface-container-high text-on-surface text-xs font-bold uppercase tracking-widest hover:bg-surface-container-highest rounded-xl transition-all"
              >
                <Printer className="w-4 h-4" /> Relatório
              </button>
            </div>
          )}
        </div>
        {/* Print header */}
        <div className="hidden print:block mt-3 text-sm text-outline">
          Relatório gerado em: {new Date().toLocaleString()}
        </div>
      </section>

      {/* Report Card */}
      {!loading && intimacoes.length > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
          {/* Total found */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/5 flex items-center gap-5"
          >
            <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center shrink-0">
              <Bookmark className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-[10px] font-black text-outline uppercase tracking-widest">Total Encontrado</p>
              <p className="text-3xl font-black text-on-surface leading-none mt-1">
                {totalCount > 1000 ? `${Math.floor(totalCount / 1000)}k+` : totalCount}
              </p>
              <p className="text-[10px] text-on-surface-variant mt-0.5">publicações encontradas</p>
            </div>
          </motion.div>

          {/* Today's count */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className={cn(
              'p-6 rounded-3xl border flex items-center gap-5',
              todayCount > 0
                ? 'bg-secondary/5 border-secondary/20'
                : 'bg-surface-container-low border-outline-variant/5'
            )}
          >
            <div className={cn(
              'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0',
              todayCount > 0 ? 'bg-secondary/15' : 'bg-surface-container-high'
            )}>
              <Bell className={cn('w-6 h-6', todayCount > 0 ? 'text-secondary' : 'text-outline')} />
            </div>
            <div>
              <p className="text-[10px] font-black text-outline uppercase tracking-widest">Novas Hoje</p>
              <p className={cn('text-3xl font-black leading-none mt-1', todayCount > 0 ? 'text-secondary' : 'text-on-surface')}>
                {todayCount}
              </p>
              <p className="text-[10px] text-on-surface-variant mt-0.5">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</p>
            </div>
          </motion.div>

          {/* Showing info */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/5 flex items-center gap-5"
          >
            <div className="w-12 h-12 bg-surface-container-high rounded-2xl flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6 text-outline" />
            </div>
            <div>
              <p className="text-[10px] font-black text-outline uppercase tracking-widest">Exibindo</p>
              <p className="text-3xl font-black text-on-surface leading-none mt-1">{intimacoes.length}</p>
              <p className="text-[10px] text-on-surface-variant mt-0.5">últimas publicações</p>
            </div>
          </motion.div>
        </section>
      )}

      {/* Results */}
      <section>
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-secondary" />
            <p className="text-base font-bold text-on-surface animate-pulse">Consultando Diários Oficiais...</p>
          </div>
        ) : error ? (
          <div className="bg-surface-container-low p-10 rounded-3xl border border-outline-variant/5 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 bg-error/5 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-error" />
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface mb-1">Não foi possível carregar as intimações</p>
              <p className="text-xs text-on-surface-variant max-w-sm">{error}</p>
            </div>
          </div>
        ) : intimacoes.length === 0 ? (
          <div className="text-center py-20 bg-surface-container-low/30 rounded-3xl border border-dashed border-outline-variant/20">
            <div className="w-16 h-16 bg-surface-container-high rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
              <Bookmark className="w-8 h-8 text-outline" />
            </div>
            <p className="text-sm font-bold text-outline uppercase tracking-widest">Nenhuma intimação encontrada.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 print:gap-3">
            {intimacoes.map((item, idx) => {
              const isExpanded = expandedItems.has(item.id);
              const tribunalColor = getTribunalColor(item.siglaTribunal);
              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  key={item.id}
                  className="bg-surface-container-lowest print:bg-transparent print:border-b rounded-3xl print:rounded-none border border-outline-variant/10 print:border-outline-variant/30 overflow-hidden hover:border-secondary/20 transition-all shadow-[0_4px_20px_rgb(0,0,0,0.04)] print:shadow-none print:break-inside-avoid"
                >
                  {/* Card header */}
                  <div className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                      {/* Tribunal badge */}
                      <span className={cn(
                        'text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border',
                        tribunalColor
                      )}>
                        {item.siglaTribunal}
                      </span>
                      {/* Tipo */}
                      <span className="text-[10px] uppercase font-bold tracking-widest bg-surface-container-high px-2.5 py-1 rounded-lg text-on-surface-variant border border-outline-variant/10">
                        {item.tipoComunicacao}
                      </span>
                      {/* Órgão */}
                      <span className="text-[10px] text-outline font-medium truncate max-w-[200px]">
                        {item.nomeOrgao}
                      </span>
                      {/* Número do processo */}
                      {item.numeros_processos && item.numeros_processos.length > 0 && (
                        <span className="text-[10px] font-mono font-bold text-outline border border-outline-variant/20 px-2 py-1 rounded-lg">
                          {item.numeros_processos[0]}
                        </span>
                      )}
                      {/* Data */}
                      <span className="ml-auto text-[10px] text-outline font-bold uppercase tracking-widest flex items-center gap-1 shrink-0">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.data_disponibilizacao).toLocaleDateString('pt-BR')}
                        {item.data_disponibilizacao?.startsWith(today) && (
                          <span className="ml-1 bg-secondary text-on-secondary text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">Hoje</span>
                        )}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 print:hidden">
                      {/* Confirm read — only for today's intimações */}
                      {item.data_disponibilizacao?.startsWith(today) && (
                        lidasIds.has(item.id) ? (
                          <span className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-xl border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Lida
                          </span>
                        ) : (
                          <button
                            onClick={() => markAsRead(item.id)}
                            disabled={markingId === item.id}
                            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-xl border border-emerald-500/20 transition-all disabled:opacity-50"
                          >
                            {markingId === item.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <CheckCircle2 className="w-3.5 h-3.5" />}
                            Confirmar Leitura
                          </button>
                        )
                      )}
                      <button
                        onClick={() => { setSelectedIntimacao(item); setIsTaskModalOpen(true); }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-secondary text-on-secondary text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tarefa
                      </button>
                      <a
                        href="https://comunica.pje.jus.br/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 bg-surface-container-high text-on-surface-variant text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-surface-container-highest transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Text body with expand */}
                  <div className="border-t border-outline-variant/5">
                    <div className="relative px-5 pt-4 pb-2">
                      <p className={cn(
                        'text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap print:text-black transition-all',
                        !isExpanded && 'line-clamp-3 print:line-clamp-none'
                      )}>
                        {decodeHtmlEntities(item.texto)}
                      </p>
                      {!isExpanded && (
                        <div className="absolute bottom-2 left-0 right-0 h-8 bg-gradient-to-t from-surface-container-lowest to-transparent pointer-events-none print:hidden" />
                      )}
                    </div>
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="w-full print:hidden flex items-center justify-center gap-2 py-2.5 bg-surface-container-low/50 hover:bg-surface-container-low text-secondary text-[10px] font-black uppercase tracking-widest transition-colors border-t border-outline-variant/5"
                    >
                      {isExpanded ? <><ChevronUp className="w-3.5 h-3.5" /> Recolher</> : <><ChevronDown className="w-3.5 h-3.5" /> Ler Íntegra</>}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      <AnimatePresence>
        {isTaskModalOpen && (
          <NewTaskModal
            isOpen={isTaskModalOpen}
            onClose={() => { setIsTaskModalOpen(false); setSelectedIntimacao(null); }}
            onSuccess={() => { setIsTaskModalOpen(false); setSelectedIntimacao(null); }}
            initialTaskType="Análise de Processo"
            initialDescription={selectedIntimacao
              ? `[INTIMAÇÃO - ${selectedIntimacao.siglaTribunal}]\nProcesso: ${selectedIntimacao.numeros_processos?.[0] || 'N/A'}\n\n${decodeHtmlEntities(selectedIntimacao.texto)}`
              : ''}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
