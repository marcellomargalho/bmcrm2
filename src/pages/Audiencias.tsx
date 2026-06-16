import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, Clock, Plus, Loader2, AlertCircle, RefreshCw, Trash2, Edit2,
  X, Check, FileText, CheckCircle2, AlertTriangle, Upload, Eye, FileCheck,
  Search, Filter, ExternalLink, Mail, ShieldAlert, FileSpreadsheet, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface Hearing {
  id: string;
  process_id: string | null;
  process_number: string;
  comarca: string | null;
  client_name: string;
  subject: string | null;
  hearing_type: string;
  custom_hearing_type: string | null;
  hearing_date: string;
  hearing_time: string;
  link: string | null;
  observations: string | null;
  notification_emails?: string | null;
  status: 'cadastrada' | 'notificacao_1dia_enviada' | 'notificacao_15min_enviada' | 'concluida' | 'cancelada';
  created_at?: string;
  updated_at?: string;
}

interface ProcessOption {
  id: string;
  number: string;
  comarca: string | null;
  client_id: string;
  clients: { name: string } | null;
  type: string | null;
}

interface HearingLog {
  id: string;
  hearing_id: string;
  notification_type: '1_day_before' | '15_minutes_before';
  recipient: string;
  status: 'success' | 'error';
  error_message: string | null;
  sent_at: string;
  hearings?: {
    process_number: string;
    client_name: string;
  } | null;
}

const HEARING_TYPES = ['Conciliação', 'Instrução e Julgamento', 'Outro'] as const;

const STATUS_LABELS: Record<string, string> = {
  cadastrada: 'Agendada',
  notificacao_1dia_enviada: 'Alerta 1 Dia Enviado',
  notificacao_15min_enviada: 'Alerta 15 Min Enviado',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

const STATUS_STYLES: Record<string, string> = {
  cadastrada: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  notificacao_1dia_enviada: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  notificacao_15min_enviada: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  concluida: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  cancelada: 'bg-red-500/10 text-red-400 border-red-500/20',
};

// ─── Helpers Dinâmicos CDN ───────────────────────────────────────────────────

const loadPdfJs = async () => {
  if ((window as any).pdfjsLib) return (window as any).pdfjsLib;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve((window as any).pdfjsLib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const loadXlsx = async () => {
  if ((window as any).XLSX) return (window as any).XLSX;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.onload = () => resolve((window as any).XLSX);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export function Audiencias() {
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [logs, setLogs] = useState<HearingLog[]>([]);
  const [processes, setProcesses] = useState<ProcessOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'import' | 'logs'>('list');

  // Filtros
  const [filterSearch, setFilterSearch] = useState('');
  const [filterComarca, setFilterComarca] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Modais e Cadastros
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHearing, setEditingHearing] = useState<Hearing | null>(null);
  const [selectedProcessId, setSelectedProcessId] = useState('');
  const [formData, setFormData] = useState({
    process_number: '',
    comarca: '',
    client_name: '',
    subject: '',
    hearing_type: 'Conciliação',
    custom_hearing_type: '',
    hearing_date: '',
    hearing_time: '',
    link: '',
    observations: '',
    notification_emails: '',
    status: 'cadastrada' as Hearing['status'],
  });

  const [submittingHearing, setSubmittingHearing] = useState(false);
  const [submittingImport, setSubmittingImport] = useState(false);

  // Importações
  const [csvText, setCsvText] = useState('');
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [pdfExtracting, setPdfExtracting] = useState(false);
  const [pdfRawText, setPdfRawText] = useState('');
  const [isPdfReviewOpen, setIsPdfReviewOpen] = useState(false);

  // Email Config
  const [emailConfig, setEmailConfig] = useState<{ senior_email: string; team_emails: string[] }>({
    senior_email: 'brendamargalho.adv@gmail.com',
    team_emails: [],
  });
  const [showConfig, setShowConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [newTeamEmail, setNewTeamEmail] = useState('');

  const fetchHearingsAndLogs = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: hData }, { data: lData }, { data: pData }, { data: settings }] = await Promise.all([
        supabase.from('hearings').select('*').order('hearing_date', { ascending: true }),
        supabase.from('hearing_logs').select('*, hearings(process_number, client_name)').order('sent_at', { ascending: false }).limit(50),
        supabase.from('processes').select('id, number, comarca, client_id, type, clients(name)').neq('status', 'Arquivado'),
        supabase.from('email_notification_settings').select('senior_email, team_emails').limit(1).maybeSingle(),
      ]);

      setHearings(hData || []);
      setLogs((lData as any[]) || []);
      setProcesses(pData || []);
      if (settings) {
        setEmailConfig({
          senior_email: settings.senior_email || 'brendamargalho.adv@gmail.com',
          team_emails: settings.team_emails || [],
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao buscar dados de audiências.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHearingsAndLogs();
  }, [fetchHearingsAndLogs]);

  // Autofill form if process selected
  useEffect(() => {
    if (selectedProcessId) {
      const proc = processes.find(p => p.id === selectedProcessId);
      if (proc) {
        setFormData(prev => ({
          ...prev,
          process_number: proc.number,
          comarca: proc.comarca || '',
          client_name: proc.clients?.name || '',
          subject: proc.type || '',
        }));
      }
    }
  }, [selectedProcessId, processes]);

  const handleOpenCreateModal = () => {
    setEditingHearing(null);
    setSelectedProcessId('');
    setFormData({
      process_number: '',
      comarca: '',
      client_name: '',
      subject: '',
      hearing_type: 'Conciliação',
      custom_hearing_type: '',
      hearing_date: '',
      hearing_time: '',
      link: '',
      observations: '',
      notification_emails: emailConfig.senior_email || '',
      status: 'cadastrada',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (h: Hearing) => {
    setEditingHearing(h);
    setSelectedProcessId(h.process_id || '');
    setFormData({
      process_number: h.process_number,
      comarca: h.comarca || '',
      client_name: h.client_name,
      subject: h.subject || '',
      hearing_type: h.hearing_type,
      custom_hearing_type: h.custom_hearing_type || '',
      hearing_date: h.hearing_date,
      hearing_time: h.hearing_time.slice(0, 5),
      link: h.link || '',
      observations: h.observations || '',
      notification_emails: h.notification_emails || '',
      status: h.status,
    });
    setIsModalOpen(true);
  };

  // ─── Submit Manual ──────────────────────────────────────────────────────────

  const handleSubmitHearing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingHearing) return;

    if (!formData.process_number || !formData.client_name || !formData.hearing_date || !formData.hearing_time) {
      toast.error('Preencha todos os campos obrigatórios (*).');
      return;
    }

    setSubmittingHearing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão inválida. Faça login novamente.');

      const payload = {
        user_id: user.id,
        process_id: selectedProcessId || null,
        process_number: formData.process_number,
        comarca: formData.comarca || null,
        client_name: formData.client_name,
        subject: formData.subject || null,
        hearing_type: formData.hearing_type,
        custom_hearing_type: formData.hearing_type === 'Outro' ? formData.custom_hearing_type : null,
        hearing_date: formData.hearing_date,
        hearing_time: formData.hearing_time,
        link: formData.link || null,
        observations: formData.observations || null,
        notification_emails: formData.notification_emails || null,
        status: formData.status,
      };

      if (editingHearing) {
        const { error } = await supabase
          .from('hearings')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingHearing.id);
        if (error) throw error;
        toast.success('Audiência atualizada com sucesso!');
      } else {
        const { error } = await supabase.from('hearings').insert([payload]);
        if (error) throw error;
        toast.success('Audiência cadastrada com sucesso!');
      }

      setIsModalOpen(false);
      setIsPdfReviewOpen(false); // Just in case it's called from PDF review
      fetchHearingsAndLogs();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao salvar audiência.');
    } finally {
      setSubmittingHearing(false);
    }
  };

  // ─── Ações Simples ──────────────────────────────────────────────────────────

  const handleUpdateStatus = async (id: string, newStatus: Hearing['status']) => {
    try {
      const { error } = await supabase
        .from('hearings')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast.success(`Audiência marcada como ${STATUS_LABELS[newStatus]}!`);
      fetchHearingsAndLogs();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar status.');
    }
  };

  const handleDeleteHearing = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta audiência? Isso apagará também os logs relacionados.')) return;
    try {
      const { error } = await supabase.from('hearings').delete().eq('id', id);
      if (error) throw error;
      toast.success('Audiência excluída com sucesso.');
      fetchHearingsAndLogs();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir audiência.');
    }
  };

  // ─── Importar CSV / Planilha ─────────────────────────────────────────────────

  const handleParseCsv = () => {
    if (!csvText.trim()) {
      toast.error('Cole o conteúdo CSV ou carregue um arquivo.');
      return;
    }

    try {
      const lines = csvText.split('\n');
      const header = lines[0].split(/[;,]/).map(h => h.trim().toLowerCase().replace(/["']/g, ''));
      
      const parsed: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = lines[i].split(/[;,]/).map(c => c.trim().replace(/["']/g, ''));
        
        const rowObj: any = {};
        header.forEach((h, index) => {
          rowObj[h] = cols[index] || '';
        });
        parsed.push(rowObj);
      }

      // Mapeamento para visualização e salvamento
      const mapped = parsed.map(row => {
        // Encontra colunas por similaridade
        const numProc = row['processo'] || row['número do processo'] || row['numero do processo'] || '';
        const comarca = row['comarca'] || row['foro'] || '';
        const cliente = row['cliente'] || row['nome do cliente'] || '';
        const assunto = row['assunto'] || '';
        const tipo = row['tipo de audiência'] || row['tipo de audiencia'] || row['tipo'] || 'Conciliação';
        const data = row['data'] || '';
        const hora = row['horário'] || row['horario'] || row['hora'] || '';
        const link = row['link'] || row['sala virtual'] || '';
        const obs = row['observações'] || row['observacoes'] || '';

        // Tenta achar processo pelo número
        const matchedProc = processes.find(p => 
          p.number.replace(/\D/g, '') === numProc.replace(/\D/g, '')
        );

        return {
          process_id: matchedProc?.id || null,
          process_number: numProc,
          comarca: comarca || matchedProc?.comarca || '',
          client_name: cliente || matchedProc?.clients?.name || '',
          subject: assunto || matchedProc?.type || '',
          hearing_type: HEARING_TYPES.includes(tipo as any) ? tipo : 'Outro',
          custom_hearing_type: !HEARING_TYPES.includes(tipo as any) ? tipo : '',
          hearing_date: parseCsvDate(data),
          hearing_time: hora,
          link,
          observations: obs,
        };
      });

      setImportPreview(mapped);
      toast.success(`${mapped.length} linhas importadas para pré-visualização.`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao analisar o CSV. Verifique a formatação.');
    }
  };

  const parseCsvDate = (dStr: string) => {
    if (!dStr) return '';
    // Converte de DD/MM/AAAA para AAAA-MM-DD
    const match = dStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
      return `${match[3]}-${match[2]}-${match[1]}`;
    }
    return dStr;
  };

  const handleUploadExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const XLSX = await loadXlsx();
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const csv = XLSX.utils.sheet_to_csv(worksheet);
          setCsvText(csv);
          toast.success('Arquivo Excel processado. Clique em "Visualizar Importação".');
        } catch (err) {
          console.error(err);
          toast.error('Erro ao ler formato Excel.');
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error(err);
      toast.error('Erro no upload do arquivo.');
    }
  };

  const handleSaveImport = async () => {
    if (importPreview.length === 0) return;
    if (submittingImport) return;

    setSubmittingImport(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão inválida.');

      const inserts = importPreview.map(item => ({
        user_id: user.id,
        process_id: item.process_id,
        process_number: item.process_number,
        comarca: item.comarca || null,
        client_name: item.client_name,
        subject: item.subject || null,
        hearing_type: item.hearing_type,
        custom_hearing_type: item.custom_hearing_type || null,
        hearing_date: item.hearing_date,
        hearing_time: item.hearing_time,
        link: item.link || null,
        observations: item.observations || null,
        status: 'cadastrada',
      }));

      const { error } = await supabase.from('hearings').insert(inserts);
      if (error) throw error;

      toast.success(`${inserts.length} audiências salvas com sucesso!`);
      setImportPreview([]);
      setCsvText('');
      setActiveTab('list');
      fetchHearingsAndLogs();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao salvar importações.');
    } finally {
      setSubmittingImport(false);
    }
  };

  // ─── Importar PDF (OCR / Extrator Regex) ───────────────────────────────────

  const handleUploadPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPdfExtracting(true);
    try {
      const pdfjs = await loadPdfJs();
      const reader = new FileReader();

      reader.onload = async (evt) => {
        try {
          const typedarray = new Uint8Array(evt.target?.result as ArrayBuffer);
          const pdf = await pdfjs.getDocument(typedarray).promise;
          let fullText = '';

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + '\n';
          }

          setPdfRawText(fullText);
          extractDataFromPdfText(fullText);
        } catch (err) {
          console.error(err);
          toast.error('Erro ao extrair texto do PDF.');
          setPdfExtracting(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error(err);
      toast.error('Erro no processamento do arquivo.');
      setPdfExtracting(false);
    }
  };

  const extractDataFromPdfText = (text: string) => {
    // 1. Número de Processo (CNJ)
    const procRegex = /(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/g;
    const procMatch = text.match(procRegex);
    const processNumber = procMatch ? procMatch[0] : '';

    // 2. Data
    const dateRegex = /\b(\d{2})[\/\.-](\d{2})[\/\.-](\d{4})\b/;
    const dateMatch = text.match(dateRegex);
    let hearingDate = '';
    if (dateMatch) {
      hearingDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
    }

    // 3. Horário
    const timeRegex = /\b(\d{2})[h:](\d{2})\b/;
    const timeMatch = text.match(timeRegex);
    let hearingTime = '';
    if (timeMatch) {
      hearingTime = `${timeMatch[1]}:${timeMatch[2]}`;
    }

    // 4. Tipo de Audiência
    let hearingType = 'Conciliação';
    let customHearingType = '';
    if (text.toLowerCase().includes('instrução') || text.toLowerCase().includes('julgamento')) {
      hearingType = 'Instrução e Julgamento';
    } else if (text.toLowerCase().includes('mediação') || text.toLowerCase().includes('mediacao')) {
      hearingType = 'Outro';
      customHearingType = 'Mediação';
    }

    // 5. Link
    const linkRegex = /(https?:\/\/(?:teams\.microsoft\.com|zoom\.us|meet\.google\.com|webex\.com|jte\.jus\.br)[^\s"'>]*)/i;
    const linkMatch = text.match(linkRegex);
    const link = linkMatch ? linkMatch[0] : '';

    // 6. Comarca
    const comarcaRegex = /comarca\s+de\s+([A-Za-zÀ-ú\s]+?)(?:\s+-\s+|\n|\r|\.|,|$)/i;
    const comarcaMatch = text.match(comarcaRegex);
    const comarca = comarcaMatch ? comarcaMatch[1].trim() : '';

    // Tenta obter dados vinculados se encontrou o processo
    const matchedProc = processNumber 
      ? processes.find(p => p.number.replace(/\D/g, '') === processNumber.replace(/\D/g, ''))
      : null;

    setFormData({
      process_number: processNumber || matchedProc?.number || '',
      comarca: comarca || matchedProc?.comarca || '',
      client_name: matchedProc?.clients?.name || '',
      subject: matchedProc?.type || '',
      hearing_type: hearingType,
      custom_hearing_type: customHearingType,
      hearing_date: hearingDate,
      hearing_time: hearingTime,
      link,
      observations: 'Dados extraídos automaticamente via leitura de PDF.',
      notification_emails: emailConfig.senior_email || '',
      status: 'cadastrada',
    });

    setSelectedProcessId(matchedProc?.id || '');
    setPdfExtracting(false);
    setIsPdfReviewOpen(true);
    toast.success('Leitura concluída! Por favor, revise as informações.');
  };

  // ─── Configurações de E-mail ────────────────────────────────────────────────

  const handleAddTeamEmail = () => {
    if (!newTeamEmail.trim()) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newTeamEmail)) {
      toast.error('Digite um e-mail válido.');
      return;
    }
    if (emailConfig.team_emails.includes(newTeamEmail.trim())) {
      toast.error('E-mail já adicionado.');
      return;
    }
    setEmailConfig(prev => ({
      ...prev,
      team_emails: [...prev.team_emails, newTeamEmail.trim()],
    }));
    setNewTeamEmail('');
  };

  const handleRemoveTeamEmail = (email: string) => {
    setEmailConfig(prev => ({
      ...prev,
      team_emails: prev.team_emails.filter(e => e !== email),
    }));
  };

  const handleSaveEmailConfig = async () => {
    setSavingConfig(true);
    try {
      const { data: current, error: fetchError } = await supabase.from('email_notification_settings').select('id').limit(1).maybeSingle();
      if (fetchError) throw fetchError;
      
      const payload = {
        senior_email: emailConfig.senior_email,
        team_emails: emailConfig.team_emails,
        updated_at: new Date().toISOString(),
      };

      let saveError;
      if (current?.id) {
        const { error: updateError } = await supabase.from('email_notification_settings').update(payload).eq('id', current.id);
        saveError = updateError;
      } else {
        const { error: insertError } = await supabase.from('email_notification_settings').insert([payload]);
        saveError = insertError;
      }

      if (saveError) throw saveError;

      toast.success('Configurações de e-mail salvas!');
      setShowConfig(false);
    } catch (err: any) {
      console.error(err);
      toast.error(`Erro ao salvar configurações: ${err.message || String(err)}`);
    } finally {
      setSavingConfig(false);
    }
  };

  // ─── Filtros e Derivação de Dados ──────────────────────────────────────────

  const filteredHearings = hearings.filter(h => {
    const matchesSearch = filterSearch ? h.process_number.toLowerCase().includes(filterSearch.toLowerCase()) || h.client_name.toLowerCase().includes(filterSearch.toLowerCase()) : true;
    const matchesComarca = filterComarca ? h.comarca?.toLowerCase().includes(filterComarca.toLowerCase()) : true;
    const matchesClient = filterClient ? h.client_name.toLowerCase().includes(filterClient.toLowerCase()) : true;
    const matchesType = filterType ? h.hearing_type === filterType : true;
    const matchesStatus = filterStatus ? h.status === filterStatus : true;
    const matchesDate = filterDate ? h.hearing_date === filterDate : true;
    return matchesSearch && matchesComarca && matchesClient && matchesType && matchesStatus && matchesDate;
  });

  const stats = {
    total: hearings.length,
    agendadas: hearings.filter(h => h.status === 'cadastrada' || h.status.startsWith('notificacao')).length,
    concluidas: hearings.filter(h => h.status === 'concluida').length,
    canceladas: hearings.filter(h => h.status === 'cancelada').length,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface">Controle de Audiências</h2>
            <p className="text-on-surface-variant text-sm">Gestão de audiências, notificações automáticas por e-mail e importações</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowConfig(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/15 text-on-surface rounded-xl transition-all font-bold text-xs"
          >
            <Mail className="w-4 h-4 text-secondary" /> Configurar Destinatários
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-on-secondary hover:opacity-90 rounded-xl transition-all font-bold text-xs shadow-lg shadow-secondary/15"
          >
            <Plus className="w-4 h-4" /> Nova Audiência
          </button>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex bg-surface-container-low p-1 rounded-2xl border border-outline-variant/10 gap-1">
        <button
          onClick={() => setActiveTab('list')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all',
            activeTab === 'list'
              ? 'bg-secondary text-on-secondary shadow-lg shadow-secondary/20'
              : 'text-outline hover:text-on-surface hover:bg-surface-container-high'
          )}
        >
          <Calendar className="w-4 h-4" /> Lista de Audiências
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all',
            activeTab === 'import'
              ? 'bg-secondary text-on-secondary shadow-lg shadow-secondary/20'
              : 'text-outline hover:text-on-surface hover:bg-surface-container-high'
          )}
        >
          <Upload className="w-4 h-4" /> Importar PDF / Planilha
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all',
            activeTab === 'logs'
              ? 'bg-secondary text-on-secondary shadow-lg shadow-secondary/20'
              : 'text-outline hover:text-on-surface hover:bg-surface-container-high'
          )}
        >
          <Mail className="w-4 h-4" /> Logs de Envio
        </button>
      </div>

      {/* ─── TAB 1: LISTAGEM ──────────────────────────────────────────────────── */}
      {activeTab === 'list' && (
        <div className="space-y-6">
          
          {/* Métricas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Cadastradas', value: stats.total, color: 'text-secondary' },
              { label: 'Ativas / Agendadas', value: stats.agendadas, color: 'text-blue-400' },
              { label: 'Realizadas / Concluídas', value: stats.concluidas, color: 'text-emerald-400' },
              { label: 'Canceladas', value: stats.canceladas, color: 'text-red-400' },
            ].map(s => (
              <div key={s.label} className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/10">
                <p className="text-[10px] text-outline uppercase tracking-widest font-semibold">{s.label}</p>
                <h3 className={cn('text-3xl font-headline font-black mt-2', s.color)}>{s.value}</h3>
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/10 pb-3">
              <span className="text-xs font-bold text-on-surface flex items-center gap-2">
                <Filter className="w-4 h-4 text-secondary" /> Filtrar Audiências
              </span>
              {(filterSearch || filterComarca || filterClient || filterType || filterStatus || filterDate) && (
                <button
                  onClick={() => {
                    setFilterSearch('');
                    setFilterComarca('');
                    setFilterClient('');
                    setFilterType('');
                    setFilterStatus('');
                    setFilterDate('');
                  }}
                  className="text-[10px] text-red-400 font-bold uppercase hover:underline"
                >
                  Limpar Filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-outline font-black uppercase">Busca Livre</label>
                <input
                  type="text"
                  value={filterSearch}
                  onChange={e => setFilterSearch(e.target.value)}
                  placeholder="Nº processo ou cliente..."
                  className="w-full bg-surface-container-high border border-outline-variant/10 rounded-xl px-3 py-2 text-xs text-on-surface outline-none focus:border-secondary/40"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-outline font-black uppercase">Data</label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  className="w-full bg-surface-container-high border border-outline-variant/10 rounded-xl px-3 py-2 text-xs text-on-surface outline-none focus:border-secondary/40"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-outline font-black uppercase">Comarca</label>
                <input
                  type="text"
                  value={filterComarca}
                  onChange={e => setFilterComarca(e.target.value)}
                  placeholder="Ex: São Paulo"
                  className="w-full bg-surface-container-high border border-outline-variant/10 rounded-xl px-3 py-2 text-xs text-on-surface outline-none focus:border-secondary/40"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-outline font-black uppercase">Cliente</label>
                <input
                  type="text"
                  value={filterClient}
                  onChange={e => setFilterClient(e.target.value)}
                  placeholder="Nome do cliente"
                  className="w-full bg-surface-container-high border border-outline-variant/10 rounded-xl px-3 py-2 text-xs text-on-surface outline-none focus:border-secondary/40"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-outline font-black uppercase">Tipo</label>
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className="w-full bg-surface-container-high border border-outline-variant/10 rounded-xl px-3 py-2 text-xs text-on-surface outline-none focus:border-secondary/40"
                >
                  <option value="">Todos</option>
                  <option value="Conciliação">Conciliação</option>
                  <option value="Instrução e Julgamento">Instrução e Julgamento</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-outline font-black uppercase">Status Notificação</label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full bg-surface-container-high border border-outline-variant/10 rounded-xl px-3 py-2 text-xs text-on-surface outline-none focus:border-secondary/40"
                >
                  <option value="">Todos</option>
                  <option value="cadastrada">Agendada (Sem envio)</option>
                  <option value="notificacao_1dia_enviada">1 Dia Enviado</option>
                  <option value="notificacao_15min_enviada">15 Min Enviado</option>
                  <option value="concluida">Concluída</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
            </div>
          </div>

          {/* Listagem */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-secondary" />
              <p className="text-sm text-outline animate-pulse">Buscando audiências...</p>
            </div>
          ) : filteredHearings.length === 0 ? (
            <div className="text-center py-20 bg-surface-container-low/30 rounded-3xl border border-dashed border-outline-variant/20">
              <Calendar className="w-12 h-12 text-outline mx-auto mb-4 opacity-50" />
              <p className="text-sm font-bold text-outline uppercase tracking-widest">Nenhuma audiência cadastrada.</p>
              <p className="text-xs text-outline/80 mt-1">Cadastre manualmente ou importe de planilhas/PDF.</p>
            </div>
          ) : (
            <div className="bg-surface-container-low rounded-3xl border border-outline-variant/10 overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-outline-variant/10 bg-surface-container-high/40 text-outline font-black uppercase tracking-wider">
                      <th className="px-6 py-4">Data / Hora</th>
                      <th className="px-6 py-4">Processo</th>
                      <th className="px-6 py-4">Cliente</th>
                      <th className="px-6 py-4">Comarca / Vara</th>
                      <th className="px-6 py-4">Tipo</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {filteredHearings.map(h => {
                      const typeLabel = h.hearing_type === 'Outro' ? h.custom_hearing_type || 'Outro' : h.hearing_type;
                      return (
                        <tr key={h.id} className="hover:bg-surface-container-high/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="font-bold text-on-surface">{new Date(h.hearing_date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                            <p className="text-outline font-medium flex items-center gap-1 mt-0.5"><Clock className="w-3.5 h-3.5 text-secondary" /> {h.hearing_time.slice(0,5)}</p>
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-secondary">{h.process_number}</td>
                          <td className="px-6 py-4 font-bold text-on-surface">{h.client_name}</td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-on-surface">{h.comarca || '—'}</p>
                            {h.subject && <p className="text-[10px] text-outline truncate max-w-[200px] mt-0.5">{h.subject}</p>}
                          </td>
                          <td className="px-6 py-4">
                            <span className="bg-secondary/10 text-secondary border border-secondary/15 px-2.5 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider">{typeLabel}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn('px-2.5 py-0.5 rounded-md border font-bold text-[10px] uppercase tracking-wider', STATUS_STYLES[h.status])}>
                              {STATUS_LABELS[h.status]}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {h.link && (
                                <a
                                  href={h.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 hover:bg-secondary/15 text-secondary rounded-lg transition-colors"
                                  title="Acessar sala da audiência"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                              {h.status !== 'concluida' && h.status !== 'cancelada' && (
                                <>
                                  <button
                                    onClick={() => handleUpdateStatus(h.id, 'concluida')}
                                    className="p-1.5 hover:bg-emerald-500/15 text-emerald-400 rounded-lg transition-colors"
                                    title="Marcar como Concluída"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(h.id, 'cancelada')}
                                    className="p-1.5 hover:bg-red-500/15 text-red-400 rounded-lg transition-colors"
                                    title="Cancelar Audiência"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleOpenEditModal(h)}
                                className="p-1.5 hover:bg-surface-container-highest text-outline hover:text-on-surface rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteHearing(h.id)}
                                className="p-1.5 hover:bg-red-500/15 text-outline hover:text-red-400 rounded-lg transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: IMPORTAÇÃO ────────────────────────────────────────────────── */}
      {activeTab === 'import' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Caixa 1: Upload PDF */}
          <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 space-y-5">
            <div>
              <h4 className="font-headline font-bold text-on-surface text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-secondary" /> Leitura Inteligente de PDF
              </h4>
              <p className="text-xs text-outline mt-1">Carregue o PDF de intimação ou agendamento judicial. O sistema tentará ler e preencher os dados.</p>
            </div>

            <div className="border-2 border-dashed border-outline-variant/20 rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-3 bg-surface-container-high/20 hover:bg-surface-container-high/40 transition-colors relative">
              <input
                type="file"
                accept=".pdf"
                onChange={handleUploadPdf}
                disabled={pdfExtracting}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {pdfExtracting ? (
                <>
                  <Loader2 className="w-8 h-8 animate-spin text-secondary" />
                  <p className="text-xs font-bold text-on-surface animate-pulse">Extraindo informações do PDF...</p>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-outline opacity-60" />
                  <p className="text-xs font-bold text-on-surface">Arraste ou selecione o PDF da intimação</p>
                  <p className="text-[10px] text-outline font-medium">Formatos suportados: PDF nativo (com texto selecionável)</p>
                </>
              )}
            </div>
          </div>

          {/* Caixa 2: Importar Excel/CSV */}
          <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 space-y-5">
            <div>
              <h4 className="font-headline font-bold text-on-surface text-base flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-secondary" /> Importação de Planilha Excel (CSV)
              </h4>
              <p className="text-xs text-outline mt-1">Carregue um arquivo Excel (.xlsx, .xls) ou cole texto formatado em CSV/TSV.</p>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-[10px] text-outline font-black uppercase mb-1.5 block">Arquivo de Tabela</label>
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleUploadExcel}
                  className="w-full bg-surface-container-high border border-outline-variant/10 rounded-xl px-3 py-2 text-xs text-on-surface file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-secondary file:text-on-secondary file:cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-outline font-black uppercase flex justify-between">
                <span>Ou Cole os Dados em CSV</span>
                <span className="text-[9px] text-outline font-normal">Separadores: vírgula (,) ou ponto e vírgula (;)</span>
              </label>
              <textarea
                rows={4}
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                placeholder="processo,cliente,comarca,tipo de audiência,data,horário,link,observações&#10;0001234-56.2024,João Silva,Campinas,Conciliação,25/06/2026,14:00,https://...,Levar documentos"
                className="w-full bg-surface-container-high border border-outline-variant/15 rounded-xl px-4 py-3 text-xs text-on-surface font-mono outline-none resize-none focus:border-secondary/40"
              />
              <button
                onClick={handleParseCsv}
                className="w-full py-2 bg-secondary/15 hover:bg-secondary/20 text-secondary border border-secondary/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
              >
                Visualizar Importação
              </button>
            </div>
          </div>

          {/* Tabela de Pré-visualização da Importação */}
          {importPreview.length > 0 && (
            <div className="lg:col-span-2 bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 space-y-4">
              <div className="flex items-center justify-between border-b border-outline-variant/10 pb-3">
                <div>
                  <h4 className="font-headline font-bold text-on-surface text-sm">Pré-visualização da Importação</h4>
                  <p className="text-[10px] text-outline">Verifique os dados antes de salvar definitivamente no CRM.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setImportPreview([])}
                    className="px-4 py-2 border border-outline-variant/15 text-outline hover:text-on-surface rounded-xl text-xs font-bold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveImport}
                    disabled={submittingImport}
                    className="px-4 py-2 bg-secondary text-on-secondary hover:opacity-90 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-secondary/10 flex items-center gap-2 disabled:opacity-50"
                  >
                    {submittingImport && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Salvar {importPreview.length} Audiências
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-96 custom-scrollbar">
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead>
                    <tr className="border-b border-outline-variant/10 bg-surface-container-high/40 text-outline font-black uppercase tracking-wider">
                      <th className="px-4 py-3">Processo</th>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Comarca</th>
                      <th className="px-4 py-3">Assunto</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Data/Hora</th>
                      <th className="px-4 py-3">Status Vínculo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10 font-medium text-on-surface-variant">
                    {importPreview.map((item, idx) => (
                      <tr key={idx} className="hover:bg-surface-container-high/20">
                        <td className="px-4 py-3 font-mono text-secondary">{item.process_number}</td>
                        <td className="px-4 py-3">{item.client_name}</td>
                        <td className="px-4 py-3">{item.comarca || '—'}</td>
                        <td className="px-4 py-3 truncate max-w-[150px]">{item.subject || '—'}</td>
                        <td className="px-4 py-3">{item.hearing_type === 'Outro' ? item.custom_hearing_type : item.hearing_type}</td>
                        <td className="px-4 py-3 font-bold text-on-surface">{item.hearing_date} · {item.hearing_time}</td>
                        <td className="px-4 py-3">
                          {item.process_id ? (
                            <span className="text-emerald-400 font-bold">✓ Processo Vinculado</span>
                          ) : (
                            <span className="text-amber-400">Novo Registro (Sem vínculo)</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: LOGS DE ENVIO ────────────────────────────────────────────── */}
      {activeTab === 'logs' && (
        <div className="space-y-6">
          <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 space-y-4">
            <div>
              <h4 className="font-headline font-bold text-on-surface text-base flex items-center gap-2">
                <Mail className="w-5 h-5 text-secondary" /> Histórico de Disparos de E-mail
              </h4>
              <p className="text-xs text-outline mt-1">Monitore as tentativas de envio das notificações automáticas de 1 dia e 15 minutos antes.</p>
            </div>

            {logs.length === 0 ? (
              <div className="text-center py-20 bg-surface-container-low/30 rounded-2xl border border-dashed border-outline-variant/20">
                <Mail className="w-10 h-10 text-outline mx-auto mb-3 opacity-50" />
                <p className="text-xs font-bold text-outline">Nenhum log de disparo registrado até o momento.</p>
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-outline-variant/10 bg-surface-container-high/40 text-outline font-black uppercase tracking-wider">
                      <th className="px-6 py-4">Data/Hora</th>
                      <th className="px-6 py-4">Processo</th>
                      <th className="px-6 py-4">Cliente</th>
                      <th className="px-6 py-4">Tipo Alerta</th>
                      <th className="px-6 py-4">Destinatários</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Retorno/Erro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {logs.map(l => (
                      <tr key={l.id} className="hover:bg-surface-container-high/20 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-outline">{new Date(l.sent_at).toLocaleString('pt-BR')}</td>
                        <td className="px-6 py-4 font-mono font-bold text-secondary">{l.hearings?.process_number || '—'}</td>
                        <td className="px-6 py-4 font-medium text-on-surface">{l.hearings?.client_name || '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-bold">
                          {l.notification_type === '1_day_before' ? '📅 1 Dia Antes' : '⚖️ 15 Min Antes'}
                        </td>
                        <td className="px-6 py-4 max-w-[200px] truncate" title={l.recipient}>{l.recipient}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            'px-2 py-0.5 rounded font-bold text-[9px] uppercase tracking-wider',
                            l.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                          )}>
                            {l.status === 'success' ? 'Sucesso' : 'Falha'}
                          </span>
                        </td>
                        <td className="px-6 py-4 max-w-[200px] truncate text-red-400 font-mono font-bold text-[10px]" title={l.error_message || ''}>
                          {l.error_message || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL DE CADASTRO MANUAL / EDIÇÃO ────────────────────────────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface-container w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-outline-variant/20 max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low shrink-0">
                <div>
                  <h3 className="font-headline font-bold text-lg text-on-surface">{editingHearing ? 'Editar Audiência' : 'Cadastrar Nova Audiência'}</h3>
                  <p className="text-[10px] text-outline uppercase tracking-wider font-bold mt-1">Preencha os campos obrigatórios (*)</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-surface-container-high rounded-full text-outline hover:text-on-surface transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitHearing} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
                
                {/* Vínculo de Processo */}
                {!editingHearing && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Vincular a Processo Registrado</label>
                    <select
                      value={selectedProcessId}
                      onChange={e => setSelectedProcessId(e.target.value)}
                      className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary focus:outline-none"
                    >
                      <option value="">Selecione um processo cadastrado no CRM (Opcional)</option>
                      {processes.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.number} — {p.clients?.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Grid básico */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Número do Processo *</label>
                    <input
                      type="text"
                      required
                      value={formData.process_number}
                      onChange={e => setFormData({ ...formData, process_number: e.target.value })}
                      placeholder="0000000-00.0000.0.00.0000"
                      className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary focus:outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Nome do Cliente *</label>
                    <input
                      type="text"
                      required
                      value={formData.client_name}
                      onChange={e => setFormData({ ...formData, client_name: e.target.value })}
                      placeholder="Nome do seu cliente"
                      className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Comarca</label>
                    <input
                      type="text"
                      value={formData.comarca}
                      onChange={e => setFormData({ ...formData, comarca: e.target.value })}
                      placeholder="Ex: Vara Cível de Americana"
                      className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Assunto do Processo</label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={e => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="Ex: Indenizatória por Dano Moral"
                      className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary focus:outline-none"
                    />
                  </div>
                </div>

                {/* Tipo e Custom Tipo */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Tipo de Audiência *</label>
                    <select
                      value={formData.hearing_type}
                      onChange={e => setFormData({ ...formData, hearing_type: e.target.value })}
                      className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary focus:outline-none"
                    >
                      <option value="Conciliação">Conciliação</option>
                      <option value="Instrução e Julgamento">Instrução e Julgamento</option>
                      <option value="Outro">Outro tipo...</option>
                    </select>
                  </div>
                  {formData.hearing_type === 'Outro' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Especifique o Tipo *</label>
                      <input
                        type="text"
                        required
                        value={formData.custom_hearing_type}
                        onChange={e => setFormData({ ...formData, custom_hearing_type: e.target.value })}
                        placeholder="Ex: Mediação / Justificação"
                        className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Data e Hora */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Data da Audiência *</label>
                    <input
                      type="date"
                      required
                      value={formData.hearing_date}
                      onChange={e => setFormData({ ...formData, hearing_date: e.target.value })}
                      className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Horário *</label>
                    <input
                      type="time"
                      required
                      value={formData.hearing_time}
                      onChange={e => setFormData({ ...formData, hearing_time: e.target.value })}
                      className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary focus:outline-none"
                    />
                  </div>
                </div>

                {/* Link */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Link da Audiência (Sala Virtual)</label>
                  <input
                    type="url"
                    value={formData.link}
                    onChange={e => setFormData({ ...formData, link: e.target.value })}
                    placeholder="https://teams.microsoft.com/..."
                    className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary focus:outline-none"
                  />
                </div>

                {/* Destinatários dos E-mails */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-wider">E-mails para Notificação (separados por vírgula)</label>
                  <input
                    type="text"
                    value={formData.notification_emails}
                    onChange={e => setFormData({ ...formData, notification_emails: e.target.value })}
                    placeholder="advogado@exemplo.com, estagiario@exemplo.com"
                    className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary focus:outline-none"
                  />
                  <p className="text-[9px] text-outline mt-0.5">Se deixado em branco, enviará para o e-mail sênior/equipe configurados globalmente.</p>
                </div>

                {/* Observações */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Observações Adicionais</label>
                  <textarea
                    rows={3}
                    value={formData.observations}
                    onChange={e => setFormData({ ...formData, observations: e.target.value })}
                    placeholder="Documentos a anexar, detalhes importantes sobre testemunhas, etc."
                    className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary focus:outline-none resize-none"
                  />
                </div>

                {/* Status em Edição */}
                {editingHearing && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Status Geral</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary focus:outline-none"
                    >
                      <option value="cadastrada">Cadastrada / Agendada</option>
                      <option value="notificacao_1dia_enviada">Alerta de 1 Dia Enviado</option>
                      <option value="notificacao_15min_enviada">Alerta de 15 Min Enviado</option>
                      <option value="concluida">Concluída</option>
                      <option value="cancelada">Cancelada (Bloqueia E-mails)</option>
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 hover:bg-surface-container-high text-on-surface rounded-xl transition-all font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingHearing}
                    className="px-5 py-2.5 bg-secondary text-on-secondary hover:opacity-90 rounded-xl font-bold transition-all shadow-lg shadow-secondary/15 flex items-center gap-2 disabled:opacity-50"
                  >
                    {submittingHearing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {editingHearing ? 'Salvar Alterações' : 'Cadastrar Audiência'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL DE REVISÃO DO PDF EXTRAÍDO ────────────────────────────────── */}
      <AnimatePresence>
        {isPdfReviewOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface-container w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-outline-variant/20 max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low shrink-0">
                <div>
                  <h3 className="font-headline font-bold text-lg text-on-surface flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-secondary" /> Revisar Dados Extraídos do PDF
                  </h3>
                  <p className="text-[10px] text-outline uppercase tracking-wider font-bold mt-1">Confirme e complete as informações abaixo antes de salvar no CRM</p>
                </div>
                <button onClick={() => setIsPdfReviewOpen(false)} className="p-2 hover:bg-surface-container-high rounded-full text-outline hover:text-on-surface transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-outline-variant/10">
                {/* Texto bruto lido à esquerda */}
                <div className="w-full md:w-1/2 p-6 bg-surface-container-low/50 overflow-y-auto max-h-[40vh] md:max-h-none font-mono text-[10px] text-outline leading-relaxed select-all">
                  <p className="text-[10px] font-black text-on-surface uppercase tracking-widest mb-3">Texto integral extraído do PDF</p>
                  <p className="whitespace-pre-wrap">{pdfRawText || 'Nenhum texto extraído.'}</p>
                </div>

                {/* Formulário de revisão à direita */}
                <form onSubmit={handleSubmitHearing} className="w-full md:w-1/2 p-6 space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Vincular a Processo do CRM</label>
                    <select
                      value={selectedProcessId}
                      onChange={e => setSelectedProcessId(e.target.value)}
                      className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl px-4 py-2.5 text-on-surface focus:outline-none"
                    >
                      <option value="">Selecione um processo cadastrado (Opcional)</option>
                      {processes.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.number} — {p.clients?.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Número Processo *</label>
                      <input
                        type="text"
                        required
                        value={formData.process_number}
                        onChange={e => setFormData({ ...formData, process_number: e.target.value })}
                        className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl px-3 py-2 text-on-surface focus:outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Nome Cliente *</label>
                      <input
                        type="text"
                        required
                        value={formData.client_name}
                        onChange={e => setFormData({ ...formData, client_name: e.target.value })}
                        className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl px-3 py-2 text-on-surface focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Comarca</label>
                      <input
                        type="text"
                        value={formData.comarca}
                        onChange={e => setFormData({ ...formData, comarca: e.target.value })}
                        className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl px-3 py-2 text-on-surface focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Assunto Processo</label>
                      <input
                        type="text"
                        value={formData.subject}
                        onChange={e => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl px-3 py-2 text-on-surface focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Tipo Audiência *</label>
                      <select
                        value={formData.hearing_type}
                        onChange={e => setFormData({ ...formData, hearing_type: e.target.value })}
                        className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl px-3 py-2 text-on-surface focus:outline-none"
                      >
                        <option value="Conciliação">Conciliação</option>
                        <option value="Instrução e Julgamento">Instrução e Julgamento</option>
                        <option value="Outro">Outro tipo...</option>
                      </select>
                    </div>
                    {formData.hearing_type === 'Outro' && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Especifique o Tipo *</label>
                        <input
                          type="text"
                          required
                          value={formData.custom_hearing_type}
                          onChange={e => setFormData({ ...formData, custom_hearing_type: e.target.value })}
                          className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl px-3 py-2 text-on-surface focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Data *</label>
                      <input
                        type="date"
                        required
                        value={formData.hearing_date}
                        onChange={e => setFormData({ ...formData, hearing_date: e.target.value })}
                        className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl px-3 py-2 text-on-surface focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Horário *</label>
                      <input
                        type="time"
                        required
                        value={formData.hearing_time}
                        onChange={e => setFormData({ ...formData, hearing_time: e.target.value })}
                        className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl px-3 py-2 text-on-surface focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Link da Audiência</label>
                    <input
                      type="url"
                      value={formData.link}
                      onChange={e => setFormData({ ...formData, link: e.target.value })}
                      className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl px-3 py-2 text-on-surface focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-outline uppercase tracking-wider">E-mails para Notificação (separados por vírgula)</label>
                    <input
                      type="text"
                      value={formData.notification_emails}
                      onChange={e => setFormData({ ...formData, notification_emails: e.target.value })}
                      placeholder="advogado@exemplo.com, estagiario@exemplo.com"
                      className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl px-3 py-2 text-on-surface focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Observações</label>
                    <textarea
                      rows={2}
                      value={formData.observations}
                      onChange={e => setFormData({ ...formData, observations: e.target.value })}
                      className="w-full bg-surface-container-highest border border-outline-variant/10 rounded-xl px-3 py-2 text-on-surface focus:outline-none resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-outline-variant/10">
                    <button
                      type="button"
                      onClick={() => setIsPdfReviewOpen(false)}
                      className="px-4 py-2 border border-outline-variant/15 text-outline hover:text-on-surface rounded-xl font-bold"
                    >
                      Descartar Leitura
                    </button>
                    <button
                      type="submit"
                      disabled={submittingHearing}
                      className="px-4 py-2 bg-secondary text-on-secondary hover:opacity-90 rounded-xl font-black uppercase tracking-wider transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {submittingHearing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Confirmar e Salvar
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL DE CONFIGURAÇÃO DE DESTINATÁRIOS ─────────────────────────── */}
      <AnimatePresence>
        {showConfig && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface-container w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-outline-variant/20 max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low shrink-0">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-secondary" />
                  <h3 className="font-headline font-bold text-base text-on-surface">Configurar Destinatários</h3>
                </div>
                <button onClick={() => setShowConfig(false)} className="p-2 hover:bg-surface-container-high rounded-full text-outline hover:text-on-surface transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-5 text-xs">
                {/* E-mail Principal */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Destinatário Principal (Sênior)</label>
                  <input
                    type="email"
                    value={emailConfig.senior_email}
                    onChange={e => setEmailConfig({ ...emailConfig, senior_email: e.target.value })}
                    className="w-full bg-surface-container-high border border-outline-variant/10 rounded-xl px-3 py-2.5 text-xs text-on-surface outline-none focus:border-secondary/40"
                    placeholder="brendamargalho.adv@gmail.com"
                  />
                  <p className="text-[9px] text-outline">E-mail padrão que sempre receberá os alertas de audiência.</p>
                </div>

                {/* E-mails da Equipe */}
                <div className="space-y-2 border-t border-outline-variant/10 pt-4">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-wider block">Destinatários Adicionais (Equipe / Estagiários)</label>
                  
                  {/* Lista de e-mails */}
                  {emailConfig.team_emails.length === 0 ? (
                    <p className="text-[10px] text-outline italic py-2">Nenhum e-mail adicional cadastrado.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto mb-2">
                      {emailConfig.team_emails.map(email => (
                        <span key={email} className="bg-secondary/15 text-secondary border border-secondary/20 text-[9px] px-2 py-0.5 rounded-lg flex items-center gap-1.5 font-bold">
                          {email}
                          <button onClick={() => handleRemoveTeamEmail(email)} className="hover:text-red-400">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Input de adição */}
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={newTeamEmail}
                      onChange={e => setNewTeamEmail(e.target.value)}
                      placeholder="estagiario@exemplo.com"
                      className="flex-1 bg-surface-container-high border border-outline-variant/10 rounded-xl px-3 py-2 text-xs text-on-surface outline-none focus:border-secondary/40"
                    />
                    <button
                      type="button"
                      onClick={handleAddTeamEmail}
                      className="px-3 py-2 bg-secondary/15 hover:bg-secondary/25 border border-secondary/20 text-secondary font-black uppercase text-[10px] rounded-xl transition-all"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowConfig(false)}
                    className="px-4 py-2 hover:bg-surface-container-high text-on-surface rounded-xl font-bold"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEmailConfig}
                    disabled={savingConfig}
                    className="px-4 py-2 bg-secondary text-on-secondary hover:opacity-90 rounded-xl font-black uppercase tracking-wider transition-all flex items-center gap-2"
                  >
                    {savingConfig && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
