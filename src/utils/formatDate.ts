/**
 * Formata uma data ISO (YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss) para o padrão brasileiro DD/MM/AAAA.
 * Retorna "Não informado" se a data for inválida ou ausente.
 */
export function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return 'Não informado';

  try {
    // Trata formatos: "2026-05-22", "22/05/2026", "22/05/2026 00:00:00"
    let normalized = dateStr.trim();

    // Já está no formato DD/MM/AAAA
    if (/^\d{2}\/\d{2}\/\d{4}/.test(normalized)) {
      return normalized.slice(0, 10);
    }

    // Formato YYYY-MM-DD ou YYYY-MM-DDTHH:mm
    if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
      const [year, month, day] = normalized.slice(0, 10).split('-');
      return `${day}/${month}/${year}`;
    }

    // Fallback: tenta parsear diretamente
    const date = new Date(normalized);
    if (isNaN(date.getTime())) return 'Não informado';

    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return 'Não informado';
  }
}

/**
 * Formata data e hora para o padrão brasileiro DD/MM/AAAA HH:mm.
 */
export function formatDateTimeBR(dateStr?: string | null): string {
  if (!dateStr) return 'Não informado';

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return formatDateBR(dateStr);

    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Não informado';
  }
}
