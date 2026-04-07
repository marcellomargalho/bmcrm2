import React, { useState, useEffect } from 'react';
import { FileText, Search, Filter, Upload, MoreVertical, Download, Eye, Trash2, FileCode, FileImage, FileType, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { DocumentTemplate } from '@/types';
import { NewDocumentModal } from '@/components/documents/NewDocumentModal';

export function DocumentManagement() {
  const [documents, setDocuments] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser(user.id);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (document: DocumentTemplate) => {
    if (!window.confirm('Tem certeza que deseja excluir este modelo? Essa ação não pode ser desfeita.')) {
      return;
    }

    try {
      // 1. Delete file from storage
      const filePath = document.file_url.split('/').slice(-2).join('/');
      
      const { error: storageError } = await supabase.storage
        .from('document_templates')
        .remove([filePath]);

      if (storageError) {
         console.warn("Storage warning: ", storageError);
      }

      // 2. Delete row from database
      const { error: dbError } = await supabase
        .from('document_templates')
        .delete()
        .eq('id', document.id);

      if (dbError) throw dbError;

      // Update state
      setDocuments(documents.filter(d => d.id !== document.id));
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Erro ao excluir o documento. Tente novamente.');
    }
  };

  const handleDownload = (document: DocumentTemplate) => {
    window.open(document.file_url, '_blank');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getCategoryIcon = (category: string) => {
    switch(category) {
      case 'Contratos': return FileCode;
      case 'Evidências': return FileImage;
      case 'Petições Iniciais':
      case 'Contestações':
      case 'Recursos': return FileText;
      default: return FileType;
    }
  };

  const getCategoryColor = (category: string) => {
    switch(category) {
      case 'Contratos': return 'text-primary bg-primary/10';
      case 'Evidências': return 'text-emerald-400 bg-emerald-400/10';
      case 'Petições Iniciais':
      case 'Contestações':
      case 'Recursos': return 'text-secondary bg-secondary/10';
      default: return 'text-outline bg-surface-container-high text-on-surface';
    }
  };

  const filteredDocs = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    doc.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface mb-2">Modelos (Arquivos)</h2>
          <p className="text-on-surface-variant">Modelos de petições, contratos e documentos compartilhados entre os advogados.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-secondary text-on-secondary font-headline font-bold hover:opacity-90 transition-all shadow-lg shadow-secondary/10"
          >
            <Plus className="w-5 h-5" />
            Novo Modelo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Petições Iniciais', count: documents.filter(d => d.category === 'Petições Iniciais').length, icon: FileText, color: 'text-secondary' },
          { label: 'Contratos', count: documents.filter(d => d.category === 'Contratos').length, icon: FileCode, color: 'text-primary' },
          { label: 'Recursos', count: documents.filter(d => d.category === 'Recursos').length, icon: FileImage, color: 'text-emerald-400' },
          { label: 'Outros', count: documents.filter(d => !['Petições Iniciais', 'Contratos', 'Recursos'].includes(d.category)).length, icon: FileType, color: 'text-outline' }
        ].map((cat, i) => (
          <div key={i} className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/5 hover:bg-surface-container-high transition-all cursor-pointer group">
            <div className={cn("w-10 h-10 rounded-xl bg-surface-container-lowest flex items-center justify-center mb-4 group-hover:scale-110 transition-transform", cat.color)}>
              <cat.icon className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-on-surface">{cat.label}</h4>
            <p className="text-xs text-on-surface-variant mt-1">{cat.count} modelos salvos</p>
          </div>
        ))}
      </div>

      <div className="bg-surface-container-low rounded-3xl overflow-hidden shadow-2xl border border-outline-variant/5">
        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/10">
          <div className="flex items-center bg-surface-container-lowest rounded-full px-4 py-2 w-full md:w-96 border border-outline-variant/10">
            <Search className="text-outline w-4 h-4 mr-2" />
            <input 
              type="text" 
              placeholder="Pesquisar por nome ou categoria..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm w-full text-on-surface placeholder:text-outline/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-outline hover:text-secondary transition-colors"><Filter className="w-5 h-5" /></button>
            <div className="h-6 w-px bg-outline-variant/20 mx-2"></div>
            <span className="text-xs text-outline font-medium">Ordernar por: <span className="text-on-surface font-bold">Mais recentes</span></span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="px-8 py-4 text-[10px] uppercase tracking-widest text-outline font-bold">Título do Modelo</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-outline font-bold">Categoria</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-outline font-bold">Tamanho</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-outline font-bold">Data de Upload</th>
                <th className="px-8 py-4 text-[10px] uppercase tracking-widest text-outline font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {loading ? (
                 <tr>
                    <td colSpan={5} className="py-10 text-center text-outline-variant text-sm border-t border-outline-variant/10">
                      Carregando modelos...
                    </td>
                 </tr>
              ) : filteredDocs.length === 0 ? (
                 <tr>
                    <td colSpan={5} className="py-10 text-center text-outline-variant text-sm border-t border-outline-variant/10">
                      Nenhum modelo encontrado. Adicione um novo clicando em <span className="text-secondary font-bold">Novo Modelo</span>
                    </td>
                 </tr>
              ) : (
                filteredDocs.map((doc) => {
                  const Icon = getCategoryIcon(doc.category);
                  const canDelete = currentUser === doc.user_id;

                  return (
                    <tr key={doc.id} className="hover:bg-surface-bright/20 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                            getCategoryColor(doc.category)
                          )}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-on-surface">{doc.title}</p>
                            <p className="text-xs text-outline font-medium">{doc.file_name} • <span className="uppercase">{doc.file_type.split('/').pop() || doc.file_type}</span></p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-xs font-medium text-on-surface-variant flex flex-col">
                          {doc.category}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-xs text-on-surface-variant">{formatFileSize(doc.file_size)}</td>
                      <td className="px-6 py-5 text-xs text-on-surface-variant">
                        {format(new Date(doc.created_at), "dd MMM yyyy", { locale: ptBR })}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => handleDownload(doc)}
                            title="Baixar Modelo"
                            className="p-2 text-outline hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          {canDelete && (
                            <button 
                              onClick={() => handleDelete(doc)}
                              title="Excluir Modelo"
                              className="p-2 text-outline hover:text-error hover:bg-error/10 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {isNewModalOpen && (
        <NewDocumentModal 
          onClose={() => setIsNewModalOpen(false)}
          onSuccess={(newDoc) => {
            setDocuments([newDoc, ...documents]);
            setIsNewModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
