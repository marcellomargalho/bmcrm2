// ─── Datajud API — API Pública do CNJ (Resolução CNJ nº 331/2020) ───
// Motor: Elasticsearch via POST com Query DSL
// Docs: https://datajud-wiki.cnj.jus.br/api-publica

export interface DatajudMovimento {
  dataHora: string;
  codigo: number;
  nome: string;
  complemento?: string;
}

export interface DatajudAdvogado {
  nome: string;
  numeroOAB?: string;
}

export interface DatajudParte {
  nome: string;
  polo: 'ATIVO' | 'PASSIVO';
  tipoPessoa?: 'FISICA' | 'JURIDICA';
  advogados?: DatajudAdvogado[];
}

export interface DatajudProcesso {
  numeroProcesso: string;
  tribunal: string;
  grau: string;
  dataAjuizamento?: string;
  classeProcessual?: {
    codigo: number;
    nome: string;
  };
  assuntos?: {
    codigo: number;
    nome: string;
  }[];
  orgaoJulgador?: {
    codigo: string;
    nome: string;
    codigoMunicipioIBGE?: string;
  };
  partes?: DatajudParte[];
  movimentos?: DatajudMovimento[];
}

export interface DatajudResponse {
  hits: {
    total: { value: number };
    hits: {
      _source: DatajudProcesso;
    }[];
  };
}

// ─── Tribunais ───

export interface TribunalOption {
  sigla: string;
  nome: string;
  endpoint: string;
  regiao: string;
}

export const TRIBUNAIS: TribunalOption[] = [
  // Justiça Estadual — Norte
  { sigla: 'TJPA', nome: 'TJ do Pará', endpoint: 'api_publica_tjpa', regiao: 'Norte' },
  { sigla: 'TJAM', nome: 'TJ do Amazonas', endpoint: 'api_publica_tjam', regiao: 'Norte' },
  { sigla: 'TJAC', nome: 'TJ do Acre', endpoint: 'api_publica_tjac', regiao: 'Norte' },
  { sigla: 'TJAP', nome: 'TJ do Amapá', endpoint: 'api_publica_tjap', regiao: 'Norte' },
  { sigla: 'TJRO', nome: 'TJ de Rondônia', endpoint: 'api_publica_tjro', regiao: 'Norte' },
  { sigla: 'TJRR', nome: 'TJ de Roraima', endpoint: 'api_publica_tjrr', regiao: 'Norte' },
  { sigla: 'TJTO', nome: 'TJ de Tocantins', endpoint: 'api_publica_tjto', regiao: 'Norte' },
  // Justiça Estadual — Nordeste
  { sigla: 'TJBA', nome: 'TJ da Bahia', endpoint: 'api_publica_tjba', regiao: 'Nordeste' },
  { sigla: 'TJCE', nome: 'TJ do Ceará', endpoint: 'api_publica_tjce', regiao: 'Nordeste' },
  { sigla: 'TJMA', nome: 'TJ do Maranhão', endpoint: 'api_publica_tjma', regiao: 'Nordeste' },
  { sigla: 'TJPB', nome: 'TJ da Paraíba', endpoint: 'api_publica_tjpb', regiao: 'Nordeste' },
  { sigla: 'TJPE', nome: 'TJ de Pernambuco', endpoint: 'api_publica_tjpe', regiao: 'Nordeste' },
  { sigla: 'TJPI', nome: 'TJ do Piauí', endpoint: 'api_publica_tjpi', regiao: 'Nordeste' },
  { sigla: 'TJRN', nome: 'TJ do Rio G. do Norte', endpoint: 'api_publica_tjrn', regiao: 'Nordeste' },
  { sigla: 'TJSE', nome: 'TJ de Sergipe', endpoint: 'api_publica_tjse', regiao: 'Nordeste' },
  { sigla: 'TJAL', nome: 'TJ de Alagoas', endpoint: 'api_publica_tjal', regiao: 'Nordeste' },
  // Justiça Estadual — Centro-Oeste
  { sigla: 'TJDFT', nome: 'TJ do Distrito Federal', endpoint: 'api_publica_tjdft', regiao: 'Centro-Oeste' },
  { sigla: 'TJGO', nome: 'TJ de Goiás', endpoint: 'api_publica_tjgo', regiao: 'Centro-Oeste' },
  { sigla: 'TJMS', nome: 'TJ do Mato G. do Sul', endpoint: 'api_publica_tjms', regiao: 'Centro-Oeste' },
  { sigla: 'TJMT', nome: 'TJ do Mato Grosso', endpoint: 'api_publica_tjmt', regiao: 'Centro-Oeste' },
  // Justiça Estadual — Sudeste
  { sigla: 'TJSP', nome: 'TJ de São Paulo', endpoint: 'api_publica_tjsp', regiao: 'Sudeste' },
  { sigla: 'TJRJ', nome: 'TJ do Rio de Janeiro', endpoint: 'api_publica_tjrj', regiao: 'Sudeste' },
  { sigla: 'TJMG', nome: 'TJ de Minas Gerais', endpoint: 'api_publica_tjmg', regiao: 'Sudeste' },
  { sigla: 'TJES', nome: 'TJ do Espírito Santo', endpoint: 'api_publica_tjes', regiao: 'Sudeste' },
  // Justiça Estadual — Sul
  { sigla: 'TJRS', nome: 'TJ do Rio G. do Sul', endpoint: 'api_publica_tjrs', regiao: 'Sul' },
  { sigla: 'TJPR', nome: 'TJ do Paraná', endpoint: 'api_publica_tjpr', regiao: 'Sul' },
  { sigla: 'TJSC', nome: 'TJ de Santa Catarina', endpoint: 'api_publica_tjsc', regiao: 'Sul' },
  // Justiça Federal
  { sigla: 'TRF1', nome: 'TRF 1ª Região', endpoint: 'api_publica_trf1', regiao: 'Justiça Federal' },
  { sigla: 'TRF2', nome: 'TRF 2ª Região (RJ/ES)', endpoint: 'api_publica_trf2', regiao: 'Justiça Federal' },
  { sigla: 'TRF3', nome: 'TRF 3ª Região (SP/MS)', endpoint: 'api_publica_trf3', regiao: 'Justiça Federal' },
  { sigla: 'TRF4', nome: 'TRF 4ª Região (Sul)', endpoint: 'api_publica_trf4', regiao: 'Justiça Federal' },
  { sigla: 'TRF5', nome: 'TRF 5ª Região (Nordeste)', endpoint: 'api_publica_trf5', regiao: 'Justiça Federal' },
  { sigla: 'TRF6', nome: 'TRF 6ª Região (MG)', endpoint: 'api_publica_trf6', regiao: 'Justiça Federal' },
  // Justiça do Trabalho
  { sigla: 'TST', nome: 'Tribunal Superior do Trabalho', endpoint: 'api_publica_tst', regiao: 'Justiça do Trabalho' },
  { sigla: 'TRT1', nome: 'TRT 1ª Região (RJ)', endpoint: 'api_publica_trt1', regiao: 'Justiça do Trabalho' },
  { sigla: 'TRT2', nome: 'TRT 2ª Região (SP)', endpoint: 'api_publica_trt2', regiao: 'Justiça do Trabalho' },
  { sigla: 'TRT8', nome: 'TRT 8ª Região (PA/AP)', endpoint: 'api_publica_trt8', regiao: 'Justiça do Trabalho' },
  { sigla: 'TRT15', nome: 'TRT 15ª Região (Campinas)', endpoint: 'api_publica_trt15', regiao: 'Justiça do Trabalho' },
  // Superior
  { sigla: 'STJ', nome: 'Superior Tribunal de Justiça', endpoint: 'api_publica_stj', regiao: 'Superior' },
];

// ─── API Functions ───

// In dev, requests go through Vite proxy (/api/datajud → api-publica.datajud.cnj.jus.br)
// In production (Vercel), the same rewrite is handled by vercel.json
const BASE_URL = '/api/datajud';

export type DatajudFilterType = 'numero' | 'nome_parte' | 'advogado' | 'cpf_parte' | 'oab_advogado';

export interface DatajudSearchParams {
  apiKey: string;
  tribunal: string; // endpoint alias e.g. 'api_publica_tjpa'
  filterType: DatajudFilterType;
  // For 'numero' filter
  numeroProcesso?: string;
  // For 'nome_parte' filter
  nomeParte?: string;
  poloParte?: 'ATIVO' | 'PASSIVO' | '';
  // For 'advogado' filter
  nomeAdvogado?: string;
  // For 'cpf_parte' filter
  cpfParte?: string;
  // For 'oab_advogado' filter
  oabAdvogado?: string;
  // Pagination
  size?: number;
  searchAfter?: string[];
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

function buildQuery(params: DatajudSearchParams): object {
  const { filterType, numeroProcesso, nomeParte, poloParte, nomeAdvogado } = params;
  const size = params.size || 10;
  const sortField = params.sortField || 'dataAjuizamento';
  const sortOrder = params.sortOrder || 'desc';

  const body: any = {
    size,
    sort: [{ [sortField]: { order: sortOrder } }],
  };

  if (params.searchAfter && params.searchAfter.length > 0) {
    body.search_after = params.searchAfter;
  }

  switch (filterType) {
    case 'numero':
      body.query = {
        match: {
          numeroProcesso: (numeroProcesso || '').replace(/[.\-]/g, ''),
        },
      };
      break;

    case 'nome_parte': {
      const musts: any[] = [{ match: { 'partes.nome': nomeParte || '' } }];
      if (poloParte) {
        musts.push({ match: { 'partes.polo': poloParte } });
      }
      body.query = {
        bool: {
          must: musts,
        },
      };
      break;
    }

    case 'advogado': {
      body.query = {
        bool: {
          must: [
            { match: { 'partes.advogados.nome': nomeAdvogado || '' } }
          ],
        },
      };
      break;
    }

    case 'cpf_parte': {
      body.query = {
        match: {
          'partes.cpfCNPJ': (params.cpfParte || '').replace(/\D/g, ''),
        },
      };
      break;
    }

    case 'oab_advogado': {
      body.query = {
        match: {
          'partes.advogados.numeroOAB': params.oabAdvogado || '',
        },
      };
      break;
    }
  }

  return body;
}

export async function searchDatajud(
  params: DatajudSearchParams
): Promise<{ processos: DatajudProcesso[]; total: number } | { error: string }> {
  try {
    const url = `${BASE_URL}/${params.tribunal}/_search`;
    const queryBody = buildQuery(params);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `APIKey ${params.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(queryBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 401) {
      return { error: 'API Key inválida ou expirada. Verifique a chave nas Configurações.' };
    }
    if (response.status === 429) {
      return { error: 'Limite de requisições atingido. Aguarde alguns minutos e tente novamente.' };
    }
    if (!response.ok) {
      return { error: `Erro ${response.status}: ${response.statusText}` };
    }

    const data: DatajudResponse = await response.json();

    const processos = (data.hits?.hits || []).map((h) => h._source);
    const total = data.hits?.total?.value || 0;

    return { processos, total };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { error: 'Tempo limite excedido. Verifique sua conexão e tente novamente.' };
    }
    console.error('Datajud API error:', err);
    return { error: 'Falha ao conectar à API do Datajud. Tente novamente mais tarde.' };
  }
}

// ─── Busca Unificada — consulta múltiplos tribunais em paralelo ───

// Tribunais mais relevantes para o escritório (PA/Norte + Federais)
export const TRIBUNAIS_UNIFICADOS = [
  'api_publica_tjpa',
  'api_publica_trt8',
  'api_publica_trf1',
  'api_publica_tjsp',
  'api_publica_tjrj',
  'api_publica_tjba',
  'api_publica_stj',
];

export async function searchDatajudUnificado(
  params: Omit<DatajudSearchParams, 'tribunal'>
): Promise<{ processos: DatajudProcesso[]; total: number; tribunaisConsultados: number; tribunaisComResultado: number } | { error: string }> {
  const tribunais = TRIBUNAIS_UNIFICADOS;

  const results = await Promise.allSettled(
    tribunais.map(tribunal =>
      searchDatajud({ ...params, tribunal } as DatajudSearchParams)
    )
  );

  let allProcessos: DatajudProcesso[] = [];
  let totalSum = 0;
  let tribunaisComResultado = 0;
  let lastError = '';

  for (const result of results) {
    if (result.status === 'fulfilled' && !('error' in result.value)) {
      allProcessos = [...allProcessos, ...result.value.processos];
      totalSum += result.value.total;
      if (result.value.processos.length > 0) tribunaisComResultado++;
    } else if (result.status === 'fulfilled' && 'error' in result.value) {
      lastError = result.value.error;
    }
  }

  if (allProcessos.length === 0 && lastError) {
    return { error: lastError };
  }

  // Sort by date descending
  allProcessos.sort((a, b) => {
    const da = a.dataAjuizamento ? new Date(a.dataAjuizamento).getTime() : 0;
    const db = b.dataAjuizamento ? new Date(b.dataAjuizamento).getTime() : 0;
    return db - da;
  });

  return {
    processos: allProcessos.slice(0, 20),
    total: totalSum,
    tribunaisConsultados: tribunais.length,
    tribunaisComResultado,
  };
}
