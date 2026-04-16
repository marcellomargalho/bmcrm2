import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, UploadCloud, FileText, Trash2, Download, Eye, Sparkles, FolderOpen, X, ExternalLink, Image as ImageIcon } from 'lucide-react';
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

function PreviewModal({ doc, onClose }: { doc: ProcessDoc; onClose: () => void }) {
  const ext = doc.title.split('.').pop()?.toLowerCase() || '';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
  const isPdf  = ext === 'pdf';

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleDownload = async () => {
    try {
      const res = await fetch(doc.file_url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = doc.title;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(doc.file_url, '_blank');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={handleBackdrop}
    >
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-surface-container-low rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-outline-variant/10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              {isImage ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-on-surface truncate" title={doc.title}>{doc.title}</p>
              <p className="text-[10px] text-outline uppercase tracking-widest">{doc.type}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-1.5 bg-secondary/10 text-secondary hover:bg-secondary hover:text-on-secondary border border-secondary/20 font-bold text-xs rounded-xl transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
            <a
              href={doc.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-high text-on-surface hover:bg-surface-bright border border-outline-variant/10 font-bold text-xs rounded-xl transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir
            </a>
            <button
              onClick={onClose}
              className="p-1.5 bg-surface-container-high hover:bg-error/10 hover:text-error text-outline rounded-xl transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto flex items-center justify-center bg-black/20 min-h-0">
          {isPdf && (
            <iframe
              src={doc.file_url}
              className="w-full h-full min-h-[60vh]"
              title={doc.title}
            />
          )}
          {isImage && (
            <img
              src={doc.file_url}
              alt={doc.title}
              className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-lg"
            />
          )}
          {!isPdf && !isImage && (
            <div className="text-center p-12 space-y-4">
              <FileText className="w-16 h-16 text-outline mx-auto" />
              <p className="text-on-surface font-bold">Pré-visualização não disponível</p>
              <p className="text-sm text-on-surface-variant">
                Este tipo de arquivo ({ext.toUpperCase() || 'desconhecido'}) não pode ser visualizado diretamente no navegador.
              </p>
              <a
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-secondary text-on-secondary font-bold text-sm rounded-xl hover:opacity-90 transition-opacity"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir em nova aba
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DocumentTab({ processId }: { processId: string }) {
  const [documents, setDocuments] = useState<ProcessDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('Todos');
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<ProcessDoc | null>(null);

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

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;
    if (!window.confirm(`Fazer upload de ${files.length} arquivo(s)?`)) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não logado');

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `${processId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('process_documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('process_documents')
          .getPublicUrl(filePath);

        const payload = {
          process_id: processId,
          title: file.name,
          type: activeType === 'Todos' ? 'Outros' : activeType,
          size: file.size,
          file_url: urlData.publicUrl,
          user_id: user.id
        };

        const { error: dbError } = await supabase.from('process_documents').insert([payload]);
        if (dbError) throw dbError;
      }
      
      fetchDocuments();
    } catch (err: any) {
      console.error('Erro no upload:', err);
      alert('Erro ao fazer upload do arquivo.');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  async function handleDelete(id: string) {
    if (!window.confirm('Excluir este arquivo permanentemente?')) return;
    
    const docToDelete = documents.find(d => d.id === id);
    if (docToDelete && docToDelete.file_url) {
      try {
        const urlParts = docToDelete.file_url.split('/');
        const fileName = urlParts.pop();
        const folderName = urlParts.pop();
        if (fileName && folderName) {
          await supabase.storage.from('process_documents').remove([`${folderName}/${fileName}`]);
        }
      } catch (e) {
        console.error('Erro ao excluir do storage:', e);
      }
    }

    await supabase.from('process_documents').delete().eq('id', id);
    fetchDocuments();
  }

  async function handleDownload(doc: ProcessDoc) {
    try {
      const res = await fetch(doc.file_url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = doc.title;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(doc.file_url, '_blank');
    }
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
    <>
      {previewDoc && (
        <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}

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
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2.5 bg-surface-container-highest text-secondary border border-secondary/20 font-bold text-sm rounded-xl hover:bg-surface-bright transition-all"
          >
            Selecionar no Computador
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => {
              if (e.target.files) handleFiles(Array.from(e.target.files));
              if (fileInputRef.current) fileInputRef.current.value = '';
            }} 
            className="hidden" 
            multiple 
          />
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
                      <span className="inline-block mt-2 text-[9px] bg-outline-variant/20 text-on-surface-variant px-1.5 py-0.5 rounded font-bold uppercase">v1.0 Original</span>
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => setPreviewDoc(doc)}
                        title="Pré-visualizar"
                        className="p-1.5 bg-surface-container-high hover:bg-secondary/10 hover:text-secondary rounded-lg text-outline transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDownload(doc)}
                        title="Fazer download"
                        className="p-1.5 bg-surface-container-high hover:bg-secondary/10 hover:text-secondary rounded-lg text-outline transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        title="Excluir"
                        className="p-1.5 bg-surface-container-high hover:bg-error/10 hover:text-error rounded-lg text-outline transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
