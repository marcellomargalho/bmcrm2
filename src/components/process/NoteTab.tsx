import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Pin, MessageSquare, Trash2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProcessNote {
  id: string;
  content: string;
  author: string;
  pinned: boolean;
  created_at: string;
}

export function NoteTab({ processId }: { processId: string }) {
  const [notes, setNotes] = useState<ProcessNote[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newNote, setNewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function fetchNotes() {
    setLoading(true);
    const { data } = await supabase
      .from('process_notes')
      .select('*')
      .eq('process_id', processId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });
    
    setNotes(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchNotes();
  }, [processId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newNote.trim()) return;
    
    setSubmitting(true);
    
    const token = await supabase.auth.getUser();
    const userId = token.data.user?.id;
    // mock user name if no profiles table is available, or use email
    const authorName = token.data.user?.user_metadata?.name || token.data.user?.email || 'Secretaria';

    const payload = {
      process_id: processId,
      content: newNote.trim(),
      author: authorName,
      user_id: userId
    };

    await supabase.from('process_notes').insert([payload]);
    
    setNewNote('');
    fetchNotes();
    setSubmitting(false);
  }

  async function togglePin(id: string, currentPinned: boolean) {
    await supabase.from('process_notes').update({ pinned: !currentPinned }).eq('id', id);
    fetchNotes();
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Excluir esta anotação permanentemente?')) return;
    await supabase.from('process_notes').delete().eq('id', id);
    fetchNotes();
  }

  return (
    <div className="space-y-8 flex flex-col h-full">
      <div>
        <h3 className="text-xl font-headline font-bold text-on-surface">Anotações Relevantes</h3>
        <p className="text-sm text-on-surface-variant">Registro livre de comentários, ideias ou resumos da equipe.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-surface-container rounded-3xl border border-outline-variant/10 p-2 shadow-sm flex items-end gap-2 focus-within:ring-2 ring-secondary/50 transition-all">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Escreva uma observação importante sobre o caso..."
          className="flex-1 bg-transparent border-none text-on-surface focus:ring-0 min-h-[60px] max-h-[200px] resize-y p-3 text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <button 
          type="submit" 
          disabled={!newNote.trim() || submitting}
          className="w-12 h-12 shrink-0 rounded-2xl bg-secondary text-on-secondary flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mb-2 mr-2 shadow-lg shadow-secondary/20"
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
        </button>
      </form>

      <div className="flex-1 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-secondary" /></div>
        ) : notes.length === 0 ? (
          <div className="text-center py-12 bg-surface-container-lowest border border-outline-variant/5 rounded-3xl h-full flex flex-col items-center justify-center">
            <MessageSquare className="w-10 h-10 text-outline mx-auto mb-3" />
            <p className="font-bold text-on-surface">O histórico está limpo</p>
            <p className="text-sm text-on-surface-variant font-medium mt-1">Nenhuma anotação foi deixada neste processo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {notes.map(note => (
              <div key={note.id} className={cn(
                "p-5 rounded-3xl border transition-all flex flex-col gap-3 group relative",
                note.pinned 
                  ? "bg-amber-500/5 border-amber-500/20" 
                  : "bg-surface-container-low border-outline-variant/5 hover:border-outline-variant/20"
              )}>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-[10px] font-bold text-secondary">
                      {note.author.substring(0,2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface">{note.author}</p>
                      <p className="text-[10px] text-outline font-medium">
                        {new Date(note.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => togglePin(note.id, note.pinned)} 
                      className={cn(
                        "p-1.5 rounded-lg transition-colors border",
                        note.pinned ? "text-amber-500 bg-amber-500/10 border-amber-500/20" : "text-outline bg-surface-container-high hover:text-amber-500 border-transparent"
                      )}
                      title="Fixar/Desfixar no topo"
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(note.id)} className="p-1.5 text-outline hover:text-error bg-surface-container-high hover:bg-error/10 rounded-lg transition-colors border border-transparent">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                
                <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap ml-11">
                  {note.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
