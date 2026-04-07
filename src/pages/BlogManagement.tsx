import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Edit, Trash2, Plus, X, Globe, Upload,
  Bold, Italic, Underline, List, Link as LinkIcon,
  FileText, Send, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  ListOrdered, Quote, Minus, Undo2, Redo2, Strikethrough,
  Heading1, Heading2, Heading3, Code, Pilcrow, Unlink
} from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  cover_image: string;
  published: boolean;
  created_at: string;
}

type FilterStatus = 'all' | 'published' | 'draft';

// ─── Toolbar Button ─────────────────────────────────────────────────────────
const ToolBtn = ({
  onClick, title, active, children, disabled,
}: {
  onClick: () => void; title: string; active?: boolean; children: React.ReactNode; disabled?: boolean;
}) => (
  <button
    type="button"
    title={title}
    disabled={disabled}
    onClick={onClick}
    className={`p-1.5 rounded transition-colors text-sm leading-none select-none
      ${active ? 'bg-primary/20 text-primary' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}
      ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    {children}
  </button>
);

const Sep = () => <span className="w-px bg-outline-variant/20 mx-0.5 self-stretch" />;

// ─── Rich Editor Component ───────────────────────────────────────────────────
function RichEditor({
  value,
  onChange,
  placeholder = 'Escreva o conteúdo aqui...',
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});

  const exec = useCallback((command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value ?? undefined);
    editorRef.current?.focus();
    updateActive();
  }, []);

  const updateActive = () => {
    const fmt: Record<string, boolean> = {};
    ['bold', 'italic', 'underline', 'strikeThrough', 'insertOrderedList', 'insertUnorderedList'].forEach(cmd => {
      try { fmt[cmd] = document.queryCommandState(cmd); } catch {}
    });
    setActiveFormats(fmt);
  };

  const handleInput = () => {
    onChange(editorRef.current?.innerHTML || '');
    updateActive();
  };

  const insertLink = () => {
    const url = prompt('URL do link (ex: https://bmjuris.com.br):');
    if (url) exec('createLink', url);
  };

  const removeLink = () => exec('unlink');

  const insertHr = () => {
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.15);margin:1em 0"/>');
  };

  const insertBlock = (tag: string) => exec('formatBlock', tag);

  const setFontSize = (size: string) => exec('fontSize', size);

  const setColor = (color: string) => exec('foreColor', color);

  // Sync initial value
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, []);

  return (
    <div className="border border-outline-variant/20 rounded-md overflow-hidden text-sm">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 bg-surface-container border-b border-outline-variant/20 sticky top-0 z-10">

        {/* Undo / Redo */}
        <ToolBtn title="Desfazer (Ctrl+Z)" onClick={() => exec('undo')}><Undo2 size={14} /></ToolBtn>
        <ToolBtn title="Refazer (Ctrl+Y)" onClick={() => exec('redo')}><Redo2 size={14} /></ToolBtn>
        <Sep />

        {/* Blocos / Headings */}
        <ToolBtn title="Parágrafo" onClick={() => insertBlock('p')}><Pilcrow size={14} /></ToolBtn>
        <ToolBtn title="Título H1" onClick={() => insertBlock('h1')}><Heading1 size={14} /></ToolBtn>
        <ToolBtn title="Título H2" onClick={() => insertBlock('h2')}><Heading2 size={14} /></ToolBtn>
        <ToolBtn title="Título H3" onClick={() => insertBlock('h3')}><Heading3 size={14} /></ToolBtn>
        <ToolBtn title="Citação" onClick={() => insertBlock('blockquote')}><Quote size={14} /></ToolBtn>
        <ToolBtn title="Código" onClick={() => insertBlock('pre')}><Code size={14} /></ToolBtn>
        <Sep />

        {/* Inline */}
        <ToolBtn title="Negrito (Ctrl+B)" active={activeFormats['bold']} onClick={() => exec('bold')}><Bold size={14} /></ToolBtn>
        <ToolBtn title="Itálico (Ctrl+I)" active={activeFormats['italic']} onClick={() => exec('italic')}><Italic size={14} /></ToolBtn>
        <ToolBtn title="Sublinhado (Ctrl+U)" active={activeFormats['underline']} onClick={() => exec('underline')}><Underline size={14} /></ToolBtn>
        <ToolBtn title="Tachado" active={activeFormats['strikeThrough']} onClick={() => exec('strikeThrough')}><Strikethrough size={14} /></ToolBtn>
        <Sep />

        {/* Alinhamento */}
        <ToolBtn title="Alinhar à esquerda" onClick={() => exec('justifyLeft')}><AlignLeft size={14} /></ToolBtn>
        <ToolBtn title="Centralizar" onClick={() => exec('justifyCenter')}><AlignCenter size={14} /></ToolBtn>
        <ToolBtn title="Alinhar à direita" onClick={() => exec('justifyRight')}><AlignRight size={14} /></ToolBtn>
        <ToolBtn title="Justificar" onClick={() => exec('justifyFull')}><AlignJustify size={14} /></ToolBtn>
        <Sep />

        {/* Listas */}
        <ToolBtn title="Lista com marcadores" active={activeFormats['insertUnorderedList']} onClick={() => exec('insertUnorderedList')}><List size={14} /></ToolBtn>
        <ToolBtn title="Lista numerada" active={activeFormats['insertOrderedList']} onClick={() => exec('insertOrderedList')}><ListOrdered size={14} /></ToolBtn>
        <ToolBtn title="Diminuir recuo" onClick={() => exec('outdent')}>
          <span className="text-xs font-bold px-0.5">←¶</span>
        </ToolBtn>
        <ToolBtn title="Aumentar recuo" onClick={() => exec('indent')}>
          <span className="text-xs font-bold px-0.5">¶→</span>
        </ToolBtn>
        <Sep />

        {/* Link e linha */}
        <ToolBtn title="Inserir link" onClick={insertLink}><LinkIcon size={14} /></ToolBtn>
        <ToolBtn title="Remover link" onClick={removeLink}><Unlink size={14} /></ToolBtn>
        <ToolBtn title="Linha horizontal" onClick={insertHr}><Minus size={14} /></ToolBtn>
        <Sep />

        {/* Tamanho da fonte */}
        <select
          title="Tamanho do texto"
          onChange={e => setFontSize(e.target.value)}
          defaultValue=""
          className="text-xs bg-surface border border-outline-variant/20 rounded px-1 py-1 text-on-surface-variant focus:outline-none cursor-pointer"
        >
          <option value="" disabled>Tamanho</option>
          <option value="1">Muito pequeno</option>
          <option value="2">Pequeno</option>
          <option value="3">Normal</option>
          <option value="4">Médio</option>
          <option value="5">Grande</option>
          <option value="6">Muito grande</option>
          <option value="7">Enorme</option>
        </select>

        {/* Cor do texto */}
        <div className="flex items-center gap-1 ml-0.5">
          <span className="text-xs text-on-surface-variant">Cor:</span>
          {['#e9c176', '#ffffff', '#a0a0a0', '#ef4444', '#3b82f6', '#22c55e'].map(color => (
            <button
              key={color}
              type="button"
              title={`Cor: ${color}`}
              onClick={() => setColor(color)}
              className="w-4 h-4 rounded-sm border border-outline-variant/30 hover:scale-125 transition-transform"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* ── Área de escrita ── */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyUp={updateActive}
        onMouseUp={updateActive}
        className="w-full min-h-[320px] bg-surface p-5 text-on-surface focus:outline-none rich-editor-content"
        style={{ lineHeight: '1.8', fontSize: '0.95rem' }}
        data-placeholder={placeholder}
      />

      <style>{`
        .rich-editor-content:empty:before {
          content: attr(data-placeholder);
          color: #555;
          pointer-events: none;
        }
        .rich-editor-content h1 { font-size: 1.75rem; font-weight: 700; margin: 1.2rem 0 0.5rem; }
        .rich-editor-content h2 { font-size: 1.35rem; font-weight: 600; margin: 1rem 0 0.4rem; }
        .rich-editor-content h3 { font-size: 1.1rem; font-weight: 600; margin: 0.8rem 0 0.3rem; }
        .rich-editor-content p { margin-bottom: 0.75rem; }
        .rich-editor-content ul { padding-left: 1.5rem; list-style: disc; margin-bottom: 0.75rem; }
        .rich-editor-content ol { padding-left: 1.5rem; list-style: decimal; margin-bottom: 0.75rem; }
        .rich-editor-content blockquote {
          border-left: 3px solid #e9c176;
          padding-left: 1rem;
          margin: 1rem 0;
          color: #999;
          font-style: italic;
        }
        .rich-editor-content pre {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 4px;
          padding: 0.75rem 1rem;
          font-family: monospace;
          font-size: 0.85rem;
          overflow-x: auto;
          margin-bottom: 0.75rem;
        }
        .rich-editor-content a { color: #e9c176; text-decoration: underline; }
        .rich-editor-content strong { font-weight: 700; }
        .rich-editor-content em { font-style: italic; }
        .rich-editor-content u { text-decoration: underline; }
        .rich-editor-content s { text-decoration: line-through; }
        .rich-editor-content hr { border: none; border-top: 1px solid rgba(255,255,255,0.15); margin: 1.2rem 0; }
      `}</style>
    </div>
  );
}

// ─── Blog Management Page ────────────────────────────────────────────────────
export function BlogManagement() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setPosts(data as BlogPost[]);
    setIsLoading(false);
  };

  const resetForm = () => {
    setTitle(''); setExcerpt(''); setContent(''); setCoverImage(''); setEditingPost(null);
  };

  const handleOpenModal = (post?: BlogPost) => {
    if (post) {
      setEditingPost(post);
      setTitle(post.title);
      setExcerpt(post.excerpt || '');
      setContent(post.content);
      setCoverImage(post.cover_image || '');
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSave = async (publishStatus: boolean) => {
    if (!title.trim()) return;
    setIsSaving(true);
    const postData = { title, excerpt, content, cover_image: coverImage, published: publishStatus };
    if (editingPost) {
      await supabase.from('blog_posts').update(postData).eq('id', editingPost.id);
    } else {
      await supabase.from('blog_posts').insert([postData]);
    }
    setIsSaving(false);
    setIsModalOpen(false);
    resetForm();
    fetchPosts();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta publicação?')) {
      await supabase.from('blog_posts').delete().eq('id', id);
      fetchPosts();
    }
  };

  const togglePublish = async (post: BlogPost) => {
    await supabase.from('blog_posts').update({ published: !post.published }).eq('id', post.id);
    fetchPosts();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('blog_images').upload(fileName, file);
    if (error) { alert('Erro ao enviar imagem.'); setIsUploading(false); return; }
    const { data } = supabase.storage.from('blog_images').getPublicUrl(fileName);
    if (data?.publicUrl) setCoverImage(data.publicUrl);
    setIsUploading(false);
  };

  const filteredPosts = posts.filter(p => {
    if (filterStatus === 'published') return p.published;
    if (filterStatus === 'draft') return !p.published;
    return true;
  });

  const draftCount = posts.filter(p => !p.published).length;
  const publishedCount = posts.filter(p => p.published).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-surface-container-low p-6 rounded-lg border border-outline-variant/20 shadow-sm">
        <div>
          <h1 className="text-3xl font-light text-on-surface mb-2">Publicações do Site</h1>
          <p className="text-on-surface-variant text-sm max-w-xl">
            Gerencie o blog do escritório. As postagens publicadas aparecerão automaticamente no site institucional.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus size={20} /> Nova Publicação
        </button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2">
        {([
          { label: `Todos (${posts.length})`, value: 'all' },
          { label: `Publicados (${publishedCount})`, value: 'published' },
          { label: `Rascunhos (${draftCount})`, value: 'draft' },
        ] as { label: string; value: FilterStatus }[]).map(f => (
          <button
            key={f.value}
            onClick={() => setFilterStatus(f.value)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-colors ${
              filterStatus === f.value
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="grid gap-6">
        {isLoading ? (
          <div className="text-center py-10 text-on-surface-variant text-sm">Carregando...</div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-20 bg-surface-container-lowest border border-outline-variant/10 rounded-lg text-on-surface-variant flex flex-col items-center">
            <Globe size={40} className="mb-4 opacity-20" />
            <p>{filterStatus === 'draft' ? 'Nenhum rascunho.' : filterStatus === 'published' ? 'Nenhuma publicação.' : 'Sem conteúdo.'}</p>
          </div>
        ) : (
          filteredPosts.map(post => (
            <div key={post.id} className="bg-surface-container-low p-6 rounded-lg border border-outline-variant/20 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">
              {post.cover_image && (
                <div className="w-full md:w-48 h-32 shrink-0 rounded-md overflow-hidden bg-surface-container-highest">
                  <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-medium text-on-surface">{post.title}</h3>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => togglePublish(post)}
                      title={post.published ? 'Mover para rascunho' : 'Publicar'}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-semibold transition-colors ${
                        post.published
                          ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                          : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                      }`}
                    >
                      {post.published ? <><Globe size={11} /> Público</> : <><FileText size={11} /> Rascunho</>}
                    </button>
                    <button onClick={() => handleOpenModal(post)} className="text-outline-variant hover:text-primary transition-colors p-1"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(post.id)} className="text-outline-variant hover:text-error transition-colors p-1"><Trash2 size={16} /></button>
                  </div>
                </div>
                <p className="text-on-surface-variant text-sm mb-4 line-clamp-2">{post.excerpt}</p>
                <div className="mt-auto text-xs text-outline-variant">{new Date(post.created_at).toLocaleDateString('pt-BR')}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-surface/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-surface-container-low border border-outline-variant/20 rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto custom-scrollbar flex flex-col">

            {/* Modal header */}
            <div className="flex justify-between items-center p-6 border-b border-outline-variant/10 sticky top-0 bg-surface-container-low z-20">
              <h2 className="text-xl font-medium text-on-surface">
                {editingPost ? 'Editar Publicação' : 'Nova Publicação'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1">
              {/* Título */}
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-2">Título do Artigo *</label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-surface border border-outline-variant/20 rounded-md p-3 text-on-surface focus:outline-none focus:border-primary text-lg"
                  placeholder="Ex: Seus Direitos no Processo Penal"
                />
              </div>

              {/* Resumo + Capa */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-2">Resumo (exibido nos cards do site)</label>
                  <textarea
                    rows={4}
                    value={excerpt}
                    onChange={e => setExcerpt(e.target.value)}
                    className="w-full bg-surface border border-outline-variant/20 rounded-md p-3 text-on-surface focus:outline-none focus:border-primary resize-none"
                    placeholder="Breve introdução que aparecerá no card do blog..."
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-2">Imagem de Capa</label>
                  <div className="flex gap-2 mb-2">
                    <label className={`cursor-pointer flex items-center gap-2 shrink-0 border border-outline-variant/20 rounded-md px-3 py-2 text-sm hover:bg-surface-container transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <Upload size={14} />
                      <span>{isUploading ? 'Enviando...' : 'Upload'}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                    </label>
                    <input
                      type="text"
                      value={coverImage}
                      onChange={e => setCoverImage(e.target.value)}
                      className="w-full bg-surface border border-outline-variant/20 rounded-md px-3 py-2 text-on-surface text-sm focus:outline-none focus:border-primary"
                      placeholder="ou cole uma URL de imagem"
                    />
                  </div>
                  {coverImage && (
                    <div className="h-24 w-full rounded-md overflow-hidden border border-outline-variant/10">
                      <img src={coverImage} className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              {/* Editor de Conteúdo */}
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-2">Conteúdo Completo</label>
                <RichEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Escreva o conteúdo do artigo aqui. Use a barra de ferramentas para formatar o texto..."
                />
              </div>

              {/* Ações */}
              <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4 border-t border-outline-variant/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 rounded-md border border-outline-variant/20 text-on-surface hover:bg-surface-container"
                >
                  Cancelar
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={isSaving || !title.trim()}
                    onClick={() => handleSave(false)}
                    className="flex items-center gap-2 px-6 py-2 rounded-md border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileText size={16} />
                    {isSaving ? 'Salvando...' : 'Salvar Rascunho'}
                  </button>
                  <button
                    type="button"
                    disabled={isSaving || !title.trim()}
                    onClick={() => handleSave(true)}
                    className="flex items-center gap-2 px-6 py-2 rounded-md bg-primary text-on-primary hover:bg-primary/90 font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={16} />
                    {isSaving ? 'Publicando...' : 'Publicar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
