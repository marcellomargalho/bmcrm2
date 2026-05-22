import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Loader2, AlertCircle, Bookmark, Database, Search,
  RefreshCw, FileSearch, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PublicacaoDJEN } from '@/types/djen';
import type { DjenSearchParams } from '@/types/djen';
import { consultarDJEN } from '@/services/djenApi';
import { DjenSearchForm } from '@/components/DjenSearchForm';
import { DjenResultCard } from '@/components/DjenResultCard';
import { DjenDetailsModal } from '@/components/DjenDetailsModal';

export function ConsultaDJEN() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicacoes, setPublicacoes] = useState<PublicacaoDJEN[]>([]);
  const [total, setTotal] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastParams, setLastParams] = useState<DjenSearchParams | null>(null);
  const [selectedPub, setSelectedPub] = useState<PublicacaoDJEN | null>(null);
  const [localFilter, setLocalFilter] = useState('');

  const handleSearch = useCallback(async (params: DjenSearchParams) => {
    setLoading(true);
    setError(null);
    setHasSearched(true);
    setLastParams(params);
    setLocalFilter('');

    const result = await consultarDJEN(params);

    if ('tipo' in result) {
      // É um erro
      setError(result.mensagem);
      setPublicacoes([]);
      setTotal(0);
    } else {
      setPublicacoes(result.publicacoes);
      setTotal(result.total);
    }

    setLoading(false);
  }, []);

  const handleRefresh = () => {
    if (lastParams) handleSearch(lastParams);
  };

  // Filtro local por nome da parte ou número do processo
  const publicacoesFiltradas = localFilter.trim()
    ? publicacoes.filter(pub => {
        const q = localFilter.toLowerCase();
        return (
          pub.numeroProcesso?.toLowerCase().includes(q) ||
          pub.numeroProcessoMascara?.toLowerCase().includes(q) ||
          pub.partes.some(p => p.nome.toLowerCase().includes(q)) ||
          pub.orgaoJulgador?.toLowerCase().includes(q) ||
          pub.tribunal?.toLowerCase().includes(q)
        );
      })
    : publicacoes;

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <section>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface mb-1">
              Consulta DJEN
            </h2>
            <p className="text-on-surface-variant text-sm">
              Diário de Justiça Eletrônico Nacional — Resolução CNJ nº 455/2022.{' '}
              <span className="text-secondary font-medium">API pública sem autenticação.</span>
            </p>
          </div>
          {hasSearched && !loading && publicacoes.length > 0 && (
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-surface-container-high text-on-surface text-xs font-bold uppercase tracking-widest hover:bg-surface-container-highest rounded-xl transition-all"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              Atualizar
            </button>
          )}
        </div>
      </section>

      {/* Formulário de busca */}
      <DjenSearchForm onSearch={handleSearch} loading={loading} />

      {/* Loading */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-24 flex flex-col items-center justify-center gap-4"
        >
          <div className="relative">
            <Loader2 className="w-12 h-12 animate-spin text-secondary" />
            <div className="absolute inset-0 animate-ping rounded-full bg-secondary/20" />
          </div>
          <p className="text-base font-bold text-on-surface animate-pulse">
            Consultando Diário de Justiça Eletrônico Nacional...
          </p>
          <p className="text-xs text-outline">Aguarde, buscando publicações na API pública do DJEN</p>
        </motion.div>
      )}

      {/* Erro */}
      {!loading && error && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-error/5 p-6 rounded-2xl border border-error/15 flex items-start gap-4"
        >
          <div className="w-10 h-10 bg-error/10 rounded-xl flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-error" />
          </div>
          <div>
            <p className="text-sm font-bold text-on-surface mb-1">Não foi possível realizar a consulta</p>
            <p className="text-xs text-on-surface-variant">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Stats / Métricas */}
      {hasSearched && !loading && !error && publicacoes.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/5 flex items-center gap-5">
            <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center shrink-0">
              <Database className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-[10px] font-black text-outline uppercase tracking-widest">Total Encontrado</p>
              <p className="text-3xl font-black text-on-surface leading-none mt-1">
                {total > 1000 ? `${Math.floor(total / 1000)}k+` : total}
              </p>
              <p className="text-[10px] text-on-surface-variant mt-0.5">publicações no DJEN</p>
            </div>
          </div>

          <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/5 flex items-center gap-5">
            <div className="w-12 h-12 bg-surface-container-high rounded-2xl flex items-center justify-center shrink-0">
              <Bookmark className="w-6 h-6 text-outline" />
            </div>
            <div>
              <p className="text-[10px] font-black text-outline uppercase tracking-widest">Exibindo</p>
              <p className="text-3xl font-black text-on-surface leading-none mt-1">
                {publicacoesFiltradas.length}
              </p>
              <p className="text-[10px] text-on-surface-variant mt-0.5">resultados nesta página</p>
            </div>
          </div>

          <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/5 flex items-center gap-5">
            <div className="w-12 h-12 bg-surface-container-high rounded-2xl flex items-center justify-center shrink-0">
              <FileSearch className="w-6 h-6 text-outline" />
            </div>
            <div>
              <p className="text-[10px] font-black text-outline uppercase tracking-widest">Hoje</p>
              <p className="text-3xl font-black text-on-surface leading-none mt-1">
                {publicacoes.filter(p =>
                  p.dataDisponibilizacao?.startsWith(new Date().toISOString().slice(0, 10))
                ).length}
              </p>
              <p className="text-[10px] text-on-surface-variant mt-0.5">disponibilizadas hoje</p>
            </div>
          </div>
        </motion.section>
      )}

      {/* Filtro local rápido */}
      {!loading && !error && publicacoes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline pointer-events-none" />
            <input
              id="djen-filtro-local"
              type="text"
              value={localFilter}
              onChange={e => setLocalFilter(e.target.value)}
              placeholder="Filtrar resultados por nome, processo ou órgão..."
              className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl pl-11 pr-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-secondary/20 outline-none placeholder:text-outline/40"
            />
          </div>
          {localFilter && (
            <button
              onClick={() => setLocalFilter('')}
              className="px-4 py-3 text-xs font-bold text-outline hover:text-on-surface transition-colors"
            >
              Limpar
            </button>
          )}
        </motion.div>
      )}

      {/* Nenhum resultado */}
      {hasSearched && !loading && !error && publicacoes.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-24 bg-surface-container-low/30 rounded-3xl border border-dashed border-outline-variant/20"
        >
          <div className="w-16 h-16 bg-surface-container-high rounded-full flex items-center justify-center mx-auto mb-5 opacity-50">
            <Bookmark className="w-8 h-8 text-outline" />
          </div>
          <p className="text-sm font-bold text-outline uppercase tracking-widest">
            Nenhuma publicação encontrada
          </p>
          <p className="text-xs text-on-surface-variant mt-2 max-w-xs mx-auto">
            Verifique os filtros informados ou tente outros critérios de busca.
          </p>
        </motion.div>
      )}

      {/* Filtro local sem resultado */}
      {!loading && !error && publicacoes.length > 0 && publicacoesFiltradas.length === 0 && (
        <div className="text-center py-12 bg-surface-container-low/30 rounded-3xl border border-dashed border-outline-variant/20">
          <p className="text-sm font-bold text-outline uppercase tracking-widest">
            Nenhum resultado para o filtro "{localFilter}"
          </p>
        </div>
      )}

      {/* Estado inicial */}
      {!hasSearched && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center py-20 bg-surface-container-low/20 rounded-3xl border border-dashed border-outline-variant/10"
        >
          <div className="w-20 h-20 bg-secondary/5 rounded-full flex items-center justify-center mx-auto mb-5">
            <FileSearch className="w-10 h-10 text-secondary/40" />
          </div>
          <p className="text-sm font-bold text-on-surface-variant">
            Use os filtros acima para consultar publicações
          </p>
          <p className="text-xs text-outline mt-2 max-w-sm mx-auto">
            Pesquise por nome da parte, número do processo, OAB do advogado, tribunal ou período.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-secondary/5 border border-secondary/15 rounded-full">
            <Info className="w-3.5 h-3.5 text-secondary" />
            <span className="text-xs text-secondary font-bold">API pública — sem necessidade de login</span>
          </div>
        </motion.div>
      )}

      {/* Lista de resultados */}
      {!loading && !error && publicacoesFiltradas.length > 0 && (
        <section className="grid grid-cols-1 gap-5">
          {publicacoesFiltradas.map((pub, idx) => (
            <DjenResultCard
              key={String(pub.id)}
              publicacao={pub}
              index={idx}
              onVerDetalhes={setSelectedPub}
            />
          ))}
        </section>
      )}

      {/* Modal de detalhes */}
      <AnimatePresence>
        {selectedPub && (
          <DjenDetailsModal
            publicacao={selectedPub}
            onClose={() => setSelectedPub(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
