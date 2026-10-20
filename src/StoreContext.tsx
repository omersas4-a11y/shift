import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Budget, Candidate, Equipment, Expense, Meeting, NextMeetingRequirement, ChatMessage } from './types';

interface StoreState {
  equipment: Equipment[];
  requirements: NextMeetingRequirement[];
  meetings: Meeting[];
  candidates: Candidate[];
  budget: Budget;
  currentUser: string | null;
  chatMessages: ChatMessage[];
}

interface StoreContextType extends StoreState {
  setCurrentUser: (user: string | null) => void;
  addEquipment: (eq: Omit<Equipment, 'id'>) => void;
  updateEquipmentStatus: (id: string, status: Equipment['status']) => void;
  addRequirement: (req: Omit<NextMeetingRequirement, 'id' | 'isBrought'>) => void;
  toggleRequirement: (id: string) => void;
  addMeeting: (meeting: Omit<Meeting, 'id'>) => void;
  removeMeeting: (id: string) => void;
  updateMeeting: (id: string, meeting: Omit<Meeting, 'id'>) => void;
  addCandidate: (candidate: Omit<Candidate, 'id' | 'status' | 'messages'>) => Promise<void>;
  addCandidates: (candidates: Omit<Candidate, 'id' | 'status' | 'messages'>[]) => Promise<void>;
  updateCandidateStatus: (id: string, status: Candidate['status']) => Promise<void>;
  removeCandidate: (id: string) => Promise<void>;
  removeAllCandidates: () => Promise<number>;
  addCandidateMessage: (candidateId: string, message: ChatMessage) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  setTotalBudget: (total: number) => void;
  addChannelMessage: (message: Omit<ChatMessage, 'id'>) => void;
}

const defaultState: StoreState = {
  equipment: [], requirements: [], meetings: [], candidates: [],
  budget: { totalAnnual: 5000, expenses: [] }, currentUser: null, chatMessages: [],
};

async function sendStoreAction(action: string, payload: unknown = {}) {
  const response = await fetch('/api/store', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ action, payload }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'שמירת הנתונים נכשלה.');
  }
  const data = await response.json().catch(() => ({}));
  window.dispatchEvent(new Event('shift-store-updated'));
  return data as { deleted?: number };
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const pendingCandidateStatus = useRef(new Map<string, Candidate['status']>());
  const [state, setState] = useState<StoreState>(() => {
    const saved = localStorage.getItem('shift_guild_store');
    return saved ? { ...defaultState, ...JSON.parse(saved) } : defaultState;
  });

  useEffect(() => {
    let active = true;
    let inFlight = false;
    const refresh = async () => {
      if (!active || inFlight || document.visibilityState === 'hidden') return;
      inFlight = true;
      try {
        const response = await fetch('/api/store', { credentials: 'same-origin', cache: 'no-store' });
        if (!response.ok) throw new Error(`Store request failed: ${response.status}`);
        const data = await response.json();
        if (active) setState(s => ({
          ...s,
          ...data,
          candidates: data.candidates.map((candidate: Candidate) => {
            const pendingStatus = pendingCandidateStatus.current.get(candidate.id);
            return pendingStatus ? { ...candidate, status: pendingStatus } : candidate;
          }),
          currentUser: s.currentUser,
        }));
      } catch (error) {
        console.error('Store refresh failed:', error);
      } finally {
        inFlight = false;
      }
    };
    const refreshAfterWrite = () => void refresh();
    const refreshWhenVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    void refresh();
    const interval = window.setInterval(() => void refresh(), 8000);
    window.addEventListener('shift-store-updated', refreshAfterWrite);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('shift-store-updated', refreshAfterWrite);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('shift_guild_store', JSON.stringify({ currentUser: state.currentUser }));
  }, [state.currentUser]);

  const setCurrentUser = (currentUser: string | null) => setState(s => ({ ...s, currentUser }));
  const addEquipment = async (eq: Omit<Equipment, 'id'>) => sendStoreAction('equipment.add', eq);
  const updateEquipmentStatus = async (id: string, status: Equipment['status']) => sendStoreAction('equipment.status', { id, status });
  const addRequirement = async (req: Omit<NextMeetingRequirement, 'id' | 'isBrought'>) => sendStoreAction('requirement.add', req);
  const toggleRequirement = async (id: string) => sendStoreAction('requirement.toggle', { id });
  const addMeeting = async (meeting: Omit<Meeting, 'id'>) => sendStoreAction('meeting.add', meeting);
  const removeMeeting = async (id: string) => sendStoreAction('meeting.remove', { id });
  const updateMeeting = async (id: string, meeting: Omit<Meeting, 'id'>) => sendStoreAction('meeting.update', { id, meeting });
  const addCandidate = async (candidate: Omit<Candidate, 'id' | 'status' | 'messages'>) => { await sendStoreAction('candidate.add', { candidate }); };
  const addCandidates = async (candidates: Omit<Candidate, 'id' | 'status' | 'messages'>[]) => {
    for (let start = 0; start < candidates.length; start += 50) {
      await sendStoreAction('candidate.addMany', { candidates: candidates.slice(start, start + 50) });
    }
  };
  const updateCandidateStatus = async (id: string, status: Candidate['status']) => {
    const previousStatus = state.candidates.find(candidate => candidate.id === id)?.status ?? 'pending';
    pendingCandidateStatus.current.set(id, status);
    setState(s => ({
      ...s,
      candidates: s.candidates.map(candidate => candidate.id === id ? { ...candidate, status } : candidate),
    }));

    try {
      await sendStoreAction('candidate.status', { id, status });
    } catch (error) {
      if (pendingCandidateStatus.current.get(id) === status) pendingCandidateStatus.current.delete(id);
      setState(s => ({
        ...s,
        candidates: s.candidates.map(candidate =>
          candidate.id === id && candidate.status === status ? { ...candidate, status: previousStatus } : candidate
        ),
      }));
      throw error;
    } finally {
      if (pendingCandidateStatus.current.get(id) === status) pendingCandidateStatus.current.delete(id);
      window.dispatchEvent(new Event('shift-store-updated'));
    }
  };
  const removeCandidate = async (id: string) => { await sendStoreAction('candidate.remove', { id }); };
  const removeAllCandidates = async () => {
    const result = await sendStoreAction('candidate.removeAll');
    return result.deleted ?? 0;
  };
  const addCandidateMessage = async (id: string, message: ChatMessage) => { await sendStoreAction('candidate.message', { id, message }); };
  const addExpense = async (expense: Omit<Expense, 'id'>) => sendStoreAction('budget.expense', { expense });
  const setTotalBudget = async (totalAnnual: number) => sendStoreAction('budget.total', { totalAnnual });
  const addChannelMessage = async (message: Omit<ChatMessage, 'id'>) => sendStoreAction('chat.add', { message });

  return (
    <StoreContext.Provider value={{
      ...state, setCurrentUser, addEquipment, updateEquipmentStatus, addRequirement, toggleRequirement,
      addMeeting, removeMeeting, updateMeeting, addCandidate, addCandidates, updateCandidateStatus,
      removeCandidate, removeAllCandidates, addCandidateMessage, addExpense, setTotalBudget, addChannelMessage,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
