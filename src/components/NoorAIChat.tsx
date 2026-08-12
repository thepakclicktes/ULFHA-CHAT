import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Send, 
  Sparkles, 
  ExternalLink, 
  AlertTriangle, 
  RefreshCw,
  Search,
  BookOpen,
  Bot,
  User,
  Compass,
  CheckCircle2,
  Trash2,
  Download
} from 'lucide-react';
import { cn, resolveApiUrl } from '../utils';
import { NoorAISkeleton } from './Skeletons';

interface Source {
  title: string;
  uri: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: Source[];
}

export default function NoorAIChat({ onBack }: { onBack: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('noor_ai_chat_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Persist messages
  useEffect(() => {
    try {
      localStorage.setItem('noor_ai_chat_history', JSON.stringify(messages));
    } catch (e) {
      console.error("Failed to persist chat history", e);
    }
  }, [messages]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    if (!textToSend) {
      setInput('');
    }

    setError(null);

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const res = await fetch(resolveApiUrl('/api/noor-ai'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages })
      });

      let data: any;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || `Request failed with status ${res.status}`);
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate response');
      }

      const assistantMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        role: 'assistant',
        content: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: data.sources || []
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    if (window.confirm('کیا آپ اس گفتگو کو حذف کرنا چاہتے ہیں؟ (Are you sure you want to clear this chat?)')) {
      setMessages([]);
      setError(null);
    }
  };

  const renderParsedContent = (content: string) => {
    const regex = /\$\$DOWNLOAD_CARD\$\$\[(.*?)\]\$\$DOWNLOAD_CARD\$\_/g;
    // We will support both $$DOWNLOAD_CARD$$[...]$$DOWNLOAD_CARD$$ and with a trailing _ if there are typos
    const cleanContent = content.replace(/\$\$DOWNLOAD_CARD\$\_/g, '$$DOWNLOAD_CARD$$');
    const actualRegex = /\$\$DOWNLOAD_CARD\$\$\[(.*?)\]\$\$DOWNLOAD_CARD\$\$/g;
    
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = actualRegex.exec(cleanContent)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: cleanContent.substring(lastIndex, match.index)
        });
      }

      parts.push({
        type: 'card',
        content: match[1]
      });

      lastIndex = actualRegex.lastIndex;
    }

    if (lastIndex < cleanContent.length) {
      parts.push({
        type: 'text',
        content: cleanContent.substring(lastIndex)
      });
    }

    if (parts.length === 0) {
      return <span className="Urdu whitespace-pre-line">{content}</span>;
    }

    return (
      <div className="space-y-3">
        {parts.map((part, idx) => {
          if (part.type === 'text') {
            return (
              <span key={idx} className="Urdu whitespace-pre-line block">
                {part.content}
              </span>
            );
          } else {
            const cardParts = part.content.split('|').map(p => p.trim());
            const title = cardParts[0] || 'کتاب (Book)';
            const url = cardParts[1] || '';
            const size = cardParts[2] || 'مفت پی ڈی ایف (Free PDF)';
            const author = cardParts[3] || 'مصنف (Islamic Scholar)';

            return (
              <div 
                key={idx}
                className="my-3 p-4 bg-emerald-50 dark:bg-[#1a2e26]/60 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:shadow transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#00a884]/10 dark:bg-[#00a884]/20 flex items-center justify-center text-[#00a884] shrink-0">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div className="text-right sm:text-left">
                    <h4 className="font-bold text-[#111b21] dark:text-[#e9edef] text-sm Urdu leading-snug line-clamp-2">
                      {title}
                    </h4>
                    <p className="text-[11px] text-[#667781] dark:text-[#8696a0] Urdu mt-0.5">
                      {author}
                    </p>
                    <span className="inline-block mt-1 text-[9px] bg-[#00a884]/10 text-[#00a884] px-2 py-0.5 rounded font-bold">
                      {size}
                    </span>
                  </div>
                </div>

                {url && (
                  <button
                    onClick={() => window.open(url, '_blank')}
                    className="w-full sm:w-auto px-4 py-2 bg-[#00a884] hover:bg-[#008f72] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 shrink-0"
                  >
                    <Download size={14} />
                    <span className="Urdu font-bold text-xs">ڈاؤنلوڈ (Download)</span>
                  </button>
                )}
              </div>
            );
          }
        })}
      </div>
    );
  };

  const samplePrompts = [
    { text: 'آج کی ایک اچھی بات بتائیں', urdu: 'آج کی ایک اچھی بات بتائیں' },
    { text: 'قرآن پاک میں صبر کی کیا تعلیمات ہیں؟', urdu: 'قرآن پاک میں صبر کی کیا تعلیمات ہیں؟' },
    { text: 'Darul Ifta Karachi fatwas about digital transaction', urdu: 'دارالافتاء کراچی کے ڈیجیٹل لین دین پر فتاویٰ' },
    { text: 'فضیلتِ نمازِ تہجد پر روشنی ڈالیں', urdu: 'فضیلتِ نمازِ تہجد پر روشنی ڈالیں' }
  ];

  return (
    <div className="flex flex-col h-full bg-[#f0f7f4] dark:bg-[#0b141a] overflow-hidden transition-colors duration-300">
      {/* Header */}
      <div className="bg-white/80 dark:bg-[#202c33]/90 backdrop-blur-md px-4 py-3 sm:px-6 sm:py-4 border-b border-emerald-100/50 dark:border-white/5 z-20 flex items-center justify-between shrink-0 safe-area-top shadow-sm">
        <div className="flex items-center gap-3 text-[#008069] dark:text-white">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={onBack} 
            className="p-2 hover:bg-emerald-50 dark:hover:bg-white/5 rounded-full transition-colors text-[#008069] dark:text-[#aebac1]"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6" />
          </motion.button>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/30 overflow-hidden">
                <Bot className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-[#202c33]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm sm:text-base font-bold text-[#111b21] dark:text-[#e9edef] Urdu leading-tight">نور اے آئی (Noor AI)</h2>
                <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[8px] sm:text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Online</div>
              </div>
              <p className="text-[#667781] dark:text-[#8696a0] text-[9px] sm:text-[11px] Urdu mt-0.5 line-clamp-1">آن لائن اسلامی اسسٹنٹ (AI Assistant)</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={clearChat}
              className="p-2 text-[#667781] dark:text-[#8696a0] hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-full transition-all"
              title="Clear Chat"
            >
              <Trash2 size={18} />
            </motion.button>
          )}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col justify-between overflow-hidden relative">
        {/* Background Pattern Overlay */}
        <div className="absolute inset-0 z-0 bg-[url('https://static.whatsapp.net/rsrc.php/v3/yl/r/gi_tyrwa_87.png')] dark:bg-[url('https://static.whatsapp.net/rsrc.php/v3/y6/r/wa669ae5z23.png')] bg-repeat opacity-[0.04] dark:opacity-[0.05] pointer-events-none" />
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-2 py-4 sm:px-6 lg:px-8 space-y-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-800 relative z-10">
          {messages.length === 0 ? (
            <div className="w-full max-w-4xl mx-auto py-8 sm:py-12 flex flex-col items-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full bg-white dark:bg-[#111b21] p-6 sm:p-10 rounded-[32px] sm:rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-gray-100 dark:border-white/5 space-y-8"
              >
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-100 dark:border-emerald-900/30">
                    <Sparkles size={40} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-[#111b21] dark:text-[#e9edef] Urdu">
                      السلام علیکم! میں نور اے آئی ہوں
                    </h3>
                    <p className="text-xs sm:text-sm text-[#667781] dark:text-[#8696a0] Urdu leading-relaxed mt-2 max-w-sm mx-auto">
                      میں آپ کا معتبر اسلامی ساتھی ہوں۔ میں آپ کو قرآنی تعلیمات، حدیث، فقہ، اور لائیو فتاویٰ کی معلومات فراہم کرنے کے لیے حاضر ہوں۔
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 px-1">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 dark:via-white/10 to-transparent" />
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-[#667781] dark:text-[#8696a0] Urdu">
                      تجویز کردہ سوالات
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent via-gray-200 dark:via-white/10 to-transparent" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {samplePrompts.map((p, i) => (
                      <motion.button
                        key={i}
                        whileHover={{ scale: 1.02, translateY: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSend(p.text)}
                        className="text-right text-xs text-[#111b21] dark:text-[#e9edef] bg-gray-50 dark:bg-[#202c33] hover:bg-emerald-50 dark:hover:bg-emerald-900/10 p-4 rounded-2xl border border-gray-100 dark:border-white/5 transition-all flex items-center gap-3 group shadow-sm hover:shadow-md"
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                          <Compass size={16} />
                        </div>
                        <span className="Urdu flex-1 font-medium">{p.urdu}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="w-full space-y-6">
              {messages.map((m, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  key={m.id}
                  className={cn(
                    "flex w-full group",
                    m.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div className={cn(
                    "flex items-end gap-2 max-w-[98%] sm:max-w-[90%] md:max-w-[85%]",
                    m.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}>
                    <div className={cn(
                      "w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm mb-1",
                      m.role === 'user' ? "bg-emerald-600" : "bg-[#00a884]"
                    )}>
                      {m.role === 'user' ? <User size={14} /> : <Bot size={16} />}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div 
                        className={cn(
                          "relative rounded-2xl p-3.5 sm:p-4 shadow-sm text-sm sm:text-base leading-relaxed break-words",
                          m.role === 'user' 
                            ? "bg-[#005c4b] text-white rounded-br-none shadow-emerald-900/10" 
                            : "bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] rounded-bl-none border border-emerald-100/50 dark:border-white/5"
                        )}
                      >
                        {m.role === 'assistant' ? renderParsedContent(m.content) : <span className="Urdu text-right block">{m.content}</span>}
                        
                        <div className={cn(
                          "flex items-center gap-1.5 mt-2 opacity-60 text-[9px] sm:text-[10px]",
                          m.role === 'user' ? "justify-end text-emerald-50" : "justify-start text-[#667781] dark:text-[#8696a0]"
                        )}>
                          <span>{m.timestamp}</span>
                          {m.role === 'user' && <CheckCircle2 size={10} />}
                        </div>
                      </div>

                      {/* Cited Sources section */}
                      {m.sources && m.sources.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-2 p-3 bg-white/50 dark:bg-[#202c33]/50 backdrop-blur-sm rounded-xl border border-gray-100 dark:border-white/5 space-y-2"
                        >
                          <span className="text-[9px] uppercase tracking-wider font-bold text-[#667781] dark:text-[#8696a0] flex items-center gap-1.5">
                            <BookOpen size={12} className="text-emerald-500" /> تصدیق شدہ ذرائع (References):
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {m.sources.map((s, idx) => (
                              <a
                                key={idx}
                                href={s.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#111b21] hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-gray-100 dark:border-white/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] sm:text-xs font-bold transition-all max-w-full group shadow-sm"
                              >
                                <span className="truncate max-w-[120px] sm:max-w-[200px]">{s.title}</span>
                                <ExternalLink size={10} className="shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                              </a>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Typing indicator */}
          {loading && (
            <div className="max-w-4xl mx-auto w-full px-2">
              <NoorAISkeleton />
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-2xl mx-auto p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex flex-col sm:flex-row items-center gap-4 shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="text-red-700 dark:text-red-400 text-xs sm:text-sm font-bold Urdu">{error}</p>
              </div>
              <button 
                onClick={() => handleSend()}
                className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-red-600/20"
              >
                <RefreshCw size={12} className="animate-spin-slow" /> دوبارہ کوشش کریں (Retry)
              </button>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="px-4 py-3 sm:px-6 sm:py-5 bg-white/80 dark:bg-[#202c33]/90 backdrop-blur-md border-t border-emerald-100 dark:border-white/5 relative z-20 flex justify-center items-end safe-area-bottom">
          <div className="max-w-4xl w-full flex items-end gap-2 sm:gap-3">
            <div className="flex-1 bg-gray-50 dark:bg-[#111b21] rounded-[24px] sm:rounded-[32px] px-2 py-2 flex items-end border border-gray-100 dark:border-emerald-900/20 focus-within:border-emerald-500/50 focus-within:ring-4 focus-within:ring-emerald-500/5 transition-all shadow-inner">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="قرآن، حدیث یا فقہ کے بارے میں سوال لکھیں..."
                className="flex-1 bg-transparent text-[#111b21] dark:text-[#e9edef] px-3 py-2 text-sm sm:text-base focus:outline-none resize-none h-[40px] max-h-[150px] Urdu leading-relaxed placeholder:text-gray-400 dark:placeholder:text-gray-600"
                style={{ minHeight: '40px' }}
                disabled={loading}
              />
            </div>
            <motion.button
              whileHover={input.trim() && !loading ? { scale: 1.05 } : {}}
              whileTap={input.trim() && !loading ? { scale: 0.95 } : {}}
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className={cn(
                "w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all shrink-0 shadow-lg",
                input.trim() && !loading
                  ? "bg-[#00a884] text-white hover:bg-[#008f72] shadow-emerald-500/20"
                  : "bg-gray-200 dark:bg-[#202c33] text-gray-400 cursor-not-allowed opacity-50"
              )}
            >
              <Send size={20} className={cn("transition-transform", input.trim() && !loading && "translate-x-0.5 -translate-y-0.5 rotate-[-10deg]")} />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
