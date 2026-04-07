import React, { useState, useRef, useEffect } from 'react';
import { 
  Brain, 
  Sparkles, 
  Send, 
  User, 
  Bot, 
  Copy, 
  FileText, 
  History, 
  Eraser, 
  Save,
  ChevronRight,
  Zap,
  CheckCircle2,
  FileSearch,
  Scale,
  MessageSquare,
  Paperclip,
  X,
  File,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachment?: {
    name: string;
    type: string;
    size: string;
  };
}

export function AINotebook() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Olá! Sou seu assistente jurídico de IA preferencial. Como posso ajudar com sua redação ou análise documental hoje?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [attachedFile, setAttachedFile] = useState<{ name: string; type: string; size: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      // Simulate upload
      setTimeout(() => {
        setAttachedFile({
          name: file.name,
          type: file.type || 'document/pdf',
          size: (file.size / 1024 / 1024).toFixed(1) + 'MB'
        });
        setIsUploading(false);
      }, 800);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() && !attachedFile) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      attachment: attachedFile || undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachedFile(null);
    setIsTyping(true);

    // MOCK AI RESPONSE
    setTimeout(() => {
      let response = `Aqui está uma análise para sua solicitação:\n\nCom base na legislação vigente, recomendo focar nos seguintes pontos jurídicos...`;
      
      if (userMsg.attachment) {
        response = `Recebi seu documento "**${userMsg.attachment.name}**" (${userMsg.attachment.size}). \n\nApós uma análise preliminar, identifiquei cláusulas importantes relacionadas a prazos e responsabilidades. Gostaria que eu elaborasse um resumo dos riscos encontrados?`;
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 1800);
  };

  const copyToEditor = (content: string) => {
    setEditorContent(prev => prev + (prev ? '\n\n' : '') + content);
  };

  const quickActions = [
    { icon: FileSearch, label: 'Resumir', prompt: 'Resuma os pontos principais deste processo:' },
    { icon: Scale, label: 'Análise de Risco', prompt: 'Analise os riscos jurídicos desta situação:' },
    { icon: FileText, label: 'Minuta', prompt: 'Esboce uma minuta inicial para:' },
    { icon: CheckCircle2, label: 'Revisar', prompt: 'Revise esta cláusula contratual:' },
  ];

  return (
    <div className="h-[calc(100vh-120px)] flex gap-6 overflow-hidden animate-in fade-in duration-700 relative">
      {/* Coming Soon Overlay */}
      <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-surface/40 backdrop-blur-md rounded-[40px] border border-outline-variant/10 text-center p-12">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-surface-container/80 backdrop-blur-2xl p-12 rounded-[48px] border border-outline-variant/20 shadow-2xl max-w-md"
        >
          <div className="w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-8 relative">
            <div className="absolute inset-0 bg-secondary/5 rounded-full animate-ping" />
            <Sparkles className="w-10 h-10 text-secondary" />
          </div>
          <h2 className="text-3xl font-headline font-black text-on-surface mb-4 tracking-tight">Em breve</h2>
          <p className="text-sm text-on-surface-variant font-medium leading-relaxed mb-8">
            Estamos refinando o **Cérebro Jurídico** do Brenda Margalho Advocacia. 
            Em breve você terá um assistente de IA ultra-potente integrado em suas petições.
          </p>
          <div className="flex flex-wrap gap-2 justify-center opacity-40">
            {['Análise de PDFs', 'Geração de Cláusulas', 'Pesquisa de Leis'].map(tag => (
              <span key={tag} className="text-[9px] font-black uppercase tracking-widest bg-outline-variant/20 px-3 py-1.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Sidebar Chat - Slimmer and More Premium */}
      <div className="w-[350px] flex flex-col bg-surface-container/40 backdrop-blur-xl rounded-[32px] border border-outline-variant/10 shadow-2xl overflow-hidden shrink-0 transition-all duration-500 hover:border-secondary/20 group/chat">
        <div className="p-5 bg-gradient-to-b from-surface-container-low to-transparent border-b border-outline-variant/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary shadow-inner">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-headline font-bold text-on-surface text-[13px] tracking-tight">IA Jurídica</h3>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-[9px] text-outline font-black uppercase tracking-[0.1em]">SISTEMA ONLINE</span>
              </div>
            </div>
          </div>
          <button className="p-2 text-outline hover:text-secondary transition-all hover:bg-secondary/5 rounded-xl group">
            <History className="w-4 h-4 group-hover:rotate-[-45deg] transition-transform" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 custom-scrollbar scroll-smooth">
          {messages.map((msg) => (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              key={msg.id} 
              className={cn(
                "flex gap-3",
                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                msg.role === 'user' ? "bg-secondary text-on-secondary" : "bg-surface-container-high text-secondary border border-outline-variant/10"
              )}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={cn(
                "max-w-[90%] space-y-2",
                msg.role === 'user' ? "items-end" : "items-start"
              )}>
                {msg.attachment && (
                  <div className="flex items-center gap-2 p-2 bg-secondary/5 border border-secondary/20 rounded-xl mb-1">
                    <File className="w-3.5 h-3.5 text-secondary" />
                    <span className="text-[10px] font-bold text-on-surface/70 truncate max-w-[150px]">{msg.attachment.name}</span>
                  </div>
                )}
                <div className={cn(
                  "p-4 rounded-[22px] text-xs font-medium leading-relaxed shadow-sm transition-all",
                  msg.role === 'user' 
                    ? "bg-secondary/10 border border-secondary/20 text-on-surface rounded-tr-none" 
                    : "bg-surface-container-lowest border border-outline-variant/10 text-on-surface rounded-tl-none hover:border-secondary/20"
                )}>
                  {msg.content}
                </div>
                {msg.role === 'assistant' && (
                  <button 
                    onClick={() => copyToEditor(msg.content)}
                    className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-secondary/10 text-secondary rounded-lg transition-all text-[9px] font-black uppercase tracking-widest group/btn"
                  >
                    <Copy className="w-3 h-3 group-hover/btn:scale-110 transition-transform" />
                    Copiar para o rascunho
                  </button>
                )}
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-surface-container-high text-secondary border border-outline-variant/10 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-surface-container-lowest/50 border border-outline-variant/10 p-4 rounded-[22px] rounded-tl-none flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-secondary/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-secondary/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-secondary/40 rounded-full animate-bounce" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-5 bg-gradient-to-t from-surface-container-low to-transparent border-t border-outline-variant/5 space-y-4 shrink-0">
          <div className="flex flex-wrap gap-1.5 px-1">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => setInput(action.prompt)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-lowest/50 backdrop-blur-md border border-outline-variant/10 rounded-full text-[9px] font-black text-outline uppercase tracking-wider hover:text-secondary hover:border-secondary/30 hover:bg-secondary/5 transition-all active:scale-95 whitespace-nowrap"
              >
                <action.icon className="w-2.5 h-2.5" />
                {action.label}
              </button>
            ))}
          </div>
          
          <div className="relative group/form">
            <AnimatePresence>
              {attachedFile && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute -top-12 left-0 right-0 bg-secondary/10 border border-secondary/20 rounded-xl p-2 flex items-center justify-between backdrop-blur-xl"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <File className="w-3.5 h-3.5 text-secondary shrink-0" />
                    <span className="text-[10px] font-bold text-on-surface/80 truncate">{attachedFile.name}</span>
                  </div>
                  <button onClick={() => setAttachedFile(null)} className="p-1 hover:bg-secondary/20 rounded-lg text-secondary transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Instruções para a IA..."
                  className="w-full bg-surface-container-lowest/80 backdrop-blur-md border border-outline-variant/20 rounded-2xl px-5 py-3 pr-10 text-xs font-medium focus:ring-2 focus:ring-secondary/20 outline-none transition-all placeholder:text-outline/40 shadow-inner"
                />
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-outline hover:text-secondary transition-all hover:bg-secondary/10 rounded-lg"
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept=".pdf,.doc,.docx,.txt"
                />
              </div>
              <button 
                type="submit"
                disabled={(!input.trim() && !attachedFile) || isTyping}
                className="p-3 bg-secondary text-on-secondary rounded-2xl hover:opacity-90 hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 active:scale-95 shadow-xl shadow-secondary/20"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Editor Area - More Focused and Premium */}
      <div className="flex-1 flex flex-col bg-surface-container/20 backdrop-blur-md rounded-[40px] border border-outline-variant/10 shadow-2xl overflow-hidden group/editor transition-all duration-700 hover:border-secondary/10">
        <div className="p-7 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container-lowest/30 backdrop-blur-xl">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-surface-container-high/50 rounded-2xl flex items-center justify-center text-secondary shadow-sm ring-1 ring-outline-variant/10">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <input 
                type="text" 
                placeholder="Título do Rascunho..." 
                className="bg-transparent border-none focus:ring-0 text-xl font-headline font-black text-on-surface placeholder:text-outline/20 w-80 tracking-tight"
              />
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex h-1.5 w-1.5 rounded-full bg-secondary animate-pulse" />
                <p className="text-[9px] text-outline font-black uppercase tracking-[0.2em]">PERSISTÊNCIA AUTOMÁTICA ATIVA</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setEditorContent('')}
              className="flex items-center gap-2 px-4 py-2 text-outline hover:text-error transition-all text-[11px] font-black uppercase tracking-widest hover:bg-error/5 rounded-xl"
            >
              <Eraser className="w-4 h-4" />
              Limpar
            </button>
            <button className="flex items-center gap-2.5 px-8 py-3 bg-secondary text-on-secondary font-headline font-black rounded-2xl hover:opacity-90 hover:scale-[1.02] transition-all shadow-2xl shadow-secondary/30 active:scale-95">
              <Save className="w-4 h-4" />
              Concluir Documento
            </button>
          </div>
        </div>

        <div className="flex-1 p-12 overflow-y-auto custom-scrollbar bg-gradient-to-b from-transparent to-surface-container-low/20">
          <div className="max-w-4xl mx-auto h-full">
            <textarea
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              placeholder="Inicie sua redação aqui... 

Utilize o assistente de IA para fundamentar suas petições, analisar riscos em contratos ou resumir históricos processuais complexos. Basta anexar o arquivo ou descrever o caso no chat ao lado."
              className="w-full h-full bg-transparent border-none focus:ring-0 text-on-surface leading-[2.2] resize-none font-body text-[17px] placeholder:text-outline/10 placeholder:font-light p-0 transition-all font-medium"
            />
            
            <AnimatePresence>
              {!editorContent && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute inset-x-12 bottom-12 p-10 border border-dashed border-outline-variant/10 rounded-[32px] bg-surface-container-lowest/10 backdrop-blur-sm flex flex-col items-center gap-5 pointer-events-none"
                >
                  <div className="w-16 h-16 bg-secondary/5 rounded-[24px] flex items-center justify-center text-secondary/20 shadow-inner">
                    <Zap className="w-8 h-8" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-[10px] font-black text-secondary tracking-[0.3em] uppercase">Fluxo de Trabalho Inteligente</p>
                    <p className="text-sm text-outline font-medium max-w-sm leading-relaxed mx-auto italic">
                      "A inteligência não é substituir o advogado, mas sim amplificá-lo."
                    </p>
                    <p className="text-[10px] text-outline/40 font-bold mt-4">USE O CHAT PARA GERAR CONTEÚDO E CLIQUE EM COPIAR PARA PREENCHER ESTA ÁREA</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        <div className="px-8 py-4 bg-surface-container-lowest/50 backdrop-blur-xl border-t border-outline-variant/5 flex justify-between items-center opacity-40 group-hover/editor:opacity-100 transition-all duration-500">
          <div className="flex items-center gap-6">
             <div className="flex flex-col">
               <span className="text-[9px] font-black text-outline uppercase tracking-widest">Caracteres</span>
               <span className="text-xs font-bold text-on-surface">{editorContent.length}</span>
             </div>
             <div className="w-[1px] h-6 bg-outline-variant/20" />
             <div className="flex flex-col">
               <span className="text-[9px] font-black text-outline uppercase tracking-widest">Palavras</span>
               <span className="text-xs font-bold text-on-surface">{editorContent.split(/\s+/).filter(x => x).length}</span>
             </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-black text-secondary uppercase tracking-[0.2em] flex items-center gap-2 bg-secondary/10 px-4 py-2 rounded-full border border-secondary/20">
              <CheckCircle2 className="w-3 h-3" />
              Otimizado para PJE
            </span>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(var(--secondary), 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(var(--secondary), 0.2);
        }
      `}</style>
    </div>
  );
}
