// ─────────────────────────────────────────────────────────────
// Tipos completos da API pública do DJEN
// Base: https://comunicaapi.pje.jus.br/api/v1/comunicacao
// ─────────────────────────────────────────────────────────────

export interface DjenResponse {
  status: string;
  message: string;
  count: number;
  items: DjenIntimacao[];
}

/**
 * Destinatário (parte do processo) retornado pela API.
 */
export interface DjenDestinatario {
  nome: string;
  comunicacao_id: number;
  /** "A" = Polo Ativo, "P" = Polo Passivo */
  polo: 'A' | 'P' | string;
}

/**
 * Advogado vinculado à comunicação.
 */
export interface DjenAdvogado {
  id: number;
  nome: string;
  numero_oab: string;
  uf_oab: string;
}

export interface DjenDestinatarioAdvogado {
  id: number;
  comunicacao_id: number;
  advogado_id: number;
  created_at: string;
  updated_at: string;
  advogado: DjenAdvogado;
}

/**
 * Item completo retornado pela API do DJEN.
 * Captura todos os campos documentados e os campos extras observados na resposta real.
 */
export interface DjenIntimacao {
  id: number;
  data_disponibilizacao: string;

  // Tribunal e órgão
  siglaTribunal: string;
  nomeOrgao: string;
  idOrgao?: number;

  // Tipo de comunicação
  tipoComunicacao: string;
  tipoDocumento?: string;
  meio?: string;
  meiocompleto?: string;

  // Processo
  numero_processo?: string;
  numeroprocessocommascara?: string;
  numeros_processos?: string[];

  // Classe processual
  nomeClasse?: string;
  codigoClasse?: string;

  // Texto da comunicação (pode conter HTML)
  texto: string;

  // Link para o sistema de origem
  link?: string;

  // Partes e advogados
  destinatarios?: DjenDestinatario[];
  destinatarioadvogados?: DjenDestinatarioAdvogado[];

  // Campos legados (versões antigas da API)
  advogado?: {
    nome: string;
    numero_oab: string;
    uf_oab: string;
  };

  // Status e controle
  status?: string;
  ativo?: boolean;
  hash?: string;
  numeroComunicacao?: number;
  motivo_cancelamento?: string | null;
  data_cancelamento?: string | null;
  datadisponibilizacao?: string;
}

// ─────────────────────────────────────────────────────────────
// Tipos normalizados (pós-tratamento)
// ─────────────────────────────────────────────────────────────

export interface ParteProceso {
  nome: string;
  polo: 'A' | 'P' | string;
}

export interface AdvogadoProcesso {
  nome: string;
  oab?: string; // "12345/PA"
}

/**
 * Publicação normalizada — estrutura padronizada para exibição.
 */
export interface IntimacaoNormalizada {
  id: number;
  numeroProcesso: string;         // sem formatação
  numeroProcessoMascara: string;  // "NNNNNNN-DD.AAAA.J.TT.OOOO"
  tribunal: string;
  orgao: string;
  classeProcessual: string;
  tipoComunicacao: string;
  meioComunicacao: string;
  dataDisponibilizacao: string;   // "YYYY-MM-DD" original
  dataFormatada: string;          // "DD/MM/AAAA"
  partes: ParteProceso[];
  partesAtivo: ParteProceso[];
  partesPassivo: ParteProceso[];
  advogados: AdvogadoProcesso[];
  texto: string;       // HTML decodificado
  textoHtml: string;   // original para impressão
  link?: string;
  status: string;
}

// ─────────────────────────────────────────────────────────────
// Funções utilitárias
// ─────────────────────────────────────────────────────────────

/** Remove tags HTML e normaliza espaços. */
export function decodeHtmlToText(html: string): string {
  if (!html) return '';
  try {
    const el = document.createElement('textarea');
    el.innerHTML = html;
    let text = el.value;
    text = text.replace(/<[^>]*>?/gm, ' ');
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/\s{2,}/g, ' ').trim();
    return text;
  } catch {
    return html.replace(/<[^>]*>?/gm, ' ').trim();
  }
}

/** Formata número de processo de 20 dígitos para o padrão CNJ. */
export function formatarNumeroProcesso(num: string): string {
  const d = num.replace(/\D/g, '');
  if (d.length !== 20) return num;
  return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13, 14)}.${d.slice(14, 16)}.${d.slice(16)}`;
}

/** Formata data de "YYYY-MM-DD" para "DD/MM/AAAA". */
export function formatarDataBR(dateStr: string): string {
  if (!dateStr) return 'Não informado';
  if (/^\d{2}\/\d{2}\/\d{4}/.test(dateStr)) return dateStr.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const [y, m, d] = dateStr.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  return dateStr;
}

/**
 * Extrai número de processo no formato CNJ a partir do texto da publicação.
 * Fallback quando a API não retorna o campo estruturado.
 */
export function extrairNumeroProcessoDoTexto(texto: string): string | null {
  const match = texto.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/);
  return match ? match[0] : null;
}

/**
 * Normaliza um item bruto da API em IntimacaoNormalizada.
 * Trata variações de campos entre versões da API.
 */
export function normalizarIntimacao(item: DjenIntimacao): IntimacaoNormalizada {
  // Número do processo — vários formatos possíveis
  const numRaw =
    item.numero_processo ||
    item.numeros_processos?.[0] ||
    '';

  const numMascara =
    item.numeroprocessocommascara ||
    (numRaw ? formatarNumeroProcesso(numRaw) : '') ||
    '';

  // Texto: decodifica HTML
  const textoHtml = item.texto || '';
  const texto = decodeHtmlToText(textoHtml);

  // Extrai número do texto se não vier estruturado
  const numeroFinal = numMascara ||
    extrairNumeroProcessoDoTexto(texto) ||
    'Não informado';

  // Partes do processo
  const partes: ParteProceso[] = (item.destinatarios || []).map(d => ({
    nome: d.nome || 'Não informado',
    polo: d.polo || '',
  }));

  const partesAtivo  = partes.filter(p => p.polo === 'A');
  const partesPassivo = partes.filter(p => p.polo === 'P');

  // Advogados
  const advogados: AdvogadoProcesso[] = [];
  if (item.destinatarioadvogados?.length) {
    item.destinatarioadvogados.forEach(da => {
      if (da.advogado?.nome) {
        const oabNum = da.advogado.numero_oab;
        const oabUf  = da.advogado.uf_oab;
        advogados.push({
          nome: da.advogado.nome,
          oab:  oabNum ? `${oabNum}${oabUf ? `/${oabUf}` : ''}` : undefined,
        });
      }
    });
  } else if (item.advogado?.nome) {
    // campo legado
    advogados.push({
      nome: item.advogado.nome,
      oab:  item.advogado.numero_oab
              ? `${item.advogado.numero_oab}${item.advogado.uf_oab ? `/${item.advogado.uf_oab}` : ''}`
              : undefined,
    });
  }

  // Meio de comunicação
  const meio =
    item.meiocompleto ||
    (item.meio === 'D' ? 'Diário de Justiça Eletrônico Nacional' :
     item.meio === 'E' ? 'Plataforma Nacional de Editais' :
     item.meio || 'Não informado');

  return {
    id: item.id,
    numeroProcesso:      numRaw,
    numeroProcessoMascara: numeroFinal,
    tribunal:            item.siglaTribunal || 'Não informado',
    orgao:               item.nomeOrgao     || 'Não informado',
    classeProcessual:    item.nomeClasse    || '',
    tipoComunicacao:     item.tipoComunicacao || '',
    meioComunicacao:     meio,
    dataDisponibilizacao: item.data_disponibilizacao || '',
    dataFormatada:       formatarDataBR(item.data_disponibilizacao || ''),
    partes,
    partesAtivo,
    partesPassivo,
    advogados,
    texto,
    textoHtml,
    link: item.link || undefined,
    status: item.status || '',
  };
}

/**
 * Gera resumo formatado para copiar.
 */
export function gerarResumoIntimacao(n: IntimacaoNormalizada): string {
  const partes = n.partes.map(p => p.nome).join(', ') || 'Não informado';
  return `Publicação encontrada no DJEN:

Processo: ${n.numeroProcessoMascara}
Partes: ${partes}
Vara/Órgão: ${n.orgao}
Tribunal: ${n.tribunal}
Data de disponibilização: ${n.dataFormatada}

Teor da publicação:
${n.texto.slice(0, 600)}${n.texto.length > 600 ? '...' : ''}`;
}

// ─────────────────────────────────────────────────────────────
// Funções de busca na API
// ─────────────────────────────────────────────────────────────

const DJEN_API = 'https://comunicaapi.pje.jus.br/api/v1/comunicacao';

export async function fetchIntimacoesFromDjen({
  nomeAdvogado,
  numeroOab,
  pagina = 1,
  itensPorPagina = 20,
  siglaTribunal,
}: {
  nomeAdvogado?: string;
  numeroOab?: string;
  pagina?: number;
  itensPorPagina?: number;
  siglaTribunal?: string;
}): Promise<DjenResponse | null> {
  try {
    const url = new URL(DJEN_API);

    if (nomeAdvogado?.trim()) {
      url.searchParams.append('nomeAdvogado', nomeAdvogado.trim());
    } else if (numeroOab?.trim()) {
      url.searchParams.append('numeroOab', numeroOab.trim());
    } else {
      return { status: 'empty', message: 'Informe Nome ou OAB para buscar.', count: 0, items: [] };
    }

    url.searchParams.append('pagina', pagina.toString());
    url.searchParams.append('itensPorPagina', itensPorPagina.toString());
    if (siglaTribunal) url.searchParams.append('siglaTribunal', siglaTribunal);

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`DJEN API ${response.status}: ${response.statusText}`);
    }

    const data: DjenResponse = await response.json();
    return data;
  } catch (error) {
    console.error('[DJEN] fetch error:', error);
    return null;
  }
}
