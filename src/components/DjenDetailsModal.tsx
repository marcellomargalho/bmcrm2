import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Copy, CheckCheck, Calendar, Gavel, Building2, Scale, FileText,
  Users, Link2, AlertCircle, Tag, Bookmark
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PublicacaoDJEN } from '@/types/djen';
import { formatDateBR } from '@/utils/formatDate';

interface DjenDetailsModalProps {
  publicacao: PublicacaoDJEN | null;
  onClose: () => void;
}

function InfoRow({
  label,
  value,
  icon: Icon,
  mono = false,
  className,
}: {
  label: string;
  value?: string | null;
  icon?: React.ElementType;
  mono?: boolean;
  className?: string;
}) {
  const displayValue = value || 'Não informado';
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="text-[10px] font-black text-outline uppercase tracking-widest flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </span>
      <span className={cn('text-sm text-on-surface break-words', mono && 'font-mono text-secondary')}>
        {displayValue}
      </span>
    </div>
  );
}

export function DjenDetailsModal({ publicacao, onClose }: DjenDetailsModalProps) {
  const [copiedTexto, setCopiedTexto] = React.useState(false);
  const [copiedResumo, setCopiedResumo] = React.useState(false);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Bloqueia scroll do body quando modal aberto
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!publicacao) return null;

  const partesAtivo = publicacao.partes.filter(p => p.polo === 'A' || p.polo === 'ATIVO');
  const partesPassivo = publicacao.partes.filter(p => p.polo === 'P' || p.polo === 'PASSIVO');
  const partesOutros = publicacao.partes.filter(
    p => !['A', 'P', 'ATIVO', 'PASSIVO'].includes(p.polo || '')
  );

  const copyToClipboard = async (text: string, setter: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setter(true);
      setTimeout(() => setter(false), 2000);
    }
  };

  const resumo = `Publicação encontrada no DJEN:

Processo: ${publicacao.numeroProcessoMascara || publicacao.numeroProcesso || 'Não informado'}
Partes: ${publicacao.partes.map(p => p.nome).join(', ') || 'Não informado'}
Vara/Órgão: ${publicacao.orgaoJulgador || 'Não informado'}
Tribunal: ${publicacao.tribunal || 'Não informado'}
Data de disponibilização: ${formatDateBR(publicacao.dataDisponibilizacao)}

Teor da publicação:
${publicacao.texto.slice(0, 500)}${publicacao.texto.length > 500 ? '...' : ''}`;

  return (
    <AnimatePresence>
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
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-7 py-5 border-b border-outline-variant/10 bg-surface-container-low shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center">
                <Bookmark className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm font-black text-on-surface">Detalhes da Publicação</p>
                <p className="text-[10px] text-outline font-bold uppercase tracking-widest">DJEN — Diário de Justiça Eletrônico Nacional</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-outline hover:text-on-surface transition-all"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 px-7 py-6 space-y-6">
            {/* Identificação */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <InfoRow
                label="Número do Processo"
                value={publicacao.numeroProcessoMascara || publicacao.numeroProcesso}
                icon={Gavel}
                mono
              />
              <InfoRow
                label="Classe Processual"
                value={publicacao.classeProcessual}
                icon={Tag}
              />
              <InfoRow
                label="Tribunal"
                value={publicacao.tribunal}
                icon={Building2}
              />
              <InfoRow
                label="Vara / Órgão Julgador"
                value={publicacao.orgaoJulgador}
                icon={Building2}
              />
              <InfoRow
                label="Data de Disponibilização"
                value={formatDateBR(publicacao.dataDisponibilizacao)}
                icon={Calendar}
              />
              <InfoRow
                label="Data de Publicação"
                value={formatDateBR(publicacao.dataPublicacao)}
                icon={Calendar}
              />
              <InfoRow
                label="Tipo de Comunicação"
                value={publicacao.tipoComunicacao}
                icon={FileText}
              />
              <InfoRow
                label="Meio de Comunicação"
                value={publicacao.meioComunicacao}
                icon={FileText}
              />
            </div>

            <div className="border-t border-outline-variant/5" />

            {/* Partes */}
            <div>
              <p className="text-[10px] font-black text-outline uppercase tracking-widest flex items-center gap-1 mb-3">
                <Users className="w-3 h-3" />
                Partes do Processo
              </p>
              {publicacao.partes.length === 0 ? (
                <p className="text-sm text-on-surface-variant">Não informado</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {partesAtivo.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/15 rounded-xl px-4 py-3">
                      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded shrink-0">Polo Ativo</span>
                      <span className="text-sm font-semibold text-on-surface truncate">{p.nome}</span>
                    </div>
                  ))}
                  {partesPassivo.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 bg-red-500/5 border border-red-500/15 rounded-xl px-4 py-3">
                      <span className="text-[9px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 px-2 py-0.5 rounded shrink-0">Polo Passivo</span>
                      <span className="text-sm font-semibold text-on-surface truncate">{p.nome}</span>
                    </div>
                  ))}
                  {partesOutros.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 bg-surface-container-high border border-outline-variant/10 rounded-xl px-4 py-3">
                      <span className="text-sm font-semibold text-on-surface truncate">{p.nome}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Advogados */}
            <div>
              <p className="text-[10px] font-black text-outline uppercase tracking-widest flex items-center gap-1 mb-3">
                <Scale className="w-3 h-3" />
                Advogados Vinculados
              </p>
              {publicacao.advogados.length === 0 ? (
                <p className="text-sm text-on-surface-variant">Não informado</p>
              ) : (
                <div className="space-y-2">
                  {publicacao.advogados.map((adv, i) => (
                    <div key={i} className="flex items-center gap-3 bg-surface-container-high rounded-xl px-4 py-3 border border-outline-variant/5">
                      <Scale className="w-4 h-4 text-secondary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-on-surface truncate">{adv.nome}</p>
                        {adv.numeroOab && (
                          <p className="text-xs text-outline">
                            OAB {adv.numeroOab}{adv.ufOab ? `/${adv.ufOab}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-outline-variant/5" />

            {/* Texto da publicação */}
            <div>
              <p className="text-[10px] font-black text-outline uppercase tracking-widest flex items-center gap-1 mb-3">
                <FileText className="w-3 h-3" />
                Texto Integral da Publicação
              </p>
              <div className="bg-surface-container-low rounded-2xl border border-outline-variant/5 p-5">
                <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap break-words">
                  {publicacao.texto || 'Não informado'}
                </p>
              </div>
            </div>

            {/* Link / identificador */}
            {(publicacao.link || publicacao.identificador) && (
              <div>
                <p className="text-[10px] font-black text-outline uppercase tracking-widest flex items-center gap-1 mb-3">
                  <Link2 className="w-3 h-3" />
                  Link da Comunicação
                </p>
                {publicacao.link ? (
                  <a
                    href={publicacao.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-secondary hover:underline break-all"
                  >
                    <Link2 className="w-3.5 h-3.5 shrink-0" />
                    {publicacao.link}
                  </a>
                ) : (
                  <p className="text-sm text-on-surface-variant font-mono">{publicacao.identificador}</p>
                )}
              </div>
            )}
          </div>

          {/* Footer — ações */}
          <div className="px-7 py-5 border-t border-outline-variant/10 bg-surface-container-low shrink-0 flex items-center gap-3 flex-wrap">
            <button
              id="djen-copiar-texto"
              onClick={() => copyToClipboard(publicacao.texto, setCopiedTexto)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all',
                copiedTexto
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  : 'bg-secondary text-on-secondary hover:opacity-90 active:scale-95'
              )}
            >
              {copiedTexto ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedTexto ? 'Copiado!' : 'Copiar Publicação'}
            </button>

            <button
              id="djen-copiar-resumo"
              onClick={() => copyToClipboard(resumo, setCopiedResumo)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all',
                copiedResumo
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest active:scale-95'
              )}
            >
              {copiedResumo ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedResumo ? 'Copiado!' : 'Copiar Resumo'}
            </button>

            {publicacao.link && (
              <a
                href={publicacao.link}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-surface-container-highest text-on-surface hover:bg-outline/10 transition-all"
              >
                <Link2 className="w-4 h-4" />
                Acessar no DJEN
              </a>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
