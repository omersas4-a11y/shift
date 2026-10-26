import { useState, useRef, useEffect, type FormEvent } from 'react';
import { ArrowLeft, MessageSquare, X, ChevronRight, Sparkles } from 'lucide-react';
import { useStore } from '../StoreContext';

interface ChatPanelProps {
  activeTab: string;
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}

const getTabName = (tab: string) => {
  switch (tab) {
    case 'logistics': return 'ארסנל וציוד';
    case 'syllabus': return 'סילבוס ומשימות';
    case 'candidates': return 'מיונים ומועמדים';
    case 'budget': return 'משאבים ותקציב';
    default: return 'מפקדה';
  }
};

export default function ChatPanel({ activeTab, isOpen, onClose, onOpen }: ChatPanelProps) {
  const { currentUser, chatMessages, addChannelMessage } = useStore();
  const [inputText, setInputText] = useState('');
  const [sendError, setSendError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentMessages = chatMessages
    .filter(message => message.channelId === activeTab || (!message.channelId && activeTab === 'dashboard'))
    .sort((a, b) => {
      const timeA = (a as { createdAt?: string }).createdAt || a.id;
      const timeB = (b as { createdAt?: string }).createdAt || b.id;
      return timeA > timeB ? 1 : -1;
    });

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeTab, isOpen]);

  const handleSendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const message = inputText.trim();
    if (!message || isSending) return;
    setInputText('');
    setSendError('');
    setIsSending(true);
    try {
      await addChannelMessage({
        senderName: currentUser || 'משתמש לא ידוע',
        text: message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        channelId: activeTab
      });
    } catch (error) {
      console.error('Chat message send failed:', error);
      setInputText(message);
      setSendError('לא הצלחנו לשלוח את ההודעה. אפשר לנסות שוב.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <aside className={`chat-panel flex flex-col overflow-hidden transition-all duration-300 ease-in-out md:relative md:z-20 md:h-full md:shrink-0 ${isOpen ? 'fixed inset-x-0 bottom-0 top-14 z-40 w-full opacity-100 md:static md:z-20 md:w-80' : 'fixed inset-0 -z-10 h-0 w-0 opacity-0 md:static md:z-20 md:h-full md:w-[84px] md:opacity-100'}`}>
      {!isOpen && (
        <div className="chat-rail fixed bottom-0 left-0 top-0 z-20 hidden h-screen w-[84px] flex-col items-center md:flex">
          <div className="chat-rail__header flex h-[129px] w-full shrink-0 items-center justify-center border-b border-border">
            <button type="button" onClick={onOpen} aria-label="פתח צ׳אט צוות" title="פתח צ׳אט צוות" className="chat-rail__open group flex w-full flex-col items-center gap-2 py-2 text-text-muted transition-colors hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-brand">
              <span className="chat-rail__icon relative flex h-12 w-12 items-center justify-center rounded-2xl border border-brand/25 bg-brand/10 text-brand transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-brand group-hover:bg-brand group-hover:text-white">
                <MessageSquare size={21} strokeWidth={2.2} />
                <span className="chat-rail__chevron absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-brand/40 bg-surface text-text-main shadow-sm transition-all group-hover:translate-x-0.5 group-hover:border-brand group-hover:text-brand"><ChevronRight size={17} strokeWidth={2.75} /></span>
              </span>
              <span className="text-xs font-extrabold tracking-wide">צ׳אט צוות</span>
            </button>
          </div>
        </div>
      )}

      <div className={`flex min-h-0 min-w-0 flex-col transition-opacity duration-300 md:h-full md:min-w-[320px] ${isOpen ? 'h-full opacity-100' : 'pointer-events-none h-0 opacity-0 md:h-full'}`}>
        <header className="chat-header flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-sm"><MessageSquare size={19} strokeWidth={2.4} /></span>
            <div className="min-w-0 text-right">
              <h2 className="text-base font-black leading-tight text-text-main">צ׳אט הצוות</h2>
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs font-bold text-brand"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{getTabName(activeTab)}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="סגור צ׳אט" className="rounded-xl border border-border bg-surface p-2 text-text-muted transition-colors hover:border-brand/40 hover:text-brand"><X size={18} /></button>
        </header>

        <div className="chat-messages min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-5 sm:px-4">
          {currentMessages.length === 0 ? (
            <div className="mx-auto mt-10 flex max-w-[240px] flex-col items-center text-center">
              <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-brand/20 bg-brand/10 text-brand"><Sparkles size={24} /></span>
              <strong className="text-sm text-text-main">השיחה מתחילה כאן</strong>
              <p className="mt-1 text-xs leading-relaxed text-text-muted">כתבו הודעה לחברי הצוות בערוץ {getTabName(activeTab)}.</p>
            </div>
          ) : currentMessages.map(message => {
            const isMe = message.senderName === currentUser && !message.isSystem;
            if (message.isSystem) return (
              <div key={message.id} className="flex justify-center">
                <div className="max-w-[90%] rounded-full border border-border bg-surface px-3 py-1.5 text-center text-[11px] text-text-muted">{message.text}</div>
              </div>
            );
            return (
              <div key={message.id} className={`flex w-full ${isMe ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[88%] min-w-0 text-right ${isMe ? 'items-start' : 'items-end'} flex flex-col`}>
                  <span className="mb-1 px-1 text-[11px] font-bold text-text-muted">{isMe ? 'אני' : message.senderName}</span>
                  <div className={`chat-bubble max-w-full break-words whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${isMe ? 'chat-bubble--mine rounded-tr-md' : 'chat-bubble--theirs rounded-tl-md'}`}>{message.text}</div>
                  <span dir="ltr" className="mt-1 px-1 text-[10px] text-text-muted">{message.timestamp}</span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <footer className="chat-footer shrink-0 border-t border-border px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-4">
          {sendError && <p role="alert" className="mb-2 text-xs font-bold text-red-600 dark:text-red-300">{sendError}</p>}
          <form onSubmit={handleSendMessage} className="flex min-w-0 items-center gap-2 rounded-2xl border border-border bg-surface p-1.5 shadow-sm focus-within:border-brand">
            <input type="text" value={inputText} onChange={event => setInputText(event.target.value)} placeholder="כתבו הודעה לצוות..." aria-label="הודעה לצוות" className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-text-main outline-none placeholder:text-text-muted" />
            <button type="submit" disabled={!inputText.trim() || isSending} aria-label="שלח הודעה" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"><ArrowLeft size={18} strokeWidth={2.5} aria-hidden="true" /></button>
          </form>
        </footer>
      </div>
    </aside>
  );
}
