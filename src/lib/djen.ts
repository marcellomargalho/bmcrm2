export interface DjenResponse {
  status: string;
  message: string;
  count: number;
  items: DjenIntimacao[];
}

export interface DjenIntimacao {
  id: number;
  data_disponibilizacao: string;
  siglaTribunal: string;
  tipoComunicacao: string;
  nomeOrgao: string;
  idOrgao: number;
  texto: string;
  numeros_processos?: string[];
  advogado?: {
    nome: string;
    numero_oab: string;
    uf_oab: string;
  };
  numero_processo?: string; // Sometimes the API returns this
}

/**
 * Busca intimações conectando à API pública do DJEN (comunicaapi.pje.jus.br)
 */
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
    const url = new URL("https://comunicaapi.pje.jus.br/api/v1/comunicacao");
    
    // We only attach parameters if they have meaningful values
    if (nomeAdvogado?.trim()) {
      url.searchParams.append("nomeAdvogado", nomeAdvogado.trim());
    } else if (numeroOab?.trim()) {
      url.searchParams.append("numeroOab", numeroOab.trim());
    } else {
      // API requires at least one parameter to narrow down effectively if we want specific data,
      // but if both are empty we return early so we don't query 10,000 global intimations unnecessarily.
      return { status: "empty", message: "Informe Nome ou OAB para buscar.", count: 0, items: [] };
    }

    url.searchParams.append("pagina", pagina.toString());
    url.searchParams.append("itensPorPagina", itensPorPagina.toString());
    if (siglaTribunal) {
      url.searchParams.append("siglaTribunal", siglaTribunal);
    }

    // Timeout handled manually to avoid hanging connections
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Erro API DJEN: ${response.status} ${response.statusText}`);
    }

    const data: DjenResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch DJEN API", error);
    return null;
  }
}
