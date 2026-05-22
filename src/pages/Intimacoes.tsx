import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ExternalLink, Calendar, Plus, Loader2, AlertCircle, Bookmark,
  RefreshCw, Printer, Bell, ChevronDown, ChevronUp, CheckCircle2,
  Copy, CheckCheck, Users, Scale, Gavel, Building2, Tag, FileText,
  Link2, User, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  fetchIntimacoesFromDjen,
  normalizarIntimacao,
  gerarResumoIntimacao,
  type DjenIntimacao,
  type IntimacaoNormalizada,
  type ParteProceso,
  type AdvogadoProcesso,
} from '@/lib/djen';
import { NewTaskModal } from '@/components/NewTaskModal';
import { supabase } from '@/lib/supabase';

// ─── Cores por tribunal ───────────────────────────────────────
const TRIBUNAL_COLORS: Record<string, string> = {
  STF:   'bg-rose-500/15 text-rose-400 border-rose-500/20',
  STJ:   'bg-red-500/15 text-red-400 border-red-500/20',
  TST:   'bg-orange-500/15 text-orange-400 border-orange-500/20',
  TSE:   'bg-amber-500/15 text-amber-400 border-amber-500/20',
  TRF1:  'bg-blue-500/15 text-blue-400 border-blue-500/20',
  TRF2:  'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  TRF3:  'bg-violet-500/15 text-violet-400 border-violet-500/20',
  TRF4:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  TRF5:  'bg-teal-500/15 text-teal-400 border-teal-500/20',
  TRF6:  'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  CJF:   'bg-sky-500/15 text-sky-400 border-sky-500/20',
  SEEU:  'bg-purple-500/15 text-purple-400 border-purple-500/20',
};

function getTribunalColor(sigla: string): string {
  const key = Object.keys(TRIBUNAL_COLORS).find(k => sigla?.toUpperCase().startsWith(k));
  return key ? TRIBUNAL_COLORS[key] : 'bg-secondary/10 text-secondary border-secondary/20';
}

// ─── Modal de detalhes ────────────────────────────────────────
function DetalhesModal({
  item,
  onClose,
}: {
  item: IntimacaoNormalizada;
  onClose: () => void;
}) {
  const [copiedTexto,  setCopiedTexto]  = React.useState(false);
  const [copiedResumo, setCopiedResumo] = React.useState(false);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const copy = async (text: string, setter: (v: boolean) => void) => {
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
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-3xl max-h-[90vh] bg-surface rounded-3xl border border-outline-variant/10 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header do modal */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-outline-variant/10 bg-surface-container-low shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center">
              <Bookmark className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="text-sm font-black text-on-surface">Detalhes da Publicação</p>
              <p className="text-[10px] text-outline font-bold uppercase tracking-widest">
                DJEN — Diário de Justiça Eletrônico Nacional
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-outline hover:text-on-surface transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo do modal */}
        <div className="overflow-y-auto flex-1 px-7 py-6 space-y-6">

          {/* Identificação */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

          <div className="border-t border-outline-variant/5" />

          {/* Partes */}
          <div>
            <SectionLabel icon={Users}>Partes do Processo</SectionLabel>
            {item.partes.length === 0 ? (
              <p className="text-sm text-on-surface-variant">Não informado</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {item.partesAtivo.map((p, i) => (
                  <ParteRow key={i} parte={p} polo="ativo" />
                ))}
                {item.partesPassivo.map((p, i) => (
                  <ParteRow key={i} parte={p} polo="passivo" />
                ))}
                {item.partes
                  .filter(p => p.polo !== 'A' && p.polo !== 'P')
                  .map((p, i) => (
                    <div key={i} className="flex items-center gap-2 bg-surface-container-high border border-outline-variant/10 rounded-xl px-4 py-3">
                      <User className="w-4 h-4 text-outline shrink-0" />
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
                  <div key={i} className="flex items-center gap-3 bg-surface-container-high rounded-xl px-4 py-3 border border-outline-variant/5">
                    <Scale className="w-4 h-4 text-secondary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-on-surface truncate">{adv.nome}</p>
                      {adv.oab && (
                        <p className="text-xs text-outline">OAB {adv.oab}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-outline-variant/5" />

          {/* Texto integral */}
          <div>
            <SectionLabel icon={FileText}>Texto Integral da Publicação</SectionLabel>
            <div className="bg-surface-container-low rounded-2xl border border-outline-variant/5 p-5">
              <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap break-words">
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
                className="inline-flex items-center gap-2 text-sm text-secondary hover:underline break-all"
              >
                <Link2 className="w-3.5 h-3.5 shrink-0" />
                {item.link}
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-7 py-5 border-t border-outline-variant/10 bg-surface-container-low shrink-0 flex items-center gap-3 flex-wrap">
          <CopyButton
            label="Copiar Publicação"
            copied={copiedTexto}
            onClick={() => copy(item.texto, setCopiedTexto)}
            primary
          />
          <CopyButton
            label="Copiar Resumo"
            copied={copiedResumo}
            onClick={() => copy(gerarResumoIntimacao(item), setCopiedResumo)}
          />
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-surface-container-highest text-on-surface hover:bg-outline/10 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              Acessar no DJEN
            </a>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Helpers visuais ──────────────────────────────────────────
function InfoRow({
  label, icon: Icon, mono = false, children, className,
}: {
  label: string; icon?: React.ElementType; mono?: boolean;
  children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="text-[10px] font-black text-outline uppercase tracking-widest flex items-center gap-1">
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
    <p className="text-[10px] font-black text-outline uppercase tracking-widest flex items-center gap-1 mb-3">
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </p>
  );
}

function ParteRow({ parte, polo }: { parte: ParteProceso; polo: 'ativo' | 'passivo' }) {
  return (
    <div className={cn(
      'flex items-center gap-2 rounded-xl px-4 py-3 border',
      polo === 'ativo'
        ? 'bg-emerald-500/5 border-emerald-500/15'
        : 'bg-red-500/5 border-red-500/15'
    )}>
      <span className={cn(
        'text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded shrink-0',
        polo === 'ativo' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
      )}>
        {polo === 'ativo' ? 'Polo Ativo' : 'Polo Passivo'}
      </span>
      <span className="text-sm font-semibold text-on-surface truncate">{parte.nome}</span>
    </div>
  );
}

function CopyButton({
  label, copied, onClick, primary = false,
}: {
  label: string; copied: boolean; onClick: () => void; primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95',
        copied
          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
          : primary
            ? 'bg-secondary text-on-secondary hover:opacity-90'
            : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
      )}
    >
      {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? 'Copiado!' : label}
    </button>
  );
}

// ─── Componente principal ─────────────────────────────────────
export function Intimacoes() {
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // Dados brutos e normalizados
  const [intimacoesRaw,  setIntimacoesRaw]  = useState<DjenIntimacao[]>([]);
  const [intimacoes,     setIntimacoes]     = useState<IntimacaoNormalizada[]>([]);
  const [totalCount,     setTotalCount]     = useState(0);

  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [detalhesItem,  setDetalhesItem]  = useState<IntimacaoNormalizada | null>(null);

  const [advConfig,    setAdvConfig]    = useState({ nome: '', oab: '' });
  const [configLoaded, setConfigLoaded] = useState(false);

  const [lidasIds,   setLidasIds]   = useState<Set<number>>(new Set());
  const [markingId,  setMarkingId]  = useState<number | null>(null);

  const [isTaskModalOpen,   setIsTaskModalOpen]   = useState(false);
  const [selectedIntimacao, setSelectedIntimacao] = useState<IntimacaoNormalizada | null>(null);

  // Copiar resumo inline no card
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const performSearch = useCallback(async (nome: string, oab: string, silent = false) => {
    if (!silent) setLoading(true);
    else         setRefreshing(true);
    setError(null);

    const result = await fetchIntimacoesFromDjen({ nomeAdvogado: nome, numeroOab: oab });

    if (!result) {
      setError('Não foi possível conectar à base do DJEN no momento. Tente novamente mais tarde.');
      setIntimacoesRaw([]);
      setIntimacoes([]);
      setTotalCount(0);
    } else if (result.status === 'empty') {
      setError(result.message);
      setIntimacoesRaw([]);
      setIntimacoes([]);
      setTotalCount(0);
    } else {
      const raw = result.items || [];
      setIntimacoesRaw(raw);
      // Normaliza todos os itens com o tratamento completo de dados
      setIntimacoes(raw.map(normalizarIntimacao));
      setTotalCount(result.count || 0);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  // Carrega configuração e intimações
  useEffect(() => {
    async function loadConfig() {
      const { data } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['djen_nome_padrao', 'djen_oab_padrao']);

      const nome = data?.find(s => s.key === 'djen_nome_padrao')?.value || '';
      const oab  = data?.find(s => s.key === 'djen_oab_padrao')?.value || '';
      setAdvConfig({ nome, oab });
      setConfigLoaded(true);

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
      await supabase.from('intimacoes_lidas').upsert(
        { user_id: user.id, intimacao_id: intimacaoId, lida_em: new Date().toISOString() },
        { onConflict: 'user_id,intimacao_id' }
      );
      setLidasIds(prev => new Set([...prev, intimacaoId]));
    }
    setMarkingId(null);
  };

  const toggleExpand = (id: number) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copyResumo = async (item: IntimacaoNormalizada) => {
    const resumo = gerarResumoIntimacao(item);
    try { await navigator.clipboard.writeText(resumo); }
    catch {
      const el = document.createElement('textarea');
      el.value = resumo;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const today      = new Date().toISOString().slice(0, 10);
  const todayItems = intimacoes.filter(i => i.dataDisponibilizacao?.startsWith(today));
  const todayCount = todayItems.filter(i => !lidasIds.has(i.id)).length;

  return (
    <div className="max-w-7xl mx-auto space-y-10 print:space-y-6">

      {/* ── Header ───────────────────────────────────────── */}
      <section className="print:text-center print:border-b print:pb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface mb-1">
              Intimações DJEN
            </h2>
            <p className="text-on-surface-variant text-sm">
              Publicações do Diário de Justiça Eletrônico Nacional.
              {advConfig.nome && (
                <span className="ml-2 font-bold text-secondary">
                  {advConfig.nome}{advConfig.oab && ` · OAB ${advConfig.oab}`}
                </span>
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
        <div className="hidden print:block mt-3 text-sm text-outline">
          Relatório gerado em: {new Date().toLocaleString()}
        </div>
      </section>

      {/* ── Métricas ─────────────────────────────────────── */}
      {!loading && intimacoes.length > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
          {/* Total */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
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

          {/* Hoje */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className={cn(
              'p-6 rounded-3xl border flex items-center gap-5',
              todayCount > 0 ? 'bg-secondary/5 border-secondary/20' : 'bg-surface-container-low border-outline-variant/5'
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
              <p className="text-[10px] text-on-surface-variant mt-0.5">
                {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
              </p>
            </div>
          </motion.div>

          {/* Exibindo */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
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

      {/* ── Estados de loading / erro / vazio ────────────── */}
      <section>
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-secondary" />
            <p className="text-base font-bold text-on-surface animate-pulse">
              Consultando Diários Oficiais...
            </p>
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

          /* ── Lista de cards ──────────────────────────────── */
          <div className="grid grid-cols-1 gap-5 print:gap-3">
            {intimacoes.map((item, idx) => {
              const isExpanded     = expandedItems.has(item.id);
              const isLida         = lidasIds.has(item.id);
              const isNewAndUnread = item.dataDisponibilizacao?.startsWith(today) && !isLida;
              const tribunalColor  = getTribunalColor(item.tribunal);

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className={cn(
                    'rounded-3xl print:rounded-none border overflow-hidden transition-all shadow-[0_4px_20px_rgb(0,0,0,0.04)] print:shadow-none print:break-inside-avoid print:bg-transparent print:border-b',
                    isNewAndUnread
                      ? 'bg-secondary/5 border-secondary/30 ring-1 ring-secondary/10'
                      : 'bg-surface-container-lowest border-outline-variant/10 hover:border-secondary/20'
                  )}
                >
                  {/* ── Cabeçalho do card ─────────────────── */}
                  <div className="p-5 flex flex-col gap-3">

                    {/* Linha 1: badges + processo + data */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Tribunal */}
                      <span className={cn(
                        'text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border',
                        tribunalColor
                      )}>
                        {item.tribunal}
                      </span>

                      {/* Tipo de comunicação */}
                      {item.tipoComunicacao && (
                        <span className="text-[10px] uppercase font-bold tracking-widest bg-surface-container-high px-2.5 py-1 rounded-lg text-on-surface-variant border border-outline-variant/10">
                          {item.tipoComunicacao}
                        </span>
                      )}

                      {/* Classe processual */}
                      {item.classeProcessual && (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest bg-secondary/10 text-secondary px-2.5 py-1 rounded-lg border border-secondary/15">
                          <Tag className="w-2.5 h-2.5" />
                          {item.classeProcessual}
                        </span>
                      )}

                      {/* Número do processo */}
                      {item.numeroProcessoMascara && item.numeroProcessoMascara !== 'Não informado' && (
                        <span className="text-[10px] font-mono font-bold text-secondary border border-outline-variant/20 px-2 py-1 rounded-lg">
                          {item.numeroProcessoMascara}
                        </span>
                      )}

                      {/* Data */}
                      <span className="ml-auto text-[10px] text-outline font-bold uppercase tracking-widest flex items-center gap-1 shrink-0">
                        <Calendar className="w-3 h-3" />
                        {item.dataFormatada}
                        {item.dataDisponibilizacao?.startsWith(today) && (
                          <span className="ml-1 bg-secondary text-on-secondary text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">
                            Hoje
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Linha 2: Órgão */}
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <Building2 className="w-3.5 h-3.5 text-outline shrink-0" />
                      <span className="truncate">{item.orgao}</span>
                    </div>

                    {/* Linha 3: Partes do processo */}
                    {item.partes.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {item.partesAtivo.length > 0 && (
                          <div className="flex items-start gap-1.5">
                            <span className="text-[9px] font-black text-outline uppercase tracking-widest mt-0.5 shrink-0">Autor:</span>
                            <div className="flex flex-wrap gap-1">
                              {item.partesAtivo.slice(0, 2).map((p, i) => (
                                <span key={i} className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 px-2 py-0.5 rounded-md">
                                  {p.nome}
                                </span>
                              ))}
                              {item.partesAtivo.length > 2 && (
                                <span className="text-[10px] text-outline">+{item.partesAtivo.length - 2}</span>
                              )}
                            </div>
                          </div>
                        )}
                        {item.partesPassivo.length > 0 && (
                          <div className="flex items-start gap-1.5">
                            <span className="text-[9px] font-black text-outline uppercase tracking-widest mt-0.5 shrink-0">Réu:</span>
                            <div className="flex flex-wrap gap-1">
                              {item.partesPassivo.slice(0, 2).map((p, i) => (
                                <span key={i} className="text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/15 px-2 py-0.5 rounded-md">
                                  {p.nome}
                                </span>
                              ))}
                              {item.partesPassivo.length > 2 && (
                                <span className="text-[10px] text-outline">+{item.partesPassivo.length - 2}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Linha 4: Advogados vinculados */}
                    {item.advogados.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Scale className="w-3.5 h-3.5 text-outline shrink-0" />
                        {item.advogados.map((adv, i) => (
                          <span key={i} className="text-[10px] text-on-surface-variant">
                            {adv.nome}{adv.oab ? ` (OAB ${adv.oab})` : ''}{i < item.advogados.length - 1 ? ' ·' : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── Texto da publicação ───────────────── */}
                  <div className="border-t border-outline-variant/5">
                    <div className="relative px-5 pt-4 pb-2">
                      <p className={cn(
                        'text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap print:text-black transition-all',
                        !isExpanded && 'line-clamp-3 print:line-clamp-none'
                      )}>
                        {item.texto}
                      </p>
                      {!isExpanded && (
                        <div className="absolute bottom-2 left-0 right-0 h-8 bg-gradient-to-t from-surface-container-lowest to-transparent pointer-events-none print:hidden" />
                      )}
                    </div>

                    {/* ── Barra de ações ─────────────────── */}
                    <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-t border-outline-variant/5 bg-surface-container-low/40 print:hidden">

                      {/* Confirmar leitura (só para publicações de hoje) */}
                      {item.dataDisponibilizacao?.startsWith(today) && (
                        isLida ? (
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

                      {/* Ver detalhes completos */}
                      <button
                        onClick={() => setDetalhesItem(item)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-secondary text-on-secondary text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all active:scale-95"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        Ver Detalhes
                      </button>

                      {/* Criar tarefa */}
                      <button
                        onClick={() => { setSelectedIntimacao(item); setIsTaskModalOpen(true); }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-surface-container-high text-on-surface-variant text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-surface-container-highest transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tarefa
                      </button>

                      {/* Copiar resumo */}
                      <button
                        onClick={() => copyResumo(item)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95',
                          copiedId === item.id
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                        )}
                      >
                        {copiedId === item.id
                          ? <><CheckCheck className="w-3.5 h-3.5" /> Copiado!</>
                          : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
                      </button>

                      {/* Link externo */}
                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 bg-surface-container-high text-on-surface-variant text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-surface-container-highest transition-all"
                          title="Abrir no sistema de origem"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}

                      {/* Expandir / recolher texto */}
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="ml-auto flex items-center gap-2 py-2 text-secondary text-[10px] font-black uppercase tracking-widest hover:bg-secondary/5 rounded-xl px-3 transition-all"
                      >
                        {isExpanded
                          ? <><ChevronUp className="w-3.5 h-3.5" /> Recolher</>
                          : <><ChevronDown className="w-3.5 h-3.5" /> Ler Íntegra</>}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Modal de criação de tarefa ────────────────────── */}
      <AnimatePresence>
        {isTaskModalOpen && (
          <NewTaskModal
            isOpen={isTaskModalOpen}
            onClose={() => { setIsTaskModalOpen(false); setSelectedIntimacao(null); }}
            onSuccess={() => { setIsTaskModalOpen(false); setSelectedIntimacao(null); }}
            initialTaskType="Análise de Processo"
            initialDescription={selectedIntimacao
              ? `[INTIMAÇÃO - ${selectedIntimacao.tribunal}]\nProcesso: ${selectedIntimacao.numeroProcessoMascara}\n\n${selectedIntimacao.texto}`
              : ''}
          />
        )}
      </AnimatePresence>

      {/* ── Modal de detalhes completos ───────────────────── */}
      <AnimatePresence>
        {detalhesItem && (
          <DetalhesModal
            item={detalhesItem}
            onClose={() => setDetalhesItem(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
