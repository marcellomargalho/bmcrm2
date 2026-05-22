import type { DjenApiItem, PublicacaoDJEN, ParteDJEN, AdvogadoDJEN } from '@/types/djen';

/**
 * Remove tags HTML e normaliza espaços/entidades do texto da publicação.
 */
function decodeHtml(html?: string): string {
  if (!html) return '';
  try {
    // Cria elemento textarea para decodificar entidades HTML
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    let decoded = txt.value;

    // Remove tags HTML remanescentes
    decoded = decoded.replace(/<[^>]*>?/gm, ' ');

    // Normaliza espaços múltiplos e quebras de linha excessivas
    decoded = decoded
      .replace(/\s{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return decoded;
  } catch {
    return html;
  }
}

/**
 * Retorna o valor do campo ou "Não informado" se ausente/vazio.
 */
function orNA(value?: string | null): string {
  return value?.trim() || 'Não informado';
}

/**
 * Normaliza a resposta bruta da API do DJEN em um objeto padronizado PublicacaoDJEN.
 * Trata variações de nomes de campos entre versões da API.
 */
export function normalizeDjenItem(item: DjenApiItem): PublicacaoDJEN {
  // Número do processo — tenta múltiplas variantes
  const numeroProcesso =
    item.numero_processo ||
    item.numeros_processos?.[0] ||
    '';

  const numeroProcessoMascara =
    item.numeroprocessocommascara ||
    formatNumeroProcesso(numeroProcesso) ||
    numeroProcesso;

  // Data de disponibilização — aceita "YYYY-MM-DD", "DD/MM/YYYY" etc.
  const dataDisponibilizacao =
    item.data_disponibilizacao ||
    item.datadisponibilizacao ||
    '';

  // Texto — limpa HTML
  const textoRaw =
    item.texto || '';

  const texto = decodeHtml(textoRaw);

  // Partes do processo (destinatários)
  const partes: ParteDJEN[] = (item.destinatarios || []).map((d) => ({
    nome: d.nome || 'Não informado',
    polo: d.polo,
  }));

  // Advogados vinculados
  const advogados: AdvogadoDJEN[] = (item.destinatarioadvogados || []).map((da) => ({
    nome: da.advogado?.nome || 'Não informado',
    numeroOab: da.advogado?.numero_oab || undefined,
    ufOab: da.advogado?.uf_oab || undefined,
  }));

  // Fallback: advogado único no campo legado
  if (advogados.length === 0 && item.advogado?.nome) {
    advogados.push({
      nome: item.advogado.nome,
      numeroOab: item.advogado.numero_oab,
      ufOab: item.advogado.uf_oab,
    });
  }

  return {
    id: item.id,
    numeroProcesso,
    numeroProcessoMascara,
    classeProcessual: orNA(item.nomeClasse) !== 'Não informado' ? item.nomeClasse : undefined,
    tribunal: orNA(item.siglaTribunal) !== 'Não informado' ? item.siglaTribunal : undefined,
    orgaoJulgador: orNA(item.nomeOrgao) !== 'Não informado' ? item.nomeOrgao : undefined,
    dataDisponibilizacao,
    dataPublicacao: undefined, // A API atual não retorna data de publicação separada
    tipoComunicacao: orNA(item.tipoComunicacao) !== 'Não informado' ? item.tipoComunicacao : undefined,
    tipoDocumento: orNA(item.tipoDocumento) !== 'Não informado' ? item.tipoDocumento : undefined,
    meioComunicacao: orNA(item.meiocompleto) !== 'Não informado' ? item.meiocompleto : (
      item.meio === 'D' ? 'Diário de Justiça Eletrônico Nacional' :
      item.meio === 'E' ? 'Plataforma Nacional de Editais' : item.meio
    ),
    partes,
    advogados,
    texto,
    link: item.link || undefined,
    identificador: item.hash || String(item.id),
    status: item.status || undefined,
    hash: item.hash || undefined,
  };
}

/**
 * Formata um número de processo sem máscara no formato CNJ: NNNNNNN-DD.AAAA.J.TT.OOOO
 */
function formatNumeroProcesso(num?: string): string {
  if (!num) return '';
  const digits = num.replace(/\D/g, '');
  if (digits.length !== 20) return num;
  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16)}`;
}

/**
 * Gera um resumo formatado de uma publicação para cópia.
 */
export function gerarResumoDJEN(pub: PublicacaoDJEN): string {
  const partes = pub.partes.map(p => p.nome).join(', ') || 'Não informado';
  const orgao = pub.orgaoJulgador || 'Não informado';
  const tribunal = pub.tribunal || 'Não informado';
  const data = pub.dataDisponibilizacao
    ? formatDateBRFromIso(pub.dataDisponibilizacao)
    : 'Não informado';
  const textoResumido = pub.texto.slice(0, 500) + (pub.texto.length > 500 ? '...' : '');

  return `Publicação encontrada no DJEN:

Processo: ${pub.numeroProcessoMascara || pub.numeroProcesso || 'Não informado'}
Partes: ${partes}
Vara/Órgão: ${orgao}
Tribunal: ${tribunal}
Data de disponibilização: ${data}

Teor da publicação:
${textoResumido}`;
}

function formatDateBRFromIso(dateStr: string): string {
  if (!dateStr) return 'Não informado';
  if (/^\d{2}\/\d{2}\/\d{4}/.test(dateStr)) return dateStr.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const [y, m, d] = dateStr.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  return dateStr;
}
