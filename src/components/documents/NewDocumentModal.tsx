import React, { useState } from 'react';
import { X, Upload, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { DocumentTemplate } from '@/types';

interface NewDocumentModalProps {
  onClose: () => void;
  onSuccess: (document: DocumentTemplate) => void;
}

const CATEGORIES = [
  'Petições Iniciais',
  'Contestações',
  'Recursos',
  'Procurações',
  'Contratos',
  'Evidências',
  'Outros'
];

export function NewDocumentModal({ onClose, onSuccess }: NewDocumentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: CATEGORIES[0],
    description: '',
  });
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Por favor, selecione um arquivo.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error('Usuário não autenticado');

      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${userData.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('document_templates')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('document_templates')
        .getPublicUrl(filePath);

      // Save metadata to database
      const { data: docData, error: dbError } = await supabase
        .from('document_templates')
        .insert({
          title: formData.title,
          category: formData.category,
          description: formData.description || null,
          file_name: file.name,
          file_type: file.type || fileExt || 'unknown',
          file_size: file.size,
          file_url: urlData.publicUrl,
          user_id: userData.user.id
        })
        .select()
        .single();

      if (dbError) {
        // Rollback uploaded file if DB insert fails
        await supabase.storage.from('document_templates').remove([filePath]);
        throw dbError;
      }

      onSuccess(docData as DocumentTemplate);
    } catch (err: any) {
      console.error('Error uploading document:', err);
      setError(err.message || 'Erro ao realizar upload do documento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div 
        className="fixed inset-0" 
        onClick={() => !loading && onClose()}
      />
      <div className="relative w-full max-w-lg overflow-hidden bg-surface-container-low border border-outline-variant/20 rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/10 shrink-0">
          <div>
            <h2 className="text-xl font-headline font-bold text-on-surface">Novo Modelo</h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Faça upload de um modelo de petição ou documento
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 text-outline hover:text-on-surface hover:bg-surface-container-high rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/20 flex flex-col gap-2">
              <p className="text-sm text-error font-medium">{error}</p>
            </div>
          )}

          <form id="new-document-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-on-surface mb-1.5">
                Título do Documento
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                placeholder="Ex: Petição Inicial - Ação de Cobrança"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-on-surface mb-1.5">
                Categoria
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                disabled={loading}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-on-surface mb-1.5">
                Descrição <span className="text-outline font-normal">(Opcional)</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none h-24"
                placeholder="Breve descrição sobre o uso deste modelo..."
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-on-surface mb-1.5">
                Arquivo (<span className="text-primary font-medium">limite de 5MB</span>)
              </label>
              <div 
                className={cn(
                  "relative group w-full border-2 border-dashed rounded-xl overflow-hidden transition-all",
                  file 
                    ? "border-primary/50 bg-primary/5" 
                    : "border-outline-variant/30 bg-surface-container-lowest hover:border-primary/50 hover:bg-primary/5"
                )}
              >
                <input
                  type="file"
                  required
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    if (selectedFile) {
                      if (selectedFile.size > 5 * 1024 * 1024) {
                        setError('O arquivo excede o limite de 5MB');
                        return;
                      }
                      setFile(selectedFile);
                      setError(null);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  disabled={loading}
                />
                <div className="p-6 flex flex-col items-center justify-center text-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                    file ? "bg-primary/20 text-primary" : "bg-surface-container-high text-outline group-hover:bg-primary/10 group-hover:text-primary"
                  )}>
                    {file ? <FileText className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-on-surface">
                      {file ? file.name : "Clique ou arraste um arquivo"}
                    </p>
                    <p className="text-xs text-outline mt-1">
                      {file ? `Tamanho: ${(file.size / 1024 / 1024).toFixed(2)} MB` : "PDF, DOCX, DOC files preferidos"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-outline-variant/10 bg-surface-container-lowest/50 shrink-0 flex justify-end gap-3 rounded-b-3xl">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl font-bold text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="new-document-form"
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold hover:bg-primary/90 transition-all disabled:opacity-50 min-w-[140px]"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-on-primary border-t-transparent flex-shrink-0 rounded-full animate-spin" />
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Fazer Upload
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
