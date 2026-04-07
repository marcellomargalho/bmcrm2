import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  BarChart2, TrendingUp, Eye, Target, ArrowUp, ArrowDown,
  Minus, Globe, Users, Zap, Calendar, RefreshCw
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────
interface PostStat {
  post_id: string | null;
  post_title: string | null;
  views: number;
  leads: number;
  conversion: number;
}

interface DayCount {
  day: string;
  count: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function formatDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function pct(leads: number, views: number): number {
  if (!views) return 0;
  return Math.round((leads / views) * 100);
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({
  icon: Icon, label, value, sub, accent = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={`relative p-6 rounded-xl border overflow-hidden transition-all hover:shadow-lg ${accent
        ? 'bg-primary/10 border-primary/30'
        : 'bg-surface-container-low border-outline-variant/20'
      }`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${accent ? 'bg-primary/20' : 'bg-surface-container-highest'
        }`}>
        <Icon className={`w-5 h-5 ${accent ? 'text-primary' : 'text-on-surface-variant'}`} />
      </div>
      <p className="text-2xl font-bold font-headline text-on-surface">{value}</p>
      <p className="text-xs uppercase tracking-widest font-semibold text-on-surface-variant mt-1">{label}</p>
      {sub && <p className="text-xs text-outline mt-2">{sub}</p>}
      {accent && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-6 translate-x-6 pointer-events-none" />
      )}
    </div>
  );
}

// ─── Mini SVG Line Chart ─────────────────────────────────────────────────────
function LineChart({ data }: { data: DayCount[] }) {
  if (data.length < 2) {
    return (
      <div className="h-40 flex items-center justify-center text-on-surface-variant text-sm opacity-40">
        Dados insuficientes para exibir o gráfico.
      </div>
    );
  }

  const max = Math.max(...data.map(d => d.count), 1);
  const width = 700;
  const height = 140;
  const pad = { top: 10, right: 20, bottom: 30, left: 32 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const xStep = chartW / (data.length - 1);
  const pts = data.map((d, i) => ({
    x: pad.left + i * xStep,
    y: pad.top + (1 - d.count / max) * chartH,
    label: formatDate(d.day),
    count: d.count,
  }));

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${pts[pts.length - 1].x} ${pad.top + chartH} L ${pts[0].x} ${pad.top + chartH} Z`;

  // Mostrar só alguns labels no eixo X para não sobrecarregar
  const labelStep = Math.max(1, Math.floor(data.length / 7));
  const yLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: 160 }}>
      {/* Grid lines */}
      {yLines.map((f, i) => {
        const y = pad.top + (1 - f) * chartH;
        const val = Math.round(f * max);
        return (
          <g key={i}>
            <line x1={pad.left} y1={y} x2={width - pad.right} y2={y}
              stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={pad.left - 6} y={y + 4} textAnchor="end"
              fill="rgba(255,255,255,0.3)" fontSize="10">{val}</text>
          </g>
        );
      })}

      {/* Area fill */}
      <path d={areaD} fill="rgba(233,193,118,0.06)" />

      {/* Line */}
      <path d={pathD} fill="none" stroke="#e9c176" strokeWidth="2" strokeLinejoin="round" />

      {/* Dots + tooltips */}
      {pts.map((p, i) => (
        <g key={i}>
          {i % labelStep === 0 && (
            <text x={p.x} y={height - 4} textAnchor="middle"
              fill="rgba(255,255,255,0.3)" fontSize="9">{p.label}</text>
          )}
          <circle cx={p.x} cy={p.y} r="3" fill="#e9c176" opacity={p.count > 0 ? 1 : 0.2} />
        </g>
      ))}
    </svg>
  );
}

// ─── Analytics Page ──────────────────────────────────────────────────────────
export function Analytics() {
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Totals
  const [totalViews, setTotalViews] = useState(0);
  const [totalLeads, setTotalLeads] = useState(0);
  const [totalHomepageLeads, setTotalHomepageLeads] = useState(0);

  // Table data
  const [postStats, setPostStats] = useState<PostStat[]>([]);

  // Timeline
  const [viewsTimeline, setViewsTimeline] = useState<DayCount[]>([]);

  // Referrers
  const [referrers, setReferrers] = useState<{ referrer: string; count: number }[]>([]);

  const fetchData = async () => {
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - range);
    const sinceISO = since.toISOString();

    // ── 1. Total views ───────────────────────────────────────────────────────
    const { count: viewCount } = await supabase
      .from('page_views')
      .select('*', { count: 'exact', head: true })
      .gte('viewed_at', sinceISO);

    setTotalViews(viewCount || 0);

    // ── 2. Total leads (artigo) ──────────────────────────────────────────────
    const { count: leadCount } = await supabase
      .from('blog_leads')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'article_cta')
      .gte('created_at', sinceISO);

    setTotalLeads(leadCount || 0);

    // ── 3. Leads homepage ────────────────────────────────────────────────────
    const { count: hpCount } = await supabase
      .from('blog_leads')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'homepage_cta')
      .gte('created_at', sinceISO);

    setTotalHomepageLeads(hpCount || 0);

    // ── 4. Views por artigo ──────────────────────────────────────────────────
    const { data: viewsData } = await supabase
      .from('page_views')
      .select('post_id, post_title')
      .gte('viewed_at', sinceISO);

    const { data: leadsData } = await supabase
      .from('blog_leads')
      .select('post_id, post_title, source')
      .eq('source', 'article_cta')
      .gte('created_at', sinceISO);

    // Aggregate by post
    const map: Record<string, PostStat> = {};

    (viewsData || []).forEach((v) => {
      const key = v.post_id || '__null__';
      if (!map[key]) map[key] = { post_id: v.post_id, post_title: v.post_title, views: 0, leads: 0, conversion: 0 };
      map[key].views += 1;
    });

    (leadsData || []).forEach((l) => {
      const key = l.post_id || '__null__';
      if (!map[key]) map[key] = { post_id: l.post_id, post_title: l.post_title, views: 0, leads: 0, conversion: 0 };
      map[key].leads += 1;
    });

    const stats: PostStat[] = Object.values(map)
      .filter(s => s.post_id) // exclude null post entries
      .map(s => ({ ...s, conversion: pct(s.leads, s.views) }))
      .sort((a, b) => b.views - a.views);

    setPostStats(stats);

    // ── 5. Timeline (views por dia) ──────────────────────────────────────────
    const days: DayCount[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({ day: d.toISOString().slice(0, 10), count: 0 });
    }

    (viewsData || []).forEach((v: any) => {
      const day = new Date(v.viewed_at || '').toISOString().slice(0, 10);
      const found = days.find(d => d.day === day);
      if (found) found.count += 1;
    });

    setViewsTimeline(days);

    // ── 6. Referrers ─────────────────────────────────────────────────────────
    const { data: refData } = await supabase
      .from('page_views')
      .select('referrer')
      .gte('viewed_at', sinceISO);

    const refMap: Record<string, number> = {};
    (refData || []).forEach((r: any) => {
      const key = r.referrer || 'direto';
      refMap[key] = (refMap[key] || 0) + 1;
    });

    const refArr = Object.entries(refMap)
      .map(([referrer, count]) => ({ referrer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    setReferrers(refArr);
    setLastUpdate(new Date());
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [range]);

  const conversionRate = totalViews > 0 ? ((totalLeads / totalViews) * 100).toFixed(1) : '0.0';
  const topPost = postStats[0];
  const maxViews = Math.max(...postStats.map(p => p.views), 1);
  const maxLeads = Math.max(...postStats.map(p => p.leads), 1);
  const maxRef = Math.max(...referrers.map(r => r.count), 1);

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4
                      bg-surface-container-low p-6 rounded-xl border border-outline-variant/20 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <BarChart2 className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-light text-on-surface">Analytics do Site</h1>
          </div>
          <p className="text-on-surface-variant text-sm">
            Acompanhe acessos ao blog e intenções de contato dos visitantes.
            <span className="text-outline ml-2 text-xs">
              Atualizado às {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Range selector */}
          <div className="flex gap-1 bg-surface-container p-1 rounded-lg border border-outline-variant/20">
            {([7, 30, 90] as const).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${range === r
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
              >
                {r}d
              </button>
            ))}
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-outline-variant/20
                       text-on-surface-variant hover:bg-surface-container-high transition-colors text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32 text-on-surface-variant">
          <RefreshCw className="w-6 h-6 animate-spin mr-3" />
          <span className="text-sm">Carregando dados...</span>
        </div>
      ) : (
        <>
          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={Eye}
              label="Visualizações"
              value={formatNum(totalViews)}
              sub={`Últimos ${range} dias`}
              accent
            />
            <KpiCard
              icon={Target}
              label="Leads do Blog"
              value={formatNum(totalLeads)}
              sub="Clicaram em Agendar"
            />
            <KpiCard
              icon={Globe}
              label="Leads Homepage"
              value={formatNum(totalHomepageLeads)}
              sub="Botão Falar com Especialista"
            />
            <KpiCard
              icon={Zap}
              label="Taxa de Conversão"
              value={`${conversionRate}%`}
              sub="Leads ÷ Visualizações"
            />
          </div>

          {/* ── Gráfico de acessos por dia ── */}
          <div className="bg-surface-container-low rounded-xl border border-outline-variant/20 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-on-surface uppercase tracking-wider">
                  Visualizações por Dia
                </h2>
              </div>
              <span className="text-xs text-outline">Últimos {range} dias</span>
            </div>
            <LineChart data={viewsTimeline} />
          </div>

          {/* ── Grid: Artigos + Referrers ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Artigos — ocupa 2/3 */}
            <div className="lg:col-span-2 bg-surface-container-low rounded-xl border border-outline-variant/20 p-6">
              <div className="flex items-center gap-2 mb-6">
                <Globe className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-on-surface uppercase tracking-wider">
                  Artigos Mais Acessados
                </h2>
              </div>

              {postStats.length === 0 ? (
                <div className="py-16 text-center text-on-surface-variant text-sm opacity-40 flex flex-col items-center gap-3">
                  <Eye className="w-8 h-8" />
                  <p>Nenhuma visualização registrada ainda.<br />
                    Publique artigos no site e eles aparecerão aqui.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Cabeçalho */}
                  <div className="hidden md:grid grid-cols-[1fr_80px_60px_70px] gap-3 text-[10px] uppercase tracking-widest text-outline pb-2 border-b border-outline-variant/10">
                    <span>Artigo</span>
                    <span className="text-right">Views</span>
                    <span className="text-right">Leads</span>
                    <span className="text-right">Conv.</span>
                  </div>

                  {postStats.map((stat, idx) => (
                    <div key={stat.post_id || idx}>
                      {/* Linha principal */}
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_80px_60px_70px] gap-2 md:gap-3 items-center group">
                        {/* Título */}
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${idx === 0 ? 'bg-primary/20 text-primary'
                                : idx === 1 ? 'bg-white/10 text-white/60'
                                  : 'bg-surface-container text-outline'
                              }`}
                          >
                            {idx + 1}
                          </span>
                          <span className="text-sm text-on-surface truncate">
                            {stat.post_title || 'Artigo removido'}
                          </span>
                        </div>

                        {/* Views com barra */}
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-sm font-semibold text-on-surface">{stat.views}</span>
                          <div className="w-full md:w-16 h-1 bg-surface-container-highest rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary/60 rounded-full transition-all duration-500"
                              style={{ width: `${(stat.views / maxViews) * 100}%` }}
                            />
                          </div>
                        </div>

                        {/* Leads */}
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-sm font-semibold text-on-surface">{stat.leads}</span>
                          <div className="w-full md:w-12 h-1 bg-surface-container-highest rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-400/60 rounded-full transition-all duration-500"
                              style={{ width: `${(stat.leads / maxLeads) * 100}%` }}
                            />
                          </div>
                        </div>

                        {/* Conversão */}
                        <div className="text-right">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${stat.conversion >= 10 ? 'bg-green-500/15 text-green-400'
                              : stat.conversion >= 3 ? 'bg-amber-500/15 text-amber-400'
                                : 'bg-surface-container text-outline'
                            }`}>
                            {stat.conversion}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Referrers — ocupa 1/3 */}
            <div className="bg-surface-container-low rounded-xl border border-outline-variant/20 p-6">
              <div className="flex items-center gap-2 mb-6">
                <Users className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-on-surface uppercase tracking-wider">
                  Origem dos Acessos
                </h2>
              </div>

              {referrers.length === 0 ? (
                <div className="py-12 text-center text-on-surface-variant text-xs opacity-40">
                  Nenhum dado ainda.
                </div>
              ) : (
                <div className="space-y-4">
                  {referrers.map((r, i) => {
                    const domain = (() => {
                      try {
                        const u = new URL(r.referrer);
                        return u.hostname.replace('www.', '');
                      } catch {
                        return r.referrer;
                      }
                    })();
                    return (
                      <div key={i} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-on-surface truncate max-w-[140px]">{domain}</span>
                          <span className="text-xs font-bold text-on-surface shrink-0">{r.count}</span>
                        </div>
                        <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/50 rounded-full transition-all duration-500"
                            style={{ width: `${(r.count / maxRef) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Dica UTM */}
              <div className="mt-8 p-3 rounded-lg bg-primary/5 border border-primary/15 text-xs text-on-surface-variant leading-relaxed">
                <span className="text-primary font-semibold block mb-1">💡 Dica</span>
                Adicione <code className="bg-surface-container px-1 rounded text-primary">?utm_source=instagram</code> nos links que você compartilha para rastrear a origem exata.
              </div>
            </div>
          </div>

          {/* ── Destaque do artigo mais lido ── */}
          {topPost && (
            <div className="bg-surface-container-low rounded-xl border border-primary/20 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-0.5">
                    🔥 Artigo em Destaque
                  </p>
                  <p className="text-lg font-medium text-on-surface line-clamp-1">
                    {topPost.post_title}
                  </p>
                  <p className="text-xs text-outline mt-0.5">Artigo mais acessado no período</p>
                </div>
              </div>
              <div className="flex gap-6 shrink-0">
                <div className="text-center">
                  <p className="text-2xl font-bold text-on-surface">{topPost.views}</p>
                  <p className="text-[10px] uppercase tracking-widest text-outline mt-0.5">Views</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-on-surface">{topPost.leads}</p>
                  <p className="text-[10px] uppercase tracking-widest text-outline mt-0.5">Leads</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{topPost.conversion}%</p>
                  <p className="text-[10px] uppercase tracking-widest text-outline mt-0.5">Conversão</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Empty state global ── */}
          {totalViews === 0 && totalLeads === 0 && (

            <div className="bg-surface-container-low rounded-xl border border-outline-variant/20 p-12 text-center">
              <BarChart2 className="w-12 h-12 text-outline mx-auto mb-4 opacity-30" />
              <p className="text-on-surface font-medium mb-2">Ainda sem dados de acesso</p>
              <p className="text-on-surface-variant text-sm max-w-md mx-auto">
                Assim que visitantes acessarem os artigos do site, os dados começarão a aparecer aqui automaticamente.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
