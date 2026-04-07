import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Plus, UploadCloud, FileText, Trash2, Download, Eye, Sparkles, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProcessDoc {
  id: string;
  title: string;
  type: string;
  file_url: string;
  size: number | null;
  created_at: string;
}

const docTypes = ['Petições', 'Procurações', 'Contratos', 'Provas', 'Outros'];

export function DocumentTab({ processId }: { processId: string }) {
  const [documents, setDocuments] = useState<ProcessDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('Todos');
  const [isDragOver, setIsDragOver] = useState(false);

  async function fetchDocuments() {
    setLoading(true);
    const { data } = await supabase
      .from('process_documents')
      .select('*')
      .eq('process_id', processId)
      .order('created_at', { ascending: false });
    
    setDocuments(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchDocuments();
  }, [processId]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (!window.confirm(`Fazer upload de ${e.dataTransfer.files.length} arquivo(s)?`)) return;
      
      setLoading(true);
      const token = await supabase.auth.getUser();
      const userId = token.data.user?.id;

      // Mock the upload inserting into database with a dummy url
      const file = e.dataTransfer.files[0];
      const payload = {
        process_id: processId,
        title: file.name,
        type: activeType === 'Todos' ? 'Outros' : activeType,
        size: file.size,
        file_url: 'blob://mock-url-' + Math.random(),
        user_id: userId
      };

      await supabase.from('process_documents').insert([payload]);
      
      // Delay mock to pretend uploading
      setTimeout(() => {
        fetchDocuments();
      }, 1000);
    }
  };

  async function handleDelete(id: string) {
    if (!window.confirm('Excluir este arquivo permanentemente?')) return;
    await supabase.from('process_documents').delete().eq('id', id);
    fetchDocuments();
  }

  function formatBytes(bytes: number, decimals = 2) {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  const filteredDocs = activeType === 'Todos' ? documents : documents.filter(d => d.type === activeType);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h3 className="text-xl font-headline font-bold text-on-surface">Gestão de Documentos</h3>
          <p className="text-sm text-on-surface-variant">Arquivos vinculados, petições e acervo probatório.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-gradient-to-r from-purple-500/20 to-purple-600/20 text-purple-400 border border-purple-500/30 font-bold text-xs rounded-xl hover:bg-purple-500/30 transition-all flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Gerar Documento com IA
          </button>
        </div>
      </div>

      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "w-full p-10 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center",
          isDragOver ? "bg-secondary/10 border-secondary scale-[1.01]" : "bg-surface-container border-outline-variant/30 hover:bg-surface-container-high"
        )}
      >
        <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center text-secondary mb-4">
          <UploadCloud className="w-8 h-8" />
        </div>
        <h4 className="text-base font-bold text-on-surface">Arraste seus arquivos para cá</h4>
        <p className="text-sm text-on-surface-variant mt-1 mb-4">Suporta PDF, DOCX, Imagens (Até 50MB)</p>
        <button className="px-6 py-2.5 bg-surface-container-highest text-secondary border border-secondary/20 font-bold text-sm rounded-xl hover:bg-surface-bright transition-all">
          Selecionar no Computador
        </button>
      </div>

      <div className="bg-surface-container-low rounded-2xl border border-outline-variant/5 overflow-hidden">
        <div className="border-b border-outline-variant/10 p-4 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveType('Todos')}
            className={cn(
              "px-4 py-2 font-bold text-xs uppercase tracking-widest rounded-xl transition-all whitespace-nowrap",
              activeType === 'Todos' ? "bg-secondary text-on-secondary" : "text-outline hover:text-on-surface hover:bg-surface-container-high"
            )}
          >
            Todos
          </button>
          {docTypes.map(type => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={cn(
                "px-4 py-2 font-bold text-xs uppercase tracking-widest rounded-xl transition-all whitespace-nowrap",
                activeType === type ? "bg-secondary text-on-secondary" : "text-outline hover:text-on-surface hover:bg-surface-container-high"
              )}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-secondary" /></div>
          ) : documents.length === 0 ? (
             <div className="text-center py-12">
               <FolderOpen className="w-10 h-10 text-outline mx-auto mb-3" />
               <p className="font-bold text-on-surface">Acervo Vazio</p>
               <p className="text-sm text-on-surface-variant">Arraste arquivos na área acima para anexar a este processo.</p>
             </div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-12 text-on-surface-variant text-sm">Nenhum documento na categoria "{activeType}".</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocs.map(doc => (
                <div key={doc.id} className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/5 flex items-start gap-4 hover:border-secondary/30 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-sm text-on-surface truncate" title={doc.title}>{doc.title}</h5>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-outline font-medium uppercase">{doc.type}</span>
                      <span className="text-[10px] text-outline">•</span>
                      <span className="text-[10px] text-outline font-medium">{formatBytes(doc.size || 0)}</span>
                    </div>
                    {/* Version mock */}
                    <span className="inline-block mt-2 text-[9px] bg-outline-variant/20 text-on-surface-variant px-1.5 py-0.5 rounded font-bold uppercase">v1.0 Original</span>
                  </div>
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button className="p-1.5 bg-surface-container-high hover:bg-secondary/10 hover:text-secondary rounded-lg text-outline transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                    <button className="p-1.5 bg-surface-container-high hover:bg-secondary/10 hover:text-secondary rounded-lg text-outline transition-colors"><Download className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(doc.id)} className="p-1.5 bg-surface-container-high hover:bg-error/10 hover:text-error rounded-lg text-outline transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
