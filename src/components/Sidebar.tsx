import React from "react";
import { useState } from 'react';
import { LayoutDashboard, Package, Calendar, Wallet, Sun, Moon, LogOut, ClipboardList, FolderOpen, UsersRound, Link2, Bell } from 'lucide-react';
import { useStore } from '../StoreContext';
import ActivityDrawer from './ActivityDrawer';
import TeamAvatar from './TeamAvatar';
import type { ActivityEvent } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDarkMode: boolean;
  setIsDarkMode: (isDark: boolean) => void;
  onSelectActivity: (event: ActivityEvent) => void;
}

export default function Sidebar({ activeTab, setActiveTab, isDarkMode, setIsDarkMode, onSelectActivity }: SidebarProps) {
  const { currentUser, setCurrentUser, activityEvents } = useStore();
  const [showQuickLinks, setShowQuickLinks] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState(() => localStorage.getItem('shift_activity_last_seen') || '');
  const unreadCount = activityEvents.filter(event => event.createdAt > lastSeenAt).length;
  const openActivity = () => {
    const now = new Date().toISOString();
    localStorage.setItem('shift_activity_last_seen', now);
    setLastSeenAt(now);
    setShowActivity(true);
    setShowQuickLinks(false);
  };
  const quickLinks = [
    { label: 'גוגל דרייב', href: 'https://drive.google.com/drive/folders/1CmZ8x8sKlgQ6DnMftvjlJc1D4e3b02iq?usp=drive_link', icon: FolderOpen },
    { label: 'מערכת ניהול ראיונות', href: 'https://script.google.com/macros/s/AKfycbzvnw8KLdFN3uqjwuz52JBWglyHCW7v6qLkh-C9nT5y5muadORB0Oie9UTB1AUOaithSg/exec?view=team', icon: UsersRound },
  ];
  
  const navItems = [
    { id: 'dashboard', label: 'מסך בית', icon: LayoutDashboard },
    { id: 'candidates', label: 'מיונים', icon: ClipboardList },
    { id: 'logistics', label: 'לוגיסטיקה', icon: Package },
    { id: 'syllabus', label: 'סילבוס', icon: Calendar },
    { id: 'budget', label: 'תקציב', icon: Wallet },
  ];

  return (
    <>
    <header className="md:hidden relative z-20 flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4 shadow-sm">
      <div className="flex h-10 w-20 items-center"><img src="/logos/shift logo.png" alt="Shift" className="h-full w-full object-contain" /></div>
      <div className="flex items-center gap-2">
        <span className="hidden max-w-28 truncate text-xs font-bold text-text-muted min-[480px]:inline">{currentUser || 'מנהל מערכת'}</span>
        <button type="button" onClick={openActivity} aria-label={`התראות${unreadCount ? `, ${unreadCount} חדשות` : ''}`} className="relative grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface-alt text-text-main"><Bell size={18} />{unreadCount > 0 && <span className="absolute -left-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}</button>
        <button type="button" onClick={() => setShowQuickLinks(!showQuickLinks)} aria-expanded={showQuickLinks} aria-label="קישורים מהירים" className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface-alt text-text-main"><Link2 size={18} /></button>
        <button type="button" onClick={() => setIsDarkMode(!isDarkMode)} aria-label={isDarkMode ? 'מצב יום' : 'מצב לילה'} className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface-alt text-text-main"><span className="sr-only">{isDarkMode ? 'מצב יום' : 'מצב לילה'}</span>{isDarkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
        <button type="button" onClick={() => setCurrentUser(null)} aria-label="החלף משתמש" className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface-alt text-text-main"><LogOut size={18} /></button>
      </div>
      {showQuickLinks && <div className="absolute left-4 right-4 top-14 z-30 space-y-2 rounded-xl border border-border bg-surface p-3 shadow-lg">
        {quickLinks.map(link => { const Icon = link.icon; return <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" onClick={() => setShowQuickLinks(false)} className="flex items-center gap-3 rounded-lg border border-border bg-surface-alt px-3 py-3 text-sm font-bold text-text-main"><Icon size={18} className="text-brand" />{link.label}</a>; })}
      </div>}
    </header>
    <aside className="shift-sidebar hidden w-64 bg-surface border-l border-border h-full flex-col z-20 shadow-[4px_0_15px_rgba(0,0,0,0.05)] md:flex">
      <div className="p-8 flex justify-center border-b border-border">
        {/* SHIFT Logo */}
        <div className="w-32 h-16 flex items-center justify-center">
          <img src="/logos/shift logo.png" alt="Shift Logo" className="w-full h-full object-contain" />
        </div>
      </div>
      
      <button type="button" onClick={openActivity} className="mx-4 mt-4 flex items-center gap-3 rounded-xl border border-border bg-surface-alt px-4 py-3 text-right text-sm font-bold text-text-main transition-colors hover:border-brand hover:text-brand"><span className="relative"><Bell size={19} />{unreadCount > 0 && <span className="absolute -left-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-0.5 text-[9px] font-black text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}</span>התראות ופעילות</button>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-right font-bold transition-all duration-300 relative group ${
                isActive 
                  ? 'bg-brand text-white rounded-2xl border-[3px] border-black/40 shadow-[0_4px_0_0_rgba(0,0,0,0.4),inset_0_4px_0_0_rgba(255,255,255,0.3)] transform -translate-y-1' 
                  : 'text-text-muted hover:text-text-main hover:bg-surface-alt rounded-lg'
              }`}
              style={isActive ? { textShadow: '0px 2px 0px rgba(0,0,0,0.3)' } : {}}
            >
              <Icon size={20} className={`relative z-10 ${isActive ? 'text-white drop-shadow-md' : 'group-hover:text-brand'}`} />
              <span className="relative z-10">{item.label}</span>
            </button>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-border flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          {quickLinks.map(link => { const Icon = link.icon; return <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-border bg-surface-alt px-4 py-2.5 text-sm font-bold text-text-main transition-colors hover:border-brand hover:text-brand"><Icon size={18} />{link.label}</a>; })}
        </div>
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="gaming-button-outline w-full !text-text-main !border-text-main hover:!bg-text-main hover:!text-surface"
          style={{ boxShadow: '4px 4px 0px 0px var(--theme-text-main)' }}
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          <span className="text-sm font-bold uppercase">{isDarkMode ? 'מצב יום' : 'מצב לילה'}</span>
        </button>

        <div className="flex items-center justify-between p-3 bg-surface rounded border border-border group">
          <div className="flex items-center gap-3">
            <TeamAvatar name={currentUser} />
            <div>
              <div className="text-sm font-bold text-text-main truncate max-w-[100px]">{currentUser || 'Guild Master'}</div>
              <div className="text-xs text-text-muted">מנהל מערכת</div>
            </div>
          </div>
          <button 
            onClick={() => setCurrentUser(null)}
            className="p-2 text-text-muted hover:text-brand hover:bg-brand/10 rounded transition-colors"
            title="החלף משתמש"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
    <nav aria-label="ניווט ראשי" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border bg-surface/95 px-1 pt-1 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur md:hidden" style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return <button key={item.id} type="button" onClick={() => setActiveTab(item.id)} aria-current={isActive ? 'page' : undefined} className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-bold leading-none transition-colors ${isActive ? 'bg-brand/10 text-brand' : 'text-text-muted'}`}><Icon size={20} strokeWidth={isActive ? 2.6 : 2} /><span className="truncate">{item.label}</span></button>;
      })}
    </nav>
    {showActivity && <ActivityDrawer events={activityEvents} onClose={() => setShowActivity(false)} onSelect={event => { onSelectActivity(event); setShowActivity(false); }} />}
    </>
  );
}
