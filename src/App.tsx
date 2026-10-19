import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import LogisticsView from './components/views/LogisticsView';
import SyllabusView from './components/views/SyllabusView';
import BudgetView from './components/views/BudgetView';
import DashboardView from './components/views/DashboardView';
import LoginView from './components/views/LoginView';
import CandidatesView from './components/views/CandidatesView';
import { MessageSquare } from 'lucide-react';
import { useStore } from './StoreContext';

export default function App() {
  const { currentUser } = useStore();
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
        return <LogisticsView />;
      case 'syllabus':
        return <SyllabusView />;
      case 'budget':
        return <BudgetView />;
      case 'candidates':
        return <CandidatesView />;
      case 'dashboard':
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="shift-shell flex h-screen w-full bg-bg overflow-hidden font-sans text-text-main">
      <div className="shift-pixel-field" aria-hidden="true">
        <span className="pixel-particle pixel-sprite--heart" />
        <span className="pixel-particle pixel-sprite--coin" />
        <span className="pixel-particle pixel-sprite--star" />
        <span className="pixel-particle pixel-sprite--controller" />
        <span className="pixel-particle pixel-sprite--bolt" />
      </div>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
      
      <main className="shift-main relative z-[1] flex-1 h-full overflow-y-auto">
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="relative z-10 p-8 min-h-full">
          {renderContent()}
        </div>

        {!isChatOpen && (
          <button 
            onClick={() => setIsChatOpen(true)}
            className="flex md:!hidden absolute bottom-6 left-6 z-50 gaming-button !bg-surface !p-4 shadow-lg border-2 border-brand"
            title="פתח צ'אט"
          >
            <MessageSquare size={24} className="text-brand" />
          </button>
        )}
      </main>

      <ChatPanel activeTab={activeTab} isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} onOpen={() => setIsChatOpen(true)} />
    </div>
  );
}
