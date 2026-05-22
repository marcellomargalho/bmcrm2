import React from 'react';
import { Search, Loader2, Calendar, Users, Gavel, Scale, Building2, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DjenSearchParams } from '@/types/djen';

interface DjenSearchFormProps {
  onSearch: (params: DjenSearchParams) => void;
  loading: boolean;
}

const TRIBUNAIS = [
  { sigla: '', label: 'Todos os tribunais' },
  { sigla: 'STF', label: 'STF — Supremo Tribunal Federal' },
  { sigla: 'STJ', label: 'STJ — Superior Tribunal de Justiça' },
  { sigla: 'TST', label: 'TST — Tribunal Superior do Trabalho' },
  { sigla: 'TSE', label: 'TSE — Tribunal Superior Eleitoral' },
  { sigla: 'STM', label: 'STM — Superior Tribunal Militar' },
  { sigla: 'TRF1', label: 'TRF1 — Tribunal Regional Federal 1ª Região' },
  { sigla: 'TRF2', label: 'TRF2 — Tribunal Regional Federal 2ª Região' },
  { sigla: 'TRF3', label: 'TRF3 — Tribunal Regional Federal 3ª Região' },
  { sigla: 'TRF4', label: 'TRF4 — Tribunal Regional Federal 4ª Região' },
  { sigla: 'TRF5', label: 'TRF5 — Tribunal Regional Federal 5ª Região' },
  { sigla: 'TRF6', label: 'TRF6 — Tribunal Regional Federal 6ª Região' },
  { sigla: 'TJPA', label: 'TJPA — Tribunal de Justiça do Pará' },
  { sigla: 'TJSP', label: 'TJSP — Tribunal de Justiça de São Paulo' },
  { sigla: 'TJRJ', label: 'TJRJ — Tribunal de Justiça do Rio de Janeiro' },
  { sigla: 'TJMG', label: 'TJMG — Tribunal de Justiça de Minas Gerais' },
  { sigla: 'TJRS', label: 'TJRS — Tribunal de Justiça do Rio Grande do Sul' },
  { sigla: 'TJPR', label: 'TJPR — Tribunal de Justiça do Paraná' },
  { sigla: 'TJSC', label: 'TJSC — Tribunal de Justiça de Santa Catarina' },
  { sigla: 'TJBA', label: 'TJBA — Tribunal de Justiça da Bahia' },
  { sigla: 'TJCE', label: 'TJCE — Tribunal de Justiça do Ceará' },
  { sigla: 'TJPE', label: 'TJPE — Tribunal de Justiça de Pernambuco' },
  { sigla: 'TJAM', label: 'TJAM — Tribunal de Justiça do Amazonas' },
  { sigla: 'TJGO', label: 'TJGO — Tribunal de Justiça de Goiás' },
  { sigla: 'TJDF', label: 'TJDFT — Tribunal de Justiça do DF e Territórios' },
  { sigla: 'TJMA', label: 'TJMA — Tribunal de Justiça do Maranhão' },
  { sigla: 'TJES', label: 'TJES — Tribunal de Justiça do Espírito Santo' },
  { sigla: 'TJMT', label: 'TJMT — Tribunal de Justiça do Mato Grosso' },
  { sigla: 'TJMS', label: 'TJMS — Tribunal de Justiça do Mato Grosso do Sul' },
  { sigla: 'TJPI', label: 'TJPI — Tribunal de Justiça do Piauí' },
  { sigla: 'TJRN', label: 'TJRN — Tribunal de Justiça do Rio Grande do Norte' },
  { sigla: 'TJPB', label: 'TJPB — Tribunal de Justiça da Paraíba' },
  { sigla: 'TJAL', label: 'TJAL — Tribunal de Justiça de Alagoas' },
  { sigla: 'TJSE', label: 'TJSE — Tribunal de Justiça de Sergipe' },
  { sigla: 'TJRR', label: 'TJRR — Tribunal de Justiça de Roraima' },
  { sigla: 'TJRO', label: 'TJRO — Tribunal de Justiça de Rondônia' },
  { sigla: 'TJAC', label: 'TJAC — Tribunal de Justiça do Acre' },
  { sigla: 'TJTO', label: 'TJTO — Tribunal de Justiça do Tocantins' },
  { sigla: 'TJAP', label: 'TJAP — Tribunal de Justiça do Amapá' },
  { sigla: 'CJF', label: 'CJF — Conselho da Justiça Federal' },
  { sigla: 'SEEU', label: 'SEEU — Sistema de Execução de Penas' },
  { sigla: 'PJeCor', label: 'PJeCor — Corregedoria PJe' },
];

const TAB_OPTIONS = [
  { id: 'nomeParte', label: 'Nome da Parte', icon: Users },
  { id: 'numeroProcesso', label: 'Nº do Processo', icon: Gavel },
  { id: 'nomeAdvogado', label: 'Nome do Advogado', icon: Scale },
  { id: 'numeroOab', label: 'OAB do Advogado', icon: Building2 },
] as const;

type TabId = typeof TAB_OPTIONS[number]['id'];

export function DjenSearchForm({ onSearch, loading }: DjenSearchFormProps) {
  const [activeTab, setActiveTab] = React.useState<TabId>('nomeParte');
  const [nomeParte, setNomeParte] = React.useState('');
  const [numeroProcesso, setNumeroProcesso] = React.useState('');
  const [nomeAdvogado, setNomeAdvogado] = React.useState('');
  const [numeroOab, setNumeroOab] = React.useState('');
  const [tribunal, setTribunal] = React.useState('');
  const [dataInicio, setDataInicio] = React.useState('');
  const [dataFim, setDataFim] = React.useState('');

  const handleSearch = () => {
    onSearch({
      nomeParte: nomeParte.trim() || undefined,
      numeroProcesso: numeroProcesso.trim() || undefined,
      nomeAdvogado: nomeAdvogado.trim() || undefined,
      numeroOab: numeroOab.trim() || undefined,
      siglaTribunal: tribunal || undefined,
      dataDisponibilizacaoInicio: dataInicio || undefined,
      dataDisponibilizacaoFim: dataFim || undefined,
      pagina: 1,
      itensPorPagina: 20,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const clearDates = () => {
    setDataInicio('');
    setDataFim('');
  };

  const inputClass =
    'w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-secondary/20 outline-none placeholder:text-outline/40 transition-all';

  return (
    <section className="bg-surface-container-low rounded-3xl border border-outline-variant/5 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-outline-variant/10 overflow-x-auto">
        {TAB_OPTIONS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); }}
            className={cn(
              'flex-1 min-w-fit flex items-center justify-center gap-2 px-4 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap',
              activeTab === tab.id
                ? 'text-secondary border-secondary bg-secondary/5'
                : 'text-outline border-transparent hover:text-on-surface hover:bg-surface-container-high/30'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-6 space-y-5">
        {/* Campo de busca principal — varia com a tab */}
        <div className="space-y-2">
          {activeTab === 'nomeParte' && (
            <>
              <label className="text-xs font-bold text-outline uppercase tracking-widest">Nome da Parte</label>
              <input
                id="djen-nome-parte"
                type="text"
                value={nomeParte}
                onChange={(e) => setNomeParte(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ex: João da Silva"
                className={inputClass}
                autoFocus
              />
            </>
          )}
          {activeTab === 'numeroProcesso' && (
            <>
              <label className="text-xs font-bold text-outline uppercase tracking-widest">Número do Processo (CNJ)</label>
              <input
                id="djen-numero-processo"
                type="text"
                value={numeroProcesso}
                onChange={(e) => setNumeroProcesso(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ex: 0000001-23.2024.8.14.0001"
                className={cn(inputClass, 'font-mono')}
                autoFocus
              />
            </>
          )}
          {activeTab === 'nomeAdvogado' && (
            <>
              <label className="text-xs font-bold text-outline uppercase tracking-widest">Nome do Advogado</label>
              <input
                id="djen-nome-advogado"
                type="text"
                value={nomeAdvogado}
                onChange={(e) => setNomeAdvogado(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ex: Maria Oliveira"
                className={inputClass}
                autoFocus
              />
            </>
          )}
          {activeTab === 'numeroOab' && (
            <>
              <label className="text-xs font-bold text-outline uppercase tracking-widest">Número da OAB</label>
              <input
                id="djen-numero-oab"
                type="text"
                value={numeroOab}
                onChange={(e) => setNumeroOab(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ex: 12345/PA"
                className={inputClass}
                autoFocus
              />
            </>
          )}
        </div>

        {/* Filtros adicionais: Tribunal + Período */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tribunal */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-outline uppercase tracking-widest">Tribunal</label>
            <div className="relative">
              <select
                id="djen-tribunal"
                value={tribunal}
                onChange={(e) => setTribunal(e.target.value)}
                className={cn(inputClass, 'appearance-none pr-10')}
              >
                {TRIBUNAIS.map((t) => (
                  <option key={t.sigla} value={t.sigla}>{t.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline pointer-events-none" />
            </div>
          </div>

          {/* Data início */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-outline uppercase tracking-widest flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Data Inicial
            </label>
            <input
              id="djen-data-inicio"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Data fim */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-outline uppercase tracking-widest flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Data Final
            </label>
            <div className="relative">
              <input
                id="djen-data-fim"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className={cn(inputClass, 'pr-10')}
              />
              {(dataInicio || dataFim) && (
                <button
                  onClick={clearDates}
                  title="Limpar datas"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-error transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Botão de busca */}
        <button
          id="djen-buscar"
          onClick={handleSearch}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-secondary text-on-secondary font-headline font-bold rounded-xl hover:opacity-90 transition-all active:scale-[0.98] shadow-lg shadow-secondary/10 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Consultando DJEN...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Buscar no DJEN
            </>
          )}
        </button>
      </div>
    </section>
  );
}
