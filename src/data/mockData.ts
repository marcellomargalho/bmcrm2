import { Process, Client, CalendarEvent } from '@/types';

export const mockClients: Client[] = [
  {
    id: '1',
    user_id: 'mock-user',
    name: 'Arthur Pendragon Silva',
    cpf_cnpj: '123.456.789-00',
    email: 'arthur.silva@email.com',
    phone: '(11) 91234-5678',
    created_at: '2021',
    status: 'Ativo',
    process_count: 4,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAQ_UUU_HXTOXvniSjswEP6hkWy7AbRyryj1YuKT-A3VoJMaapdeg5gbWRjV-yEhxreOQma3tah2kezvcpH1snIAsl-MWqEx-mfogNfgn5kS9TAco8uMP4jWGHKPGO_qvViDgL8mzyX3DL4k1Xpmjah2hoz042SmM269avWAsRR5exkrSIgl3VW3CizfBUpJJ8wXGHEWVLFpwg7DxuXl_NPTGPB4eo6EQXOfaIG3Qk60zfKJhp5elhmHc0hCGEGB1wIxmnEjxErr8-1'
  },
  {
    id: '2',
    user_id: 'mock-user',
    name: 'Morgana Le Fay Cavalcanti',
    cpf_cnpj: '456.789.012-88',
    email: 'morgana.fay@email.com',
    phone: '(11) 98765-4321',
    created_at: '2022',
    status: 'Ativo',
    process_count: 2,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA8C-s27kejzk65Rkij2g4nk7ITQ0WntyYWHThT9tLtZgYyGTe65H60aIG0bCZlTr8YADaHz3q6NgESz-xZoKgRP8NbbcMMAnbNYe70XznUytsGaFfC0ijl6-iDmgp1B0290QzuNwgDnu3j3Q5Z073HoD-Pem6Cp840qnOaFEQVRWPfrMz4v5WDzUGOAfxFWVgFjx_biLLxFjPzhBGG4iz6SHj6ZlEA36hLjvHv_cPteoTGK2iMpB13tQ1Qjwr5psIIBCjns6U6ybN_'
  },
  {
    id: '3',
    user_id: 'mock-user',
    name: 'Merlin Ambrosius Oliveira',
    cpf_cnpj: '789.012.345-11',
    email: 'merlin.oliveira@email.com',
    phone: '(11) 95555-4444',
    created_at: '2020',
    status: 'Pendente',
    process_count: 1,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDzIbBwfDTLM209JotlBnI-VciLE2f-SkS2hbGy4y2o6GKZMjOgg8iKIHceIteFYjBN37WgL1T0G9m1JLqVIyrwhKpnwPq9okpUPJRcModyU_bWS57b5q2a1nqhkVLNR-NJXi_KQkSvx_yK2xxwRDW9MTYJiaTS_DfFz4myrZyEDFWYMWjt2KB9weGm_JuM4ZKzRWdIVW9NuVqE6m737l3g1uOQpbPq11VlPIkClbbwQQxZ-Mv0HOxZhRuCsCFNgflis62pnudxlAUs'
  }
];

export const mockProcesses: Process[] = [
  {
    id: '1',
    number: '1023456-78.2023.8.26.0100',
    clientName: 'Arthur Pendragon Silva',
    clientType: 'PF',
    status: 'Em Andamento',
    protocolDate: '14 Jan 2024',
    court: 'TJSP',
    area: 'Cível',
    type: 'Indenizatória',
    value: 150000
  },
  {
    id: '2',
    number: '0087122-45.2023.5.02.0001',
    clientName: 'Morgana Le Fay Cavalcanti',
    clientType: 'PF',
    status: 'Urgente',
    protocolDate: '22 Dez 2023',
    court: 'TRT2',
    area: 'Trabalhista',
    type: 'Rescisão',
    value: 45000
  },
  {
    id: '3',
    number: '1100983-12.2024.8.26.0100',
    clientName: 'Merlin Ambrosius Oliveira',
    clientType: 'PF',
    status: 'Arquivado',
    protocolDate: '02 Fev 2024',
    court: 'TJSP',
    area: 'Família',
    type: 'Divórcio',
    value: 820000
  },
  {
    id: '4',
    number: '5002134-90.2023.4.03.6100',
    clientName: 'Arthur Pendragon Silva',
    clientType: 'PF',
    status: 'Em Andamento',
    protocolDate: '10 Out 2023',
    court: 'JFSP',
    area: 'Tributário',
    type: 'Execução',
    value: 0
  }
];

export const mockEvents: CalendarEvent[] = [
  { id: '1', title: 'Audiência de Instrução', time: '14:00', date: '2024-03-24', type: 'Audiência', client: 'Arthur Pendragon Silva', color: 'bg-secondary' },
  { id: '2', title: 'Prazo: Recurso Especial', time: '23:59', date: '2024-03-26', type: 'Prazo', client: 'Morgana Le Fay Cavalcanti', color: 'bg-error' },
  { id: '3', title: 'Reunião: Novos Honorários', time: '10:30', date: '2024-03-24', type: 'Reunião', client: 'Merlin Ambrosius Oliveira', color: 'bg-primary' },
];

