import type { DjenApiResponse, DjenSearchParams } from '@/types/djen';
import { normalizeDjenItem } from '@/utils/normalizeDjenResponse';
import type { PublicacaoDJEN } from '@/types/djen';

const DJEN_API_BASE = 'https://comunicaapi.pje.jus.br/api/v1/comunicacao';
const REQUEST_TIMEOUT_MS = 20000;

export interface DjenSearchResult {
  publicacoes: PublicacaoDJEN[];
  total: number;
  pagina: number;
  itensPorPagina: number;
}

export interface DjenSearchError {
  tipo: 'sem_parametros' | 'api_fora' | 'cors' | 'timeout' | 'formato_invalido' | 'sem_resultados' | 'limite' | 'http_error';
  mensagem: string;
  detalhe?: string;
}

/**
 * Consulta a API pública do DJEN e retorna as publicações normalizadas.
 * Trata erros de CORS, timeout, resposta inesperada e campos ausentes.
 */
export async function consultarDJEN(
  params: DjenSearchParams
): Promise<DjenSearchResult | DjenSearchError> {
  // Valida: ao menos um parâmetro de busca deve ser informado
  const hasFilter =
    params.nomeParte?.trim() ||
    params.numeroProcesso?.trim() ||
    params.nomeAdvogado?.trim() ||
    params.numeroOab?.trim() ||
    params.siglaTribunal?.trim() ||
    params.nomeOrgao?.trim() ||
    params.dataDisponibilizacaoInicio?.trim() ||
    params.dataDisponibilizacaoFim?.trim();

  if (!hasFilter) {
    return {
      tipo: 'sem_parametros',
      mensagem: 'Informe ao menos um critério de busca (nome da parte, número do processo, advogado, etc.).',
    };
  }

  try {
    const url = new URL(DJEN_API_BASE);

    // Mapeamento dos parâmetros para os nomes aceitos pela API
    if (params.nomeParte?.trim()) {
      url.searchParams.append('nomeParte', params.nomeParte.trim());
    }
    if (params.nomeAdvogado?.trim()) {
      url.searchParams.append('nomeAdvogado', params.nomeAdvogado.trim());
    }
    if (params.numeroOab?.trim()) {
      url.searchParams.append('numeroOab', params.numeroOab.trim());
    }
    if (params.numeroProcesso?.trim()) {
      // Remove formatação do número do processo para a busca
      const numLimpo = params.numeroProcesso.replace(/\D/g, '');
      url.searchParams.append('numeroProcesso', numLimpo || params.numeroProcesso.trim());
    }
    if (params.siglaTribunal?.trim()) {
      url.searchParams.append('siglaTribunal', params.siglaTribunal.trim());
    }
    if (params.nomeOrgao?.trim()) {
      url.searchParams.append('nomeOrgao', params.nomeOrgao.trim());
    }
    if (params.dataDisponibilizacaoInicio?.trim()) {
      url.searchParams.append('dataDisponibilizacaoInicio', params.dataDisponibilizacaoInicio.trim());
    }
    if (params.dataDisponibilizacaoFim?.trim()) {
      url.searchParams.append('dataDisponibilizacaoFim', params.dataDisponibilizacaoFim.trim());
    }

    const pagina = params.pagina ?? 1;
    const itensPorPagina = params.itensPorPagina ?? 20;

    url.searchParams.append('pagina', String(pagina));
    url.searchParams.append('itensPorPagina', String(itensPorPagina));

    // Controle de timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      if (fetchError?.name === 'AbortError') {
        return {
          tipo: 'timeout',
          mensagem: 'A consulta ao DJEN excedeu o tempo limite. Tente novamente em instantes.',
          detalhe: 'Timeout após ' + REQUEST_TIMEOUT_MS / 1000 + ' segundos.',
        };
      }

      // Erro de rede / CORS
      const isCors =
        fetchError?.message?.toLowerCase().includes('cors') ||
        fetchError?.message?.toLowerCase().includes('failed to fetch') ||
        fetchError?.message?.toLowerCase().includes('network');

      if (isCors) {
        return {
          tipo: 'cors',
          mensagem:
            'Não foi possível acessar a API do DJEN. Verifique se há bloqueio de CORS ou conectividade.',
          detalhe: fetchError?.message,
        };
      }

      return {
        tipo: 'api_fora',
        mensagem: 'A API do DJEN está indisponível no momento. Tente novamente mais tarde.',
        detalhe: fetchError?.message,
      };
    }

    clearTimeout(timeoutId);

    // Verifica status HTTP
    if (response.status === 429) {
      return {
        tipo: 'limite',
        mensagem: 'Limite de requisições atingido. Aguarde alguns instantes e tente novamente.',
      };
    }

    if (!response.ok) {
      return {
        tipo: 'http_error',
        mensagem: `A API retornou um erro inesperado (${response.status}).`,
        detalhe: response.statusText,
      };
    }

    // Parse do JSON
    let data: DjenApiResponse;
    try {
      data = await response.json();
    } catch {
      return {
        tipo: 'formato_invalido',
        mensagem: 'A API retornou uma resposta em formato inesperado. Tente novamente.',
      };
    }

    // Valida estrutura mínima
    if (!data || typeof data !== 'object' || !Array.isArray(data.items)) {
      return {
        tipo: 'formato_invalido',
        mensagem: 'A resposta da API não está no formato esperado.',
      };
    }

    // Normaliza os itens
    const publicacoes = data.items.map(normalizeDjenItem);

    // Ordena por data de disponibilização (mais recente primeiro)
    publicacoes.sort((a, b) => {
      const da = a.dataDisponibilizacao || '';
      const db = b.dataDisponibilizacao || '';
      return db.localeCompare(da);
    });

    return {
      publicacoes,
      total: data.count ?? publicacoes.length,
      pagina,
      itensPorPagina,
    };
  } catch (error: any) {
    console.error('[DJEN] Erro inesperado:', error);
    return {
      tipo: 'api_fora',
      mensagem: 'Ocorreu um erro inesperado ao consultar o DJEN.',
      detalhe: error?.message,
    };
  }
}

/**
 * Retorna um texto amigável para o tipo de erro.
 */
export function formatarErroDjen(err: DjenSearchError): string {
  return err.mensagem;
}
