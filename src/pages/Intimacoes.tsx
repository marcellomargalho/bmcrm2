import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ExternalLink,
  Calendar,
  Plus,
  Loader2,
  AlertCircle,
  Bookmark,
  RefreshCw,
  Printer,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Copy,
  CheckCheck,
  Users,
  Scale,
  Gavel,
  Building2,
  Tag,
  FileText,
  Link2,
  User,
  X,
  Search,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  fetchIntimacoesFromDjen,
  normalizarIntimacao,
  gerarResumoIntimacao,
  type IntimacaoNormalizada,
  type ParteProceso,
} from '@/lib/djen';
import { NewTaskModal } from '@/components/NewTaskModal';
import { supabase } from '@/lib/supabase';
import { useAuthUser } from '@/lib/authContext';
import { getCached, setCached, isCacheFresh } from '@/lib/pageCache';

const CACHE_KEY = 'intimacoes_djen_v1';

interface IntimacoesCache {
  intimacoes: IntimacaoNormalizada[];
  totalCount: number;
  advConfig: { nome: string; oab: string };
  lidasIds: number[];
  page: number;
}

type StatusTab = 'todas' | 'hoje' | 'nao_lidas';

async function copyTextToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }
}

// ─── Modal de detalhes (clássico e leve) ──────────────────────
function DetalhesModal({
  item,
  onClose,
  onCreateTask,
}: {
  item: IntimacaoNormalizada;
  onClose: () => void;
  onCreateTask: (item: IntimacaoNormalizada) => void;
}) {
  const [copiedTexto, setCopiedTexto] = useState(false);
  const [copiedResumo, setCopiedResumo] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleCopy = async (text: string, setter: (v: boolean) => void) => {
    await copyTextToClipboard(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[300] bg-black/75 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl max-h-[90vh] bg-surface rounded-2xl border border-outline-variant/20 shadow-2xl flex flex-col overflow-hidden">
        {/* Cabeçalho do modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/15 bg-surface-container-low shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-surface-container-high border border-outline-variant/20 rounded-xl flex items-center justify-center shrink-0">
              <Bookmark className="w-4 h-4 text-secondary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-headline font-bold text-on-surface truncate">
                Detalhes da Publicação
              </p>
              <p className="text-[11px] text-outline tracking-wide truncate">
                DJEN — Diário de Justiça Eletrônico Nacional
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant/15 bg-surface-container-high hover:bg-surface-container-highest text-outline hover:text-on-surface transition-colors"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo do modal */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5 custom-scrollbar">
          {/* Identificação */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoRow label="Número do Processo" icon={Gavel} mono>
              {item.numeroProcessoMascara || 'Não informado'}
            </InfoRow>
            <InfoRow label="Classe Processual" icon={Tag}>
              {item.classeProcessual || 'Não informado'}
            </InfoRow>
            <InfoRow label="Tribunal" icon={Building2}>
              {item.tribunal || 'Não informado'}
            </InfoRow>
            <InfoRow label="Vara / Órgão Julgador" icon={Building2}>
              {item.orgao || 'Não informado'}
            </InfoRow>
            <InfoRow label="Data de Disponibilização" icon={Calendar}>
              {item.dataFormatada || 'Não informado'}
            </InfoRow>
            <InfoRow label="Tipo de Comunicação" icon={FileText}>
              {item.tipoComunicacao || 'Não informado'}
            </InfoRow>
            <InfoRow label="Meio de Comunicação" icon={FileText} className="md:col-span-2">
              {item.meioComunicacao || 'Não informado'}
            </InfoRow>
          </div>

          <div className="border-t border-outline-variant/10" />

          {/* Partes */}
          <div>
            <SectionLabel icon={Users}>Partes do Processo</SectionLabel>
            {item.partes.length === 0 ? (
              <p className="text-sm text-on-surface-variant">Não informado</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {item.partesAtivo.map((p, i) => (
                  <ParteRow key={`a-${i}`} parte={p} polo="ativo" />
                ))}
                {item.partesPassivo.map((p, i) => (
                  <ParteRow key={`p-${i}`} parte={p} polo="passivo" />
                ))}
                {item.partes
                  .filter((p) => p.polo !== 'A' && p.polo !== 'P')
                  .map((p, i) => (
                    <div
                      key={`o-${i}`}
                      className="flex items-center gap-2 bg-surface-container-low border border-outline-variant/15 rounded-xl px-3.5 py-2.5"
                    >
                      <User className="w-3.5 h-3.5 text-outline shrink-0" />
                      <span className="text-sm text-on-surface">{p.nome}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Advogados */}
          <div>
            <SectionLabel icon={Scale}>Advogados Vinculados</SectionLabel>
            {item.advogados.length === 0 ? (
              <p className="text-sm text-on-surface-variant">Não informado</p>
            ) : (
              <div className="space-y-2">
                {item.advogados.map((adv, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-surface-container-low rounded-xl px-4 py-2.5 border border-outline-variant/15"
                  >
                    <Scale className="w-4 h-4 text-secondary/80 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-on-surface truncate">{adv.nome}</p>
                      {adv.oab && <p className="text-xs text-outline">OAB {adv.oab}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-outline-variant/10" />

          {/* Texto integral */}
          <div>
            <SectionLabel icon={FileText}>Texto Integral da Publicação</SectionLabel>
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-4">
              <p className="text-[13px] text-on-surface-variant leading-relaxed whitespace-pre-wrap break-words">
                {item.texto || 'Não informado'}
              </p>
            </div>
          </div>

          {/* Link */}
          {item.link && (
            <div>
              <SectionLabel icon={Link2}>Link da Comunicação</SectionLabel>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs text-secondary hover:underline break-all"
              >
                <Link2 className="w-3.5 h-3.5 shrink-0" />
                {item.link}
              </a>
            </div>
          )}
        </div>

        {/* Rodapé do modal */}
        <div className="px-6 py-4 border-t border-outline-variant/15 bg-surface-container-low shrink-0 flex items-center gap-2.5 flex-wrap">
          <CopyButton
            label="Copiar Publicação"
            copied={copiedTexto}
            onClick={() => handleCopy(item.texto, setCopiedTexto)}
            primary
          />
          <CopyButton
            label="Copiar Resumo"
            copied={copiedResumo}
            onClick={() => handleCopy(gerarResumoIntimacao(item), setCopiedResumo)}
          />
          <button
            type="button"
            onClick={() => {
              onClose();
              onCreateTask(item);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-outline-variant/20 bg-surface-container-high/60 text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-secondary" />
            Criar Tarefa
          </button>
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-outline-variant/20 bg-surface-container-high/50 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Acessar no DJEN
            </a>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Helpers visuais ──────────────────────────────────────────
function InfoRow({
  label,
  icon: Icon,
  mono = false,
  children,
  className,
}: {
  label: string;
  icon?: React.ElementType;
  mono?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="text-[10px] font-bold text-outline uppercase tracking-wider flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </span>
      <span className={cn('text-sm text-on-surface break-words', mono && 'font-mono text-secondary')}>
        {children}
      </span>
    </div>
  );
}

function SectionLabel({ icon: Icon, children }: { icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold text-outline uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </p>
  );
}

function ParteRow({ parte, polo }: { key?: React.Key; parte: ParteProceso; polo: 'ativo' | 'passivo' }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 border bg-surface-container-low border-outline-variant/15">
      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant border border-outline-variant/15 shrink-0">
        {polo === 'ativo' ? 'Polo Ativo' : 'Polo Passivo'}
      </span>
      <span className="text-sm font-medium text-on-surface truncate">{parte.nome}</span>
    </div>
  );
}

function CopyButton({
  label,
  copied,
  onClick,
  primary = false,
}: {
  label: string;
  copied: boolean;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors border',
        copied
          ? 'bg-surface-container-high text-on-surface border-secondary/40'
          : primary
            ? 'bg-secondary text-on-secondary border-secondary hover:opacity-90'
            : 'bg-surface-container-high/60 text-on-surface-variant border-outline-variant/20 hover:text-on-surface hover:bg-surface-container-high'
      )}
    >
      {copied ? <CheckCheck className="w-3.5 h-3.5 text-secondary" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copiado' : label}
    </button>
  );
}

// ─── Componente principal ─────────────────────────────────────
export function Intimacoes() {
  const authUser = useAuthUser();
  const cached = getCached<IntimacoesCache>(CACHE_KEY);

  const [loading, setLoading] = useState<boolean>(() => !cached);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [intimacoes, setIntimacoes] = useState<IntimacaoNormalizada[]>(() => cached?.intimacoes || []);
  const [totalCount, setTotalCount] = useState<number>(() => cached?.totalCount ?? 0);
  const [page, setPage] = useState<number>(() => cached?.page ?? 1);
  const [advConfig, setAdvConfig] = useState<{ nome: string; oab: string }>(() => cached?.advConfig || { nome: '', oab: '' });

  const [lidasIds, setLidasIds] = useState<Set<number>>(() => new Set(cached?.lidasIds || []));
  const [markingId, setMarkingId] = useState<number | null>(null);

  // Filtros instantâneos em memória
  const [statusTab, setStatusTab] = useState<StatusTab>('todas');
  const [selectedTribunal, setSelectedTribunal] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [detalhesItem, setDetalhesItem] = useState<IntimacaoNormalizada | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedIntimacao, setSelectedIntimacao] = useState<IntimacaoNormalizada | null>(null);

  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [copiedProcessId, setCopiedProcessId] = useState<number | null>(null);

  const persistCache = useCallback(
    (next: Partial<IntimacoesCache>) => {
      const current = getCached<IntimacoesCache>(CACHE_KEY);
      setCached<IntimacoesCache>(CACHE_KEY, {
        intimacoes: next.intimacoes ?? current?.intimacoes ?? [],
        totalCount: next.totalCount ?? current?.totalCount ?? 0,
        advConfig: next.advConfig ?? current?.advConfig ?? { nome: '', oab: '' },
        lidasIds: next.lidasIds ?? current?.lidasIds ?? [],
        page: next.page ?? current?.page ?? 1,
      });
    },
    []
  );

  const performSearch = useCallback(
    async (
      nome: string,
      oab: string,
      silent = false,
      targetPage = 1,
      lidasOverride?: Set<number>
    ) => {
      const isAppend = targetPage > 1;
      if (isAppend) {
        setLoadingMore(true);
      } else if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      const result = await fetchIntimacoesFromDjen({
        nomeAdvogado: nome,
        numeroOab: oab,
        pagina: targetPage,
        itensPorPagina: 20,
      });

      if (!result) {
        if (!isAppend && !silent) {
          setError('Não foi possível conectar à base do DJEN no momento. Tente novamente mais tarde.');
          setIntimacoes([]);
          setTotalCount(0);
        }
      } else if (result.status === 'empty') {
        if (!isAppend) {
          setError(result.message);
          setIntimacoes([]);
          setTotalCount(0);
        }
      } else {
        const normalized = (result.items || []).map(normalizarIntimacao);
        const nextTotal = result.count || 0;

        setIntimacoes((prev) => {
          let nextList: IntimacaoNormalizada[];
          if (isAppend) {
            const seen = new Set(prev.map((i) => i.id));
            nextList = [...prev, ...normalized.filter((i) => !seen.has(i.id))];
          } else {
            nextList = normalized;
          }

          const lidasList = Array.from(lidasOverride ?? lidasIds);
          const todayStr = new Date().toISOString().slice(0, 10);
          const unreadToday = nextList.filter(
            (i) => i.dataDisponibilizacao?.startsWith(todayStr) && !lidasList.includes(i.id)
          ).length;
          setCached('djen_unread_count', unreadToday);

          persistCache({
            intimacoes: nextList,
            totalCount: nextTotal,
            advConfig: { nome, oab },
            lidasIds: lidasList,
            page: targetPage,
          });
          return nextList;
        });

        setTotalCount(nextTotal);
        setPage(targetPage);
      }

      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    },
    [lidasIds, persistCache]
  );

  // Carrega configuração e leituras em paralelo (sem auth.getUser na rede)
  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      let userId = authUser?.id;
      if (!userId) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        userId = session?.user?.id;
      }

      const [settingsRes, lidasRes] = await Promise.all([
        supabase.from('system_settings').select('key, value').in('key', ['djen_nome_padrao', 'djen_oab_padrao']),
        userId
          ? supabase.from('intimacoes_lidas').select('intimacao_id').eq('user_id', userId)
          : Promise.resolve({ data: null }),
      ]);

      if (cancelled) return;

      const nome = settingsRes.data?.find((s) => s.key === 'djen_nome_padrao')?.value || '';
      const oab = settingsRes.data?.find((s) => s.key === 'djen_oab_padrao')?.value || '';
      setAdvConfig({ nome, oab });

      const nextLidasArr = (lidasRes.data || []).map((l: any) => Number(l.intimacao_id));
      const nextLidasSet = new Set<number>(nextLidasArr);
      setLidasIds(nextLidasSet);

      const currentCache = getCached<IntimacoesCache>(CACHE_KEY);
      const hasCache = Boolean(currentCache && currentCache.intimacoes.length > 0);
      const configUnchanged =
        currentCache?.advConfig?.nome === nome && currentCache?.advConfig?.oab === oab;

      if (nome || oab) {
        if (hasCache && configUnchanged && isCacheFresh(CACHE_KEY, 180_000)) {
          persistCache({ lidasIds: nextLidasArr, advConfig: { nome, oab } });
          setLoading(false);
          return;
        }
        await performSearch(nome, oab, hasCache, 1, nextLidasSet);
      } else {
        setLoading(false);
        setError(
          'Nenhum advogado configurado para monitoramento. Solicite ao Administrador configurar em Configurações → Monitoramento DJEN.'
        );
      }
    }

    loadConfig();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id]);

  const markAsRead = async (intimacaoId: number) => {
    if (lidasIds.has(intimacaoId)) return;

    let userId = authUser?.id;
    if (!userId) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      userId = session?.user?.id;
    }
    if (!userId) return;

    // Atualização otimista imediata
    const prevSet = lidasIds;
    const nextSet = new Set(lidasIds);
    nextSet.add(intimacaoId);
    setLidasIds(nextSet);

    const nextLidasArr = Array.from(nextSet);
    persistCache({ lidasIds: nextLidasArr });

    const todayStr = new Date().toISOString().slice(0, 10);
    const nextTodayUnread = intimacoes.filter(
      (i) => i.dataDisponibilizacao?.startsWith(todayStr) && !nextSet.has(i.id)
    ).length;
    setCached('djen_unread_count', nextTodayUnread);

    setMarkingId(intimacaoId);
    const { error: upsertError } = await supabase.from('intimacoes_lidas').upsert(
      { user_id: userId, intimacao_id: intimacaoId, lida_em: new Date().toISOString() },
      { onConflict: 'user_id,intimacao_id' }
    );

    if (upsertError) {
      setLidasIds(prevSet);
      persistCache({ lidasIds: Array.from(prevSet) });
    }
    setMarkingId(null);
  };

  const toggleExpand = (id: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copyResumo = async (item: IntimacaoNormalizada) => {
    await copyTextToClipboard(gerarResumoIntimacao(item));
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyProcessNumber = async (item: IntimacaoNormalizada) => {
    if (!item.numeroProcessoMascara || item.numeroProcessoMascara === 'Não informado') return;
    await copyTextToClipboard(item.numeroProcessoMascara);
    setCopiedProcessId(item.id);
    setTimeout(() => setCopiedProcessId(null), 1500);
  };

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const { todayUnreadCount, totalUnreadCount, tribunaisDisponiveis, displayedIntimacoes } = useMemo(() => {
    let todayUnread = 0;
    let totalUnread = 0;
    const tribunalsSet = new Set<string>();

    for (const item of intimacoes) {
      const isLida = lidasIds.has(item.id);
      if (!isLida) {
        totalUnread++;
        if (item.dataDisponibilizacao?.startsWith(today)) {
          todayUnread++;
        }
      }
      if (item.tribunal && item.tribunal !== 'Não informado') {
        tribunalsSet.add(item.tribunal);
      }
    }

    const needle = searchQuery.trim().toLowerCase();
    const filtered = intimacoes.filter((item) => {
      if (statusTab === 'hoje' && !item.dataDisponibilizacao?.startsWith(today)) return false;
      if (statusTab === 'nao_lidas' && lidasIds.has(item.id)) return false;
      if (selectedTribunal && item.tribunal !== selectedTribunal) return false;
      if (needle) {
        const matchProc = item.numeroProcessoMascara.toLowerCase().includes(needle);
        const matchOrgao = item.orgao.toLowerCase().includes(needle);
        const matchTribunal = item.tribunal.toLowerCase().includes(needle);
        const matchTexto = item.texto.toLowerCase().includes(needle);
        const matchPartes = item.partes.some((p) => p.nome.toLowerCase().includes(needle));
        if (!matchProc && !matchOrgao && !matchTribunal && !matchTexto && !matchPartes) {
          return false;
        }
      }
      return true;
    });

    return {
      todayUnreadCount: todayUnread,
      totalUnreadCount: totalUnread,
      tribunaisDisponiveis: Array.from(tribunalsSet).sort(),
      displayedIntimacoes: filtered,
    };
  }, [intimacoes, lidasIds, today, statusTab, selectedTribunal, searchQuery]);

  const canLoadMore =
    !loading &&
    !error &&
    intimacoes.length < totalCount &&
    statusTab === 'todas' &&
    !selectedTribunal &&
    !searchQuery.trim();

  const openTaskModal = (item: IntimacaoNormalizada) => {
    setSelectedIntimacao(item);
    setIsTaskModalOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 print:space-y-4">
      {/* ── Cabeçalho clássico ─────────────────────────────── */}
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-outline-variant/15 pb-5 print:text-center">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-outline mb-1">
            Diário de Justiça Eletrônico Nacional
          </p>
          <h2 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface">
            Intimações
          </h2>
          {advConfig.nome && (
            <p className="text-xs text-on-surface-variant mt-1">
              Monitoramento ativo:{' '}
              <span className="font-semibold text-on-surface">{advConfig.nome}</span>
              {advConfig.oab && <span className="text-outline"> · OAB {advConfig.oab}</span>}
            </p>
          )}
        </div>

        {!loading && intimacoes.length > 0 && (
          <div className="flex items-center gap-2.5 print:hidden">
            <button
              type="button"
              onClick={() => performSearch(advConfig.nome, advConfig.oab, true, 1)}
              disabled={refreshing}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low hover:bg-surface-container-high text-on-surface text-xs font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('w-3.5 h-3.5 text-outline', refreshing && 'animate-spin')} />
              {refreshing ? 'Atualizando...' : 'Atualizar'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low hover:bg-surface-container-high text-on-surface text-xs font-medium transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-outline" />
              Imprimir
            </button>
          </div>
        )}

        <div className="hidden print:block mt-2 text-xs text-outline">
          Relatório gerado em: {new Date().toLocaleString('pt-BR')}
        </div>
      </section>

      {/* ── Resumo compacto + Filtros ───────────────────────── */}
      {!loading && !error && intimacoes.length > 0 && (
        <section className="space-y-3 print:hidden">
          <div className="bg-surface-container-low border border-outline-variant/15 rounded-xl grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-outline-variant/15">
            <div className="px-5 py-3.5">
              <p className="text-[11px] font-medium text-outline uppercase tracking-wider">Total no DJEN</p>
              <p className="text-2xl font-headline font-bold text-on-surface mt-0.5">
                {totalCount > 1000 ? `${Math.floor(totalCount / 1000)}k+` : totalCount}
              </p>
            </div>
            <div className="px-5 py-3.5">
              <p className="text-[11px] font-medium text-outline uppercase tracking-wider">Carregadas</p>
              <p className="text-2xl font-headline font-bold text-on-surface mt-0.5">{intimacoes.length}</p>
            </div>
            <button
              type="button"
              onClick={() => setStatusTab((prev) => (prev === 'hoje' ? 'todas' : 'hoje'))}
              className={cn(
                'px-5 py-3.5 text-left transition-colors hover:bg-surface-container-high/40',
                statusTab === 'hoje' && 'bg-surface-container-high/60'
              )}
            >
              <p className="text-[11px] font-medium text-outline uppercase tracking-wider">Novas Hoje</p>
              <p className={cn('text-2xl font-headline font-bold mt-0.5', todayUnreadCount > 0 ? 'text-secondary' : 'text-on-surface')}>
                {todayUnreadCount}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setStatusTab((prev) => (prev === 'nao_lidas' ? 'todas' : 'nao_lidas'))}
              className={cn(
                'px-5 py-3.5 text-left transition-colors hover:bg-surface-container-high/40',
                statusTab === 'nao_lidas' && 'bg-surface-container-high/60'
              )}
            >
              <p className="text-[11px] font-medium text-outline uppercase tracking-wider">Não Lidas</p>
              <p className="text-2xl font-headline font-bold text-on-surface mt-0.5">{totalUnreadCount}</p>
            </button>
          </div>

          {/* Barra de busca e filtros */}
          <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-outline absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar por nº do processo, parte, órgão ou texto..."
                className="w-full bg-surface-container-low border border-outline-variant/15 rounded-lg pl-9 pr-8 py-2 text-xs text-on-surface placeholder:text-outline/60 focus:border-secondary/50 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                  aria-label="Limpar busca"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {tribunaisDisponiveis.length > 1 && (
              <select
                value={selectedTribunal}
                onChange={(e) => setSelectedTribunal(e.target.value)}
                className="bg-surface-container-low border border-outline-variant/15 rounded-lg px-3 py-2 text-xs text-on-surface focus:border-secondary/50 outline-none"
              >
                <option value="">Todos os tribunais</option>
                {tribunaisDisponiveis.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}

            <div className="inline-flex bg-surface-container-low border border-outline-variant/15 rounded-lg p-0.5 self-start md:self-auto">
              {(
                [
                  { id: 'todas', label: 'Todas' },
                  { id: 'hoje', label: 'Hoje' },
                  { id: 'nao_lidas', label: 'Não lidas' },
                ] as { id: StatusTab; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusTab(tab.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                    statusTab === tab.id
                      ? 'bg-surface-container-highest text-on-surface'
                      : 'text-outline hover:text-on-surface-variant'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Conteúdo principal ─────────────────────────────── */}
      <section>
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-secondary" />
            <p className="text-sm font-medium text-on-surface-variant">
              Consultando Diários Oficiais...
            </p>
          </div>
        ) : error ? (
          <div className="bg-surface-container-low p-8 rounded-xl border border-outline-variant/15 flex flex-col items-center gap-3 text-center">
            <AlertCircle className="w-6 h-6 text-outline" />
            <div>
              <p className="text-sm font-semibold text-on-surface mb-1">
                Não foi possível carregar as intimações
              </p>
              <p className="text-xs text-on-surface-variant max-w-md">{error}</p>
            </div>
          </div>
        ) : intimacoes.length === 0 ? (
          <div className="text-center py-16 bg-surface-container-low/40 rounded-xl border border-dashed border-outline-variant/20">
            <Bookmark className="w-6 h-6 text-outline mx-auto mb-2 opacity-60" />
            <p className="text-xs font-medium text-outline uppercase tracking-wider">
              Nenhuma intimação encontrada.
            </p>
          </div>
        ) : displayedIntimacoes.length === 0 ? (
          <div className="text-center py-14 bg-surface-container-low/40 rounded-xl border border-outline-variant/15 space-y-2">
            <p className="text-sm font-medium text-on-surface-variant">
              Nenhuma publicação corresponde aos filtros atuais.
            </p>
            <button
              type="button"
              onClick={() => {
                setStatusTab('todas');
                setSelectedTribunal('');
                setSearchQuery('');
              }}
              className="text-xs font-semibold text-secondary hover:underline"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="space-y-3 print:space-y-2">
            {displayedIntimacoes.map((item) => {
              const isExpanded = expandedItems.has(item.id);
              const isLida = lidasIds.has(item.id);
              const isToday = item.dataDisponibilizacao?.startsWith(today);

              return (
                <article
                  key={item.id}
                  className={cn(
                    'rounded-xl print:rounded-none border overflow-hidden transition-colors print:break-inside-avoid print:bg-transparent',
                    isLida
                      ? 'bg-surface-container-low/50 border-outline-variant/10 opacity-90'
                      : 'bg-surface-container-low border-outline-variant/20 border-l-2 border-l-secondary/75'
                  )}
                >
                  {/* Cabeçalho e metadados tipográficos */}
                  <div className="px-5 py-4 space-y-2.5">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-surface-container-high text-on-surface border border-outline-variant/20">
                        {item.tribunal}
                      </span>

                      {item.numeroProcessoMascara && item.numeroProcessoMascara !== 'Não informado' && (
                        <button
                          type="button"
                          onClick={() => copyProcessNumber(item)}
                          title="Copiar número do processo"
                          className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-on-surface hover:text-secondary transition-colors"
                        >
                          {item.numeroProcessoMascara}
                          {copiedProcessId === item.id ? (
                            <CheckCheck className="w-3 h-3 text-secondary" />
                          ) : (
                            <Copy className="w-3 h-3 text-outline opacity-60" />
                          )}
                        </button>
                      )}

                      {(item.tipoComunicacao || item.classeProcessual) && (
                        <span className="text-xs text-outline">
                          {[item.tipoComunicacao, item.classeProcessual].filter(Boolean).join(' · ')}
                        </span>
                      )}

                      <div className="ml-auto flex items-center gap-2.5 text-xs text-outline shrink-0">
                        {isToday && (
                          <span className="text-[11px] font-semibold text-secondary">Hoje</span>
                        )}
                        {isLida && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-outline">
                            <CheckCircle2 className="w-3 h-3" /> Lida
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 font-medium text-on-surface-variant">
                          <Calendar className="w-3 h-3 text-outline" />
                          {item.dataFormatada}
                        </span>
                      </div>
                    </div>

                    {/* Órgão */}
                    <p className="text-xs text-on-surface-variant flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-outline shrink-0" />
                      <span className="truncate">{item.orgao}</span>
                    </p>

                    {/* Partes em tipografia neutra */}
                    {item.partes.length > 0 && (
                      <div className="text-xs text-on-surface-variant flex flex-wrap gap-x-4 gap-y-1">
                        {item.partesAtivo.length > 0 && (
                          <span>
                            <span className="text-outline font-medium">Polo Ativo: </span>
                            <span className="text-on-surface font-medium">
                              {item.partesAtivo
                                .slice(0, 2)
                                .map((p) => p.nome)
                                .join(', ')}
                              {item.partesAtivo.length > 2 && ` (+${item.partesAtivo.length - 2})`}
                            </span>
                          </span>
                        )}
                        {item.partesPassivo.length > 0 && (
                          <span>
                            <span className="text-outline font-medium">Polo Passivo: </span>
                            <span className="text-on-surface font-medium">
                              {item.partesPassivo
                                .slice(0, 2)
                                .map((p) => p.nome)
                                .join(', ')}
                              {item.partesPassivo.length > 2 && ` (+${item.partesPassivo.length - 2})`}
                            </span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Advogados */}
                    {item.advogados.length > 0 && (
                      <p className="text-[11px] text-outline flex items-center gap-1.5 flex-wrap">
                        <Scale className="w-3 h-3 shrink-0" />
                        <span>
                          {item.advogados
                            .map((adv) => `${adv.nome}${adv.oab ? ` (OAB ${adv.oab})` : ''}`)
                            .join(' · ')}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Corpo do teor */}
                  <div className="px-5 py-3.5 border-t border-outline-variant/10 bg-surface-container-lowest/60">
                    <p
                      className={cn(
                        'text-[13px] text-on-surface-variant leading-relaxed whitespace-pre-wrap print:text-black',
                        !isExpanded && 'line-clamp-3 print:line-clamp-none'
                      )}
                    >
                      {item.texto}
                    </p>
                  </div>

                  {/* Barra de ações discreta */}
                  <div className="flex flex-wrap items-center gap-2 px-5 py-2.5 border-t border-outline-variant/10 bg-surface-container-low print:hidden">
                    <button
                      type="button"
                      onClick={() => setDetalhesItem(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-secondary/35 text-secondary hover:bg-secondary/10 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Detalhes
                    </button>

                    <button
                      type="button"
                      onClick={() => openTaskModal(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-outline-variant/20 bg-surface-container-high/50 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Criar tarefa
                    </button>

                    <button
                      type="button"
                      onClick={() => copyResumo(item)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                        copiedId === item.id
                          ? 'bg-surface-container-high text-on-surface border-secondary/40'
                          : 'border-outline-variant/20 bg-surface-container-high/50 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                      )}
                    >
                      {copiedId === item.id ? (
                        <>
                          <CheckCheck className="w-3.5 h-3.5 text-secondary" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copiar resumo
                        </>
                      )}
                    </button>

                    {!isLida && (
                      <button
                        type="button"
                        onClick={() => markAsRead(item.id)}
                        disabled={markingId === item.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-outline-variant/20 bg-surface-container-high/50 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50"
                      >
                        {markingId === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Confirmar leitura
                      </button>
                    )}

                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-outline-variant/20 bg-surface-container-high/50 text-outline hover:text-on-surface transition-colors"
                        title="Abrir no sistema de origem"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        DJEN
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleExpand(item.id)}
                      className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60 transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" /> Recolher
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" /> Ler íntegra
                        </>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}

            {canLoadMore && (
              <div className="pt-3 flex justify-center print:hidden">
                <button
                  type="button"
                  onClick={() => performSearch(advConfig.nome, advConfig.oab, true, page + 1)}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-outline-variant/20 bg-surface-container-low hover:bg-surface-container-high text-xs font-medium text-on-surface transition-colors disabled:opacity-50"
                >
                  {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {loadingMore ? 'Carregando...' : 'Carregar mais publicações'}
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Modal de criação de tarefa ────────────────────── */}
      {isTaskModalOpen && (
        <NewTaskModal
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false);
            setSelectedIntimacao(null);
          }}
          onSuccess={() => {
            setIsTaskModalOpen(false);
            setSelectedIntimacao(null);
          }}
          initialTaskType="Análise de Processo"
          initialDescription={
            selectedIntimacao
              ? `[INTIMAÇÃO - ${selectedIntimacao.tribunal}]\nProcesso: ${selectedIntimacao.numeroProcessoMascara}\n\n${selectedIntimacao.texto}`
              : ''
          }
        />
      )}

      {/* ── Modal de detalhes completos ───────────────────── */}
      {detalhesItem && (
        <DetalhesModal
          item={detalhesItem}
          onClose={() => setDetalhesItem(null)}
          onCreateTask={openTaskModal}
        />
      )}
    </div>
  );
}
