import { useStore } from '../../StoreContext';

const USERS = [
  "אליאור",
  "עומר",
  "טל ג'וניור",
  "יוגב",
  "טל סניור"
];

export default function LoginView() {
  const { setCurrentUser } = useStore();

  const handleLogin = (user: string) => {
    setCurrentUser(user);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg text-text-main font-sans w-full p-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="z-10 text-center w-full max-w-md">
        <div className="w-64 h-auto mx-auto mb-8 flex items-center justify-center">
          <img src="/logos/shift logo.png" alt="Shift Logo" className="w-full h-auto object-contain drop-shadow-[0_0_15px_rgba(var(--brand),0.3)]" />
        </div>
        
        <h1 className="text-3xl font-black text-text-main mb-2">ברוכים הבאים למערכת SHIFT</h1>
        <p className="text-text-muted mb-8">אנא בחרו משתמש כדי להתחבר למערכת</p>
        
        <div className="flex flex-col gap-4">
          {USERS.map(user => (
            <button
              key={user}
              onClick={() => handleLogin(user)}
              className="gaming-button text-xl py-4"
            >
              {user}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
