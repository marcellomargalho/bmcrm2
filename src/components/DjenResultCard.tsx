import React from 'react';
import { motion } from 'motion/react';
import {
  Calendar, Building2, Gavel, ChevronDown, ChevronUp,
  Copy, CheckCheck, Eye, Users, Tag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PublicacaoDJEN } from '@/types/djen';
import { formatDateBR } from '@/utils/formatDate';
import { gerarResumoDJEN } from '@/utils/normalizeDjenResponse';

interface DjenResultCardProps {
  key?: React.Key;
  publicacao: PublicacaoDJEN;
  index: number;
  onVerDetalhes: (pub: PublicacaoDJEN) => void;
}

const TRIBUNAL_COLORS: Record<string, string> = {
  STF: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
  STJ: 'bg-red-500/15 text-red-400 border-red-500/20',
  TST: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  TSE: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  TRF1: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  TRF2: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  TRF3: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  TRF4: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  TRF5: 'bg-teal-500/15 text-teal-400 border-teal-500/20',
  CJF: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
};

function getTribunalColor(sigla?: string): string {
  if (!sigla) return 'bg-secondary/10 text-secondary border-secondary/20';
  const key = Object.keys(TRIBUNAL_COLORS).find(k => sigla.toUpperCase().startsWith(k));
  return key ? TRIBUNAL_COLORS[key] : 'bg-secondary/10 text-secondary border-secondary/20';
}

export function DjenResultCard({ publicacao, index, onVerDetalhes }: DjenResultCardProps) {
  const [expanded, setExpanded] = React.useState(false);
  const [copiedResumo, setCopiedResumo] = React.useState(false);

  const partesAtivo = publicacao.partes.filter(p => p.polo === 'A' || p.polo === 'ATIVO');
  const partesPassivo = publicacao.partes.filter(p => p.polo === 'P' || p.polo === 'PASSIVO');
  const todasPartes = publicacao.partes;

  const today = new Date().toISOString().slice(0, 10);
  const isToday = publicacao.dataDisponibilizacao?.startsWith(today);

  const copyResumo = async () => {
    const resumo = gerarResumoDJEN(publicacao);
    try {
      await navigator.clipboard.writeText(resumo);
    } catch {
      const el = document.createElement('textarea');
      el.value = resumo;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopiedResumo(true);
    setTimeout(() => setCopiedResumo(false), 2000);
  };

  const textoLimpo = publicacao.texto || 'Texto não disponível.';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className={cn(
        'rounded-3xl border overflow-hidden transition-all shadow-[0_4px_20px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgb(0,0,0,0.08)]',
        isToday
          ? 'bg-secondary/5 border-secondary/25 ring-1 ring-secondary/10'
          : 'bg-surface-container-lowest border-outline-variant/10 hover:border-secondary/20'
      )}
    >
      {/* Header do card */}
      <div className="p-5 flex flex-col gap-3">
        {/* Linha 1: badges + processo + data */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tribunal */}
          {publicacao.tribunal && (
            <span className={cn(
              'text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border',
              getTribunalColor(publicacao.tribunal)
            )}>
              {publicacao.tribunal}
            </span>
          )}

          {/* Tipo de comunicação */}
          {publicacao.tipoComunicacao && (
            <span className="text-[10px] uppercase font-bold tracking-widest bg-surface-container-high px-2.5 py-1 rounded-lg text-on-surface-variant border border-outline-variant/10">
              {publicacao.tipoComunicacao}
            </span>
          )}

          {/* Classe processual */}
          {publicacao.classeProcessual && (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest bg-secondary/10 text-secondary px-2.5 py-1 rounded-lg border border-secondary/15">
              <Tag className="w-2.5 h-2.5" />
              {publicacao.classeProcessual}
            </span>
          )}

          {/* Número do processo */}
          <span className="font-mono font-bold text-xs text-secondary ml-1">
            {publicacao.numeroProcessoMascara || publicacao.numeroProcesso || 'Sem número'}
          </span>

          {/* Data de disponibilização */}
          <div className="ml-auto flex items-center gap-1 shrink-0">
            <span className="text-[10px] text-outline font-bold uppercase tracking-widest flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDateBR(publicacao.dataDisponibilizacao)}
            </span>
            {isToday && (
              <span className="bg-secondary text-on-secondary text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase ml-1">
                Hoje
              </span>
            )}
          </div>
        </div>

        {/* Linha 2: Órgão julgador */}
        {publicacao.orgaoJulgador && (
          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
            <Building2 className="w-3.5 h-3.5 text-outline shrink-0" />
            <span className="truncate">{publicacao.orgaoJulgador}</span>
          </div>
        )}

        {/* Linha 3: Partes */}
        <div className="flex flex-wrap gap-2">
          {/* Polo Ativo */}
          {partesAtivo.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-[9px] font-black text-outline uppercase tracking-widest mt-0.5 shrink-0">Autor:</span>
              <div className="flex flex-wrap gap-1">
                {partesAtivo.slice(0, 2).map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 px-2 py-0.5 rounded-md">
                    {p.nome}
                  </span>
                ))}
                {partesAtivo.length > 2 && (
                  <span className="text-[10px] text-outline">+{partesAtivo.length - 2}</span>
                )}
              </div>
            </div>
          )}

          {/* Polo Passivo */}
          {partesPassivo.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-[9px] font-black text-outline uppercase tracking-widest mt-0.5 shrink-0">Réu:</span>
              <div className="flex flex-wrap gap-1">
                {partesPassivo.slice(0, 2).map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/15 px-2 py-0.5 rounded-md">
                    {p.nome}
                  </span>
                ))}
                {partesPassivo.length > 2 && (
                  <span className="text-[10px] text-outline">+{partesPassivo.length - 2}</span>
                )}
              </div>
            </div>
          )}

          {/* Partes sem polo definido */}
          {partesAtivo.length === 0 && partesPassivo.length === 0 && todasPartes.length > 0 && (
            <div className="flex items-center gap-2">
              <Users className="w-3 h-3 text-outline shrink-0" />
              <span className="text-[10px] text-on-surface-variant">
                {todasPartes.slice(0, 3).map(p => p.nome).join(' · ')}
                {todasPartes.length > 3 && ` +${todasPartes.length - 3}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Texto resumido (prévia) */}
      <div className="relative px-5 pb-2 border-t border-outline-variant/5 pt-4">
        <p className={cn(
          'text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap transition-all',
          !expanded && 'line-clamp-3'
        )}>
          {textoLimpo}
        </p>
        {!expanded && textoLimpo.length > 200 && (
          <div className="absolute bottom-2 left-0 right-0 h-8 bg-gradient-to-t from-surface-container-lowest to-transparent pointer-events-none" />
        )}
      </div>

      {/* Barra de ações */}
      <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-t border-outline-variant/5 bg-surface-container-low/40">
        {/* Ver detalhes */}
        <button
          id={`djen-ver-detalhes-${publicacao.id}`}
          onClick={() => onVerDetalhes(publicacao)}
          className="flex items-center gap-1.5 px-3 py-2 bg-secondary text-on-secondary text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all active:scale-95"
        >
          <Eye className="w-3.5 h-3.5" />
          Ver Detalhes
        </button>

        {/* Copiar publicação */}
        <button
          id={`djen-copiar-${publicacao.id}`}
          onClick={copyResumo}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95',
            copiedResumo
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
          )}
        >
          {copiedResumo ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copiedResumo ? 'Copiado!' : 'Copiar'}
        </button>

        {/* Expandir texto */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 text-secondary text-[10px] font-black uppercase tracking-widest hover:bg-secondary/5 rounded-xl transition-all active:scale-95"
        >
          {expanded
            ? <><ChevronUp className="w-3.5 h-3.5" /> Recolher</>
            : <><ChevronDown className="w-3.5 h-3.5" /> Ler Íntegra</>}
        </button>
      </div>
    </motion.div>
  );
}
