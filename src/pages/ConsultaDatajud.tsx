import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Loader2, AlertCircle, Database, ChevronDown, ChevronUp, Users, Gavel, MapPin, Calendar, Scale, User, Building2, RefreshCw, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { searchDatajud, searchDatajudUnificado, TRIBUNAIS, DatajudProcesso, DatajudFilterType, TribunalOption } from '@/lib/datajud';

const POLO_OPTIONS = [
  { value: '', label: 'Qualquer polo' },
  { value: 'ATIVO', label: 'Autor / Requerente (Polo Ativo)' },
  { value: 'PASSIVO', label: 'Réu / Requerido (Polo Passivo)' },
];

const FILTER_TABS: { id: DatajudFilterType; label: string; icon: React.ElementType }[] = [
  { id: 'numero', label: 'Nº do Processo', icon: Gavel },
  { id: 'nome_parte', label: 'Nome da Parte', icon: Users },
  { id: 'advogado', label: 'Nome Advogado', icon: Scale },
  { id: 'oab_advogado', label: 'OAB Advogado', icon: Scale },
  { id: 'cpf_parte', label: 'CPF da Parte', icon: User },
];

const REGIAO_ORDER = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul', 'Justiça Federal', 'Justiça do Trabalho', 'Superior'];

function groupTribunais() {
  const groups: Record<string, TribunalOption[]> = {};
  TRIBUNAIS.forEach(t => {
    if (!groups[t.regiao]) groups[t.regiao] = [];
    groups[t.regiao].push(t);
  });
  return REGIAO_ORDER.filter(r => groups[r]).map(r => ({ regiao: r, items: groups[r] }));
}

// Chave pública padrão do CNJ (pode ser atualizada em Configurações → API Datajud)
const DATAJUD_DEFAULT_KEY = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';

export function ConsultaDatajud() {
  const [apiKey, setApiKey] = useState(DATAJUD_DEFAULT_KEY);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [filterType, setFilterType] = useState<DatajudFilterType>('numero');
  const [tribunal, setTribunal] = useState('api_publica_tjpa');
  const [numeroProcesso, setNumeroProcesso] = useState('');
  const [nomeParte, setNomeParte] = useState('');
  const [poloParte, setPoloParte] = useState('');
  const [nomeAdvogado, setNomeAdvogado] = useState('');
  const [cpfParte, setCpfParte] = useState('');
  const [oabAdvogado, setOabAdvogado] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultados, setResultados] = useState<DatajudProcesso[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [hasSearched, setHasSearched] = useState(false);
  const [unifiedSearch, setUnifiedSearch] = useState(false);
  const [unifiedStats, setUnifiedStats] = useState<{ consultados: number; comResultado: number } | null>(null);

  useEffect(() => {
    async function loadApiKey() {
      const { data } = await supabase
        .from('system_settings')
        .select('key, value')
        .eq('key', 'datajud_api_key')
        .maybeSingle();
      if (data?.value) setApiKey(data.value);
      setConfigLoaded(true);
    }
    loadApiKey();
  }, []);

  const handleSearch = async () => {
    if (!apiKey.trim()) {
      setError('API Key do Datajud não configurada. Peça ao Administrador configurar em Configurações.');
      return;
    }
    if (filterType === 'numero' && !numeroProcesso.trim()) { setError('Informe o número do processo.'); return; }
    if (filterType === 'nome_parte' && !nomeParte.trim()) { setError('Informe o nome da parte.'); return; }
    if (filterType === 'advogado' && !nomeAdvogado.trim()) { setError('Informe o nome do advogado.'); return; }
    if (filterType === 'cpf_parte' && !cpfParte.trim()) { setError('Informe o CPF da parte.'); return; }
    if (filterType === 'oab_advogado' && !oabAdvogado.trim()) { setError('Informe o número da OAB.'); return; }

    setLoading(true);
    setError(null);
    setHasSearched(true);
    setUnifiedStats(null);

    let result;
    if (unifiedSearch) {
      result = await searchDatajudUnificado({
        apiKey, filterType, numeroProcesso, nomeParte,
        poloParte: poloParte as any, nomeAdvogado, cpfParte, oabAdvogado, size: 20,
      });
    } else {
      result = await searchDatajud({
        apiKey, tribunal, filterType, numeroProcesso, nomeParte,
        poloParte: poloParte as any, nomeAdvogado, cpfParte, oabAdvogado, size: 10,
      });
    }

    if ('error' in result) {
      setError(result.error);
      setResultados([]);
      setTotalResults(0);
    } else {
      setResultados(result.processos);
      setTotalResults(result.total);
      if ('tribunaisConsultados' in result) {
        setUnifiedStats({
          consultados: result.tribunaisConsultados,
          comResultado: result.tribunaisComResultado
        });
      }
    }
    setLoading(false);
  };

  const toggleExpand = (num: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      next.has(num) ? next.delete(num) : next.add(num);
      return next;
    });
  };

  const tribunalGroups = groupTribunais();
  const selectedTribunal = TRIBUNAIS.find(t => t.endpoint === tribunal);

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <section>
        <h2 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface mb-1">Consulta Datajud</h2>
        <p className="text-on-surface-variant text-sm">
          Consulta pública de processos judiciais — Base Nacional do CNJ (Resolução nº 331/2020).
        </p>
      </section>

      {/* Search Card */}
      <section className="bg-surface-container-low rounded-3xl border border-outline-variant/5 overflow-hidden">
        {/* Filter type tabs */}
        <div className="flex border-b border-outline-variant/10">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setFilterType(tab.id); setError(null); }}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2',
                filterType === tab.id
                  ? 'text-secondary border-secondary bg-secondary/5'
                  : 'text-outline border-transparent hover:text-on-surface hover:bg-surface-container-high/30'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-6">
          {/* Unified search toggle */}
          <div className="flex items-center justify-between p-4 bg-surface-container-highest/20 rounded-2xl border border-outline-variant/10">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                unifiedSearch ? "bg-secondary/10 text-secondary" : "bg-surface-container-high text-outline"
              )}>
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface">Busca Unificada</p>
                <p className="text-[10px] text-outline">Consultar múltiplos tribunais (PA, TRF1, TRT8, SP, RJ, STJ) simultaneamente</p>
              </div>
            </div>
            <button
              onClick={() => setUnifiedSearch(!unifiedSearch)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                unifiedSearch ? "bg-secondary" : "bg-outline/20"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  unifiedSearch ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>

          {/* Tribunal selector */}
          <div className={cn("space-y-2 transition-opacity", unifiedSearch && "opacity-40 pointer-events-none")}>
            <label className="text-xs font-bold text-outline uppercase tracking-widest">Tribunal específico</label>
            <div className="relative">
              <select
                disabled={unifiedSearch}
                value={tribunal}
                onChange={e => setTribunal(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-secondary/20 outline-none appearance-none pr-10"
              >
                {tribunalGroups.map(g => (
                  <optgroup key={g.regiao} label={`── ${g.regiao} ──`}>
                    {g.items.map(t => (
                      <option key={t.endpoint} value={t.endpoint}>{t.sigla} — {t.nome}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline pointer-events-none" />
            </div>
            {selectedTribunal && !unifiedSearch && (
              <p className="text-[10px] text-outline flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Região: {selectedTribunal.regiao}
              </p>
            )}
          </div>

          {/* Dynamic filter inputs */}
          {filterType === 'numero' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-outline uppercase tracking-widest">Número do Processo (CNJ)</label>
              <input
                type="text"
                value={numeroProcesso}
                onChange={e => setNumeroProcesso(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="0000001-02.2023.8.14.0001"
                className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl px-4 py-3 text-sm font-mono text-on-surface focus:ring-2 focus:ring-secondary/20 outline-none placeholder:text-outline/40"
              />
            </div>
          )}

          {filterType === 'nome_parte' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-outline uppercase tracking-widest">Nome da Parte</label>
                <input
                  type="text"
                  value={nomeParte}
                  onChange={e => setNomeParte(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Nome completo da parte"
                  className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-secondary/20 outline-none placeholder:text-outline/40"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-outline uppercase tracking-widest">Polo Processual</label>
                <div className="relative">
                  <select
                    value={poloParte}
                    onChange={e => setPoloParte(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-secondary/20 outline-none appearance-none pr-10"
                  >
                    {POLO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline pointer-events-none" />
                </div>
              </div>
            </div>
          )}

          {filterType === 'advogado' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-outline uppercase tracking-widest">Nome do Advogado</label>
              <input
                type="text"
                value={nomeAdvogado}
                onChange={e => setNomeAdvogado(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Nome completo do advogado"
                className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-secondary/20 outline-none placeholder:text-outline/40"
              />
            </div>
          )}

          {filterType === 'oab_advogado' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-outline uppercase tracking-widest">Número da OAB</label>
              <input
                type="text"
                value={oabAdvogado}
                onChange={e => setOabAdvogado(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Ex: 12345/PA"
                className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-secondary/20 outline-none placeholder:text-outline/40"
              />
            </div>
          )}

          {filterType === 'cpf_parte' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-outline uppercase tracking-widest">CPF da Parte</label>
              <input
                type="text"
                value={cpfParte}
                onChange={e => setCpfParte(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="000.000.000-00"
                className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-secondary/20 outline-none placeholder:text-outline/40"
              />
            </div>
          )}

          {/* Search button */}
          <button
            onClick={handleSearch}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-secondary text-on-secondary font-headline font-bold rounded-xl hover:opacity-90 transition-all active:scale-[0.98] shadow-lg shadow-secondary/10 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            {loading ? 'Consultando Datajud...' : 'Consultar'}
          </button>
        </div>
      </section>

      {/* Error */}
      {error && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-error/5 p-5 rounded-2xl border border-error/15 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
          <p className="text-sm text-error font-medium">{error}</p>
        </motion.div>
      )}

      {/* Stats bar */}
      {hasSearched && !loading && !error && (
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/5 flex items-center gap-5">
            <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center shrink-0">
              <Database className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-[10px] font-black text-outline uppercase tracking-widest">Total Encontrado</p>
              <p className="text-3xl font-black text-on-surface leading-none mt-1">{totalResults > 1000 ? `${Math.floor(totalResults / 1000)}k+` : totalResults}</p>
            </div>
          </div>
          <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/5 flex items-center gap-5">
            <div className="w-12 h-12 bg-surface-container-high rounded-2xl flex items-center justify-center shrink-0">
              <Gavel className="w-6 h-6 text-outline" />
            </div>
            <div>
              <p className="text-[10px] font-black text-outline uppercase tracking-widest">Exibindo</p>
              <p className="text-3xl font-black text-on-surface leading-none mt-1">{resultados.length}</p>
            </div>
          </div>
          <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/5 flex items-center gap-5">
            <div className="w-12 h-12 bg-surface-container-high rounded-2xl flex items-center justify-center shrink-0">
              <MapPin className="w-6 h-6 text-outline" />
            </div>
            <div>
              <p className="text-[10px] font-black text-outline uppercase tracking-widest">
                {unifiedSearch ? 'Tribunais' : 'Tribunal'}
              </p>
              <p className="text-lg font-black text-on-surface leading-none mt-1">
                {unifiedSearch 
                  ? (unifiedStats ? `${unifiedStats.comResultado}/${unifiedStats.consultados}` : 'Unificado')
                  : (selectedTribunal?.sigla || '—')
                }
              </p>
            </div>
          </div>
        </motion.section>
      )}

      {/* Results */}
      {hasSearched && !loading && resultados.length === 0 && !error && (
        <div className="text-center py-20 bg-surface-container-low/30 rounded-3xl border border-dashed border-outline-variant/20">
          <div className="w-16 h-16 bg-surface-container-high rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
            <Database className="w-8 h-8 text-outline" />
          </div>
          <p className="text-sm font-bold text-outline uppercase tracking-widest">Nenhum processo encontrado.</p>
          <p className="text-xs text-on-surface-variant mt-2">Verifique o tribunal, número ou nome informado.</p>
        </div>
      )}

      {resultados.length > 0 && (
        <section className="grid grid-cols-1 gap-5">
          {resultados.map((proc, idx) => {
            const isExpanded = expandedItems.has(proc.numeroProcesso);
            const partesAtivo = (proc.partes || []).filter(p => p.polo === 'ATIVO');
            const partesPassivo = (proc.partes || []).filter(p => p.polo === 'PASSIVO');

            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                key={proc.numeroProcesso + idx}
                className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 overflow-hidden hover:border-secondary/20 transition-all shadow-[0_4px_20px_rgb(0,0,0,0.04)]"
              >
                {/* Header */}
                <div className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border bg-blue-500/15 text-blue-400 border-blue-500/20">
                      {proc.tribunal || selectedTribunal?.sigla}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-widest bg-surface-container-high px-2.5 py-1 rounded-lg text-on-surface-variant border border-outline-variant/10">
                      {proc.grau === 'G1' ? '1º Grau' : proc.grau === 'G2' ? '2º Grau' : proc.grau === 'JE' ? 'Juizado' : proc.grau || '—'}
                    </span>
                    {proc.classeProcessual?.nome && (
                      <span className="text-[10px] uppercase font-bold tracking-widest bg-secondary/10 text-secondary px-2.5 py-1 rounded-lg border border-secondary/15">
                        {proc.classeProcessual.nome}
                      </span>
                    )}
                    <span className="font-mono font-bold text-xs text-secondary">{proc.numeroProcesso}</span>
                    {proc.dataAjuizamento && (
                      <span className="ml-auto text-[10px] text-outline font-bold uppercase tracking-widest flex items-center gap-1 shrink-0">
                        <Calendar className="w-3 h-3" />
                        {new Date(proc.dataAjuizamento).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Summary row */}
                <div className="px-5 pb-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-on-surface-variant">
                  {proc.orgaoJulgador?.nome && (
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-outline" /> {proc.orgaoJulgador.nome}</span>
                  )}
                  {proc.assuntos && proc.assuntos.length > 0 && (
                    <span className="flex items-center gap-1"><Scale className="w-3 h-3 text-outline" /> {proc.assuntos.map(a => a.nome).join(', ')}</span>
                  )}
                </div>

                {/* Partes summary */}
                <div className="px-5 pb-4 flex flex-wrap gap-4">
                  {partesAtivo.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-[9px] font-black text-outline uppercase tracking-widest mt-0.5">Autor:</span>
                      <div className="flex flex-wrap gap-1">
                        {partesAtivo.slice(0, 3).map((p, i) => (
                          <span key={i} className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 px-2 py-0.5 rounded-md">
                            {p.tipoPessoa === 'JURIDICA' ? <Building2 className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
                            {p.nome}
                          </span>
                        ))}
                        {partesAtivo.length > 3 && <span className="text-[10px] text-outline">+{partesAtivo.length - 3}</span>}
                      </div>
                    </div>
                  )}
                  {partesPassivo.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-[9px] font-black text-outline uppercase tracking-widest mt-0.5">Réu:</span>
                      <div className="flex flex-wrap gap-1">
                        {partesPassivo.slice(0, 3).map((p, i) => (
                          <span key={i} className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/15 px-2 py-0.5 rounded-md">
                            {p.tipoPessoa === 'JURIDICA' ? <Building2 className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
                            {p.nome}
                          </span>
                        ))}
                        {partesPassivo.length > 3 && <span className="text-[10px] text-outline">+{partesPassivo.length - 3}</span>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Expand toggle */}
                <button
                  onClick={() => toggleExpand(proc.numeroProcesso)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-surface-container-low/50 hover:bg-surface-container-low text-secondary text-[10px] font-black uppercase tracking-widest transition-colors border-t border-outline-variant/5"
                >
                  {isExpanded ? <><ChevronUp className="w-3.5 h-3.5" /> Recolher</> : <><ChevronDown className="w-3.5 h-3.5" /> Ver Detalhes</>}
                </button>

                {/* Expanded details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-outline-variant/5"
                    >
                      <div className="p-5 space-y-6">
                        {/* All parties with advogados */}
                        {proc.partes && proc.partes.length > 0 && (
                          <div>
                            <h5 className="text-[10px] font-black text-outline uppercase tracking-widest mb-3">Partes e Advogados</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {proc.partes.map((parte, pi) => (
                                <div key={pi} className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className={cn(
                                      'text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded',
                                      parte.polo === 'ATIVO' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                    )}>
                                      {parte.polo === 'ATIVO' ? 'Polo Ativo' : 'Polo Passivo'}
                                    </span>
                                    {parte.tipoPessoa && (
                                      <span className="text-[9px] text-outline">{parte.tipoPessoa === 'FISICA' ? 'Pessoa Física' : 'Pessoa Jurídica'}</span>
                                    )}
                                  </div>
                                  <p className="text-sm font-bold text-on-surface">{parte.nome}</p>
                                  {parte.advogados && parte.advogados.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      {parte.advogados.map((adv, ai) => (
                                        <p key={ai} className="text-[11px] text-on-surface-variant">
                                          <span className="text-secondary font-bold">Adv:</span> {adv.nome}
                                          {adv.numeroOAB && <span className="text-outline ml-1">OAB {adv.numeroOAB}</span>}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Movimentos */}
                        {proc.movimentos && proc.movimentos.length > 0 && (
                          <div>
                            <h5 className="text-[10px] font-black text-outline uppercase tracking-widest mb-3">Movimentações ({proc.movimentos.length})</h5>
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                              {proc.movimentos.slice(0, 20).map((mov, mi) => (
                                <div key={mi} className="flex gap-3 items-start bg-surface-container-low p-3 rounded-xl border border-outline-variant/5">
                                  <span className="text-[10px] font-bold text-outline uppercase tracking-widest whitespace-nowrap mt-0.5">
                                    {new Date(mov.dataHora).toLocaleDateString('pt-BR')}
                                  </span>
                                  <div>
                                    <p className="text-xs font-semibold text-on-surface">{mov.nome}</p>
                                    {mov.complemento && <p className="text-[11px] text-on-surface-variant mt-0.5">{mov.complemento}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </section>
      )}
    </div>
  );
}
