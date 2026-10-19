import React from "react";
import { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, X, ChevronRight } from 'lucide-react';
import { useStore } from '../StoreContext';

interface ChatMessage {
  id: string;
  senderName: string;
  isSystem?: boolean;
  text: string;
  timestamp: string;
}

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
    case 'dashboard':
    default: return 'מפקדה';
  }
};

export default function ChatPanel({ activeTab, isOpen, onClose, onOpen }: ChatPanelProps) {
  const { currentUser, chatMessages, addChannelMessage } = useStore();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentMessages = chatMessages
    .filter(msg => msg.channelId === activeTab || (!msg.channelId && activeTab === 'dashboard'))
    .sort((a, b) => {
      // Sort by createdAt if available, otherwise by timestamp or id
      const timeA = (a as any).createdAt || a.id;
      const timeB = (b as any).createdAt || b.id;
      return timeA > timeB ? 1 : -1;
    });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages, activeTab, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    // Save locally so we can clear immediately
    const textToSend = inputText;
    setInputText('');

    await addChannelMessage({
      senderName: currentUser || 'משתמש לא ידוע',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      channelId: activeTab
    });
  };

  return (
    <aside 
      className={`chat-panel relative h-full flex flex-col z-20 transition-all duration-300 ease-in-out overflow-hidden ${
        isOpen 
          ? 'w-80 opacity-100' 
          : 'w-0 md:w-[84px] opacity-0 md:opacity-100'
      }`}
    >
      {/* Collapsed Icon for Desktop */}
      {!isOpen && (
        <div className="chat-rail fixed bottom-0 left-0 top-0 z-20 hidden h-screen w-[84px] flex-col items-center md:flex">
          <div className="chat-rail__header flex h-[129px] w-full shrink-0 items-center justify-center border-b border-border">
            <button
              type="button"
              onClick={onOpen}
              aria-label="פתח צ׳אט צוות"
              title="פתח צ׳אט צוות"
              className="chat-rail__open group flex w-full flex-col items-center gap-2 py-2 text-text-muted transition-colors hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-brand"
            >
              <span className="chat-rail__icon relative flex h-12 w-12 items-center justify-center rounded-2xl border border-brand/25 bg-brand/10 text-brand transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-brand group-hover:bg-brand group-hover:text-white">
                <MessageSquare size={21} strokeWidth={2.2} />
                <span className="chat-rail__chevron absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-brand/40 bg-surface text-text-main shadow-sm transition-all group-hover:translate-x-0.5 group-hover:border-brand group-hover:text-brand">
                  <ChevronRight size={17} strokeWidth={2.75} />
                </span>
              </span>
              <span className="text-xs font-extrabold tracking-wide">צ׳אט צוות</span>
            </button>
          </div>
        </div>
      )}

      <div className={`flex flex-col h-full min-w-[320px] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="text-brand" size={24} />
          <div>
            <h2 className="font-bold text-text-main text-lg">תקשורת צוות</h2>
            <div className="text-xs text-brand font-bold uppercase tracking-wider">{getTabName(activeTab)}</div>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="text-text-muted hover:text-text-main transition-colors p-1"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {currentMessages.length === 0 ? (
          <div className="text-center text-text-muted text-sm mt-10">
            אין הודעות בערוץ זה. היה הראשון לכתוב!
          </div>
        ) : (
          currentMessages.map((msg) => {
            const isMe = msg.senderName === currentUser && !msg.isSystem;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && !msg.isSystem && (
                  <span className="text-xs font-bold text-text-muted mb-1 px-1">{msg.senderName}</span>
                )}
                <div 
                  className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${
                    isMe 
                      ? 'bg-brand text-white rounded-tl-none font-medium' 
                      : msg.isSystem
                      ? 'bg-surface-alt text-text-muted border border-border rounded-tr-none font-mono text-xs'
                      : 'bg-[#2b2d31] text-[#f2f3f5] rounded-tr-none font-medium'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-text-muted mt-1 px-1">{msg.timestamp}</span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-border bg-surface-alt">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="הקלד הודעה..." 
            className="flex-1 bg-surface border border-border rounded px-3 py-2 text-sm text-text-main focus:outline-none focus:border-brand transition-colors"
          />
          <button 
            type="submit"
            className="bg-brand text-white p-2 rounded flex items-center justify-center hover:bg-brand-hover transition-colors shadow-[2px_2px_0px_0px_var(--theme-text-main)] active:translate-y-1 active:translate-x-1 active:shadow-none"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
      </div>
    </aside>
  );
}
