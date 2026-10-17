import React from "react";
import { LayoutDashboard, Package, Calendar, Wallet, Sun, Moon, LogOut } from 'lucide-react';
import { useStore } from '../StoreContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDarkMode: boolean;
  setIsDarkMode: (isDark: boolean) => void;
}

export default function Sidebar({ activeTab, setActiveTab, isDarkMode, setIsDarkMode }: SidebarProps) {
  const { currentUser, setCurrentUser } = useStore();
  
  const navItems = [
    { id: 'dashboard', label: 'מסך בית', icon: LayoutDashboard },
    { id: 'logistics', label: 'לוגיסטיקה', icon: Package },
    { id: 'syllabus', label: 'סילבוס', icon: Calendar },
    { id: 'budget', label: 'תקציב', icon: Wallet },
  ];

  return (
    <aside className="w-64 bg-surface border-l border-border h-full flex flex-col z-20 shadow-[4px_0_15px_rgba(0,0,0,0.05)]">
      <div className="p-8 flex justify-center border-b border-border">
        {/* SHIFT Logo */}
        <div className="w-32 h-16 flex items-center justify-center">
          <img src="/logos/shift logo.png" alt="Shift Logo" className="w-full h-full object-contain" />
        </div>
      </div>
      
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
            <div className="w-10 h-10 rounded-full bg-brand/20 flex items-center justify-center border border-brand text-brand font-bold text-sm">
              {currentUser ? currentUser.substring(0, 2).toUpperCase() : 'GM'}
            </div>
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
  );
}
