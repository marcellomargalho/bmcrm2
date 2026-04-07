export type ProcessStatus = 'Em Andamento' | 'Urgente' | 'Arquivado' | 'Suspenso' | 'Audiência Designada' | 'Petição Protocolada';

export interface Process {
  id: string;
  user_id?: string;
  client_id?: string;
  number: string;
  clientName: string;
  clientType: 'PF' | 'PJ';
  status: ProcessStatus;
  protocolDate: string;
  court: string;
  comarca?: string;
  vara?: string;
  autor?: string;
  reu?: string;
  area: string;
  type: string;
  value?: number;
  created_at?: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  cpf_cnpj: string;
  email: string;
  phone: string;
  status: 'Ativo' | 'Inativo' | 'Pendente';
  process_count: number;
  avatar?: string;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'Audiência' | 'Prazo' | 'Reunião';
  client: string;
  color: string;
  description?: string;
}

export interface DocumentTemplate {
  id: string;
  title: string;
  description?: string;
  category: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  user_id: string;
  created_at: string;
}
