/**
 * Tipo normalizado de publicação do DJEN.
 * Estrutura padronizada independente do formato retornado pela API.
 */
export type PublicacaoDJEN = {
  id: number;
  numeroProcesso: string;
  numeroProcessoMascara: string;
  classeProcessual?: string;
  tribunal?: string;
  orgaoJulgador?: string;
  dataDisponibilizacao?: string;
  dataPublicacao?: string;
  tipoComunicacao?: string;
  tipoDocumento?: string;
  meioComunicacao?: string;
  partes: ParteDJEN[];
  advogados: AdvogadoDJEN[];
  texto: string;
  link?: string;
  identificador?: string;
  status?: string;
  hash?: string;
};

export type ParteDJEN = {
  nome: string;
  polo?: 'A' | 'P' | string;
};

export type AdvogadoDJEN = {
  nome: string;
  numeroOab?: string;
  ufOab?: string;
};

/**
 * Resposta bruta da API do DJEN (comunicaapi.pje.jus.br)
 */
export interface DjenApiResponse {
  status: string;
  message: string;
  count: number;
  items: DjenApiItem[];
}

export interface DjenApiItem {
  id: number;
  data_disponibilizacao?: string;
  siglaTribunal?: string;
  tipoComunicacao?: string;
  nomeOrgao?: string;
  idOrgao?: number;
  texto?: string;
  numero_processo?: string;
  meio?: string;
  link?: string;
  tipoDocumento?: string;
  nomeClasse?: string;
  codigoClasse?: string;
  numeroComunicacao?: number;
  ativo?: boolean;
  hash?: string;
  status?: string;
  motivo_cancelamento?: string | null;
  data_cancelamento?: string | null;
  datadisponibilizacao?: string;
  meiocompleto?: string;
  numeroprocessocommascara?: string;
  destinatarios?: DestinatarioApi[];
  destinatarioadvogados?: DestinatarioAdvogadoApi[];
  // Campos alternativos que podem aparecer em versões diferentes da API
  numeros_processos?: string[];
  advogado?: {
    nome: string;
    numero_oab: string;
    uf_oab: string;
  };
}

export interface DestinatarioApi {
  nome: string;
  comunicacao_id: number;
  polo: string;
}

export interface DestinatarioAdvogadoApi {
  id: number;
  comunicacao_id: number;
  advogado_id: number;
  created_at: string;
  updated_at: string;
  advogado: {
    id: number;
    nome: string;
    numero_oab: string;
    uf_oab: string;
  };
}

/**
 * Parâmetros de busca para a API do DJEN
 */
export interface DjenSearchParams {
  nomeParte?: string;
  numeroProcesso?: string;
  nomeAdvogado?: string;
  numeroOab?: string;
  siglaTribunal?: string;
  nomeOrgao?: string;
  dataInicio?: string;
  dataFim?: string;
  pagina?: number;
  itensPorPagina?: number;
  dataDisponibilizacaoInicio?: string;
  dataDisponibilizacaoFim?: string;
}
