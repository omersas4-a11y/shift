import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import LogisticsView from './components/views/LogisticsView';
import SyllabusView from './components/views/SyllabusView';
import BudgetView from './components/views/BudgetView';
import DashboardView from './components/views/DashboardView';
import LoginView from './components/views/LoginView';
import CandidatesView from './components/views/CandidatesView';
import { MessageSquare, RefreshCw, WifiOff } from 'lucide-react';
import { useStore } from './StoreContext';

export default function App() {
  const { currentUser, syncStatus, hasLoaded, retrySync } = useStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  if (!currentUser) {
    return <LoginView />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'logistics':
        return <LogisticsView onOpenSyllabus={() => setActiveTab('syllabus')} />;
      case 'syllabus':
        return <SyllabusView />;
      case 'budget':
        return <BudgetView />;
      case 'candidates':
        return <CandidatesView />;
      case 'dashboard':
      default:
        return <DashboardView onOpenSyllabus={() => setActiveTab('syllabus')} />;
    }
  };

  return (
    <div className="shift-shell flex h-[100dvh] min-h-[100svh] w-full flex-col overflow-hidden bg-bg font-sans text-text-main md:flex-row">
      <div className="shift-pixel-field" aria-hidden="true">
        <span className="pixel-particle pixel-sprite--heart" />
        <span className="pixel-particle pixel-sprite--coin" />
        <span className="pixel-particle pixel-sprite--star" />
        <span className="pixel-particle pixel-sprite--controller" />
        <span className="pixel-particle pixel-sprite--bolt" />
      </div>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
      
      <main className="shift-main relative z-[1] min-h-0 w-full flex-1 overflow-x-hidden overflow-y-auto pb-[env(safe-area-inset-bottom)] md:h-full">
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="relative z-10 min-h-full px-4 pb-28 pt-5 sm:px-6 md:p-8">
          {syncStatus === 'error' && (
            <div role="alert" className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-bold text-text-main">
              <WifiOff size={19} className="shrink-0 text-amber-600" aria-hidden="true" />
              <span className="min-w-0 flex-1">החיבור לנתונים אינו זמין כרגע. {hasLoaded ? 'מוצגים הנתונים מהטעינה האחרונה; ייתכן שיש שינויים שעדיין לא מופיעים.' : 'הנתונים לא נטענו ולכן אינם מוצגים כרגע.'}</span>
              <button type="button" onClick={retrySync} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-surface px-3 py-1.5 text-xs font-black text-text-main transition hover:bg-amber-500/10">
                <RefreshCw size={14} aria-hidden="true" /> נסו שוב
              </button>
            </div>
          )}
          {hasLoaded ? renderContent() : syncStatus === 'loading' ? (
            <div role="status" className="flex min-h-64 items-center justify-center gap-3 text-sm font-bold text-text-muted">
              <RefreshCw size={20} className="animate-spin text-brand" aria-hidden="true" /> טוען נתונים…
            </div>
          ) : null}
        </div>

        {hasLoaded && !isChatOpen && (
          <button 
            onClick={() => setIsChatOpen(true)}
            className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-4 z-30 flex md:!hidden gaming-button !bg-surface !p-3 shadow-lg border-2 border-brand"
            title="פתח צ'אט"
          >
            <MessageSquare size={21} className="text-brand" />
          </button>
        )}
      </main>

      {hasLoaded && <ChatPanel activeTab={activeTab} isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} onOpen={() => setIsChatOpen(true)} />}
    </div>
  );
}
