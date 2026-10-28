import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ActivityEvent, Budget, Candidate, Equipment, Expense, Meeting, NextMeetingRequirement, ChatMessage, MeetingEquipment } from './types';
import { normalizeTeamMember } from './team';

interface StoreState {
  equipment: Equipment[];
  meetingEquipment: MeetingEquipment[];
  logisticsEmailRecipients: string[];
  requirements: NextMeetingRequirement[];
  meetings: Meeting[];
  activityEvents: ActivityEvent[];
  candidates: Candidate[];
  budget: Budget;
  currentUser: string | null;
  chatMessages: ChatMessage[];
}

interface StoreContextType extends StoreState {
  syncStatus: 'loading' | 'ready' | 'error';
  hasLoaded: boolean;
  retrySync: () => void;
  setCurrentUser: (user: string | null) => void;
  addEquipment: (eq: Omit<Equipment, 'id'>) => Promise<void>;
  updateEquipment: (id: string, equipment: Omit<Equipment, 'id'>) => Promise<void>;
  removeEquipment: (id: string) => Promise<void>;
  updateEquipmentStatus: (id: string, status: Equipment['status']) => void;
  addRequirement: (req: Omit<NextMeetingRequirement, 'id' | 'isBrought'>) => void;
  toggleRequirement: (id: string) => void;
  addMeeting: (meeting: Omit<Meeting, 'id'>) => Promise<void>;
  removeMeeting: (id: string) => void;
  updateMeeting: (id: string, meeting: Partial<Omit<Meeting, 'id'>>) => Promise<void>;
  addCandidate: (candidate: Omit<Candidate, 'id' | 'status' | 'messages'>) => Promise<void>;
  addCandidates: (candidates: Omit<Candidate, 'id' | 'status' | 'messages'>[]) => Promise<void>;
  updateCandidateStatus: (id: string, status: Candidate['status']) => Promise<void>;
  removeCandidate: (id: string) => Promise<void>;
  removeAllCandidates: () => Promise<number>;
  addMeetingEquipment: (item: Omit<MeetingEquipment, 'id'>) => Promise<void>;
  updateMeetingEquipment: (id: string, item: Omit<MeetingEquipment, 'id'>) => Promise<void>;
  removeMeetingEquipment: (id: string) => Promise<void>;
  setLogisticsEmailRecipients: (recipients: string[]) => Promise<void>;
  addCandidateMessage: (candidateId: string, message: ChatMessage, candidateName: string) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  updateExpense: (id: string, expense: Omit<Expense, 'id'>) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
  setTotalBudget: (total: number) => void;
  addChannelMessage: (message: Omit<ChatMessage, 'id'>) => void;
}

const defaultState: StoreState = {
  equipment: [], meetingEquipment: [], logisticsEmailRecipients: [], requirements: [], meetings: [], activityEvents: [], candidates: [],
  budget: { totalAnnual: 5000, expenses: [] }, currentUser: null, chatMessages: [],
};

async function sendStoreAction(action: string, payload: unknown = {}) {
  const actor = (() => {
    try { return normalizeTeamMember(JSON.parse(localStorage.getItem('shift_guild_store') || '{}').currentUser) || 'חבר צוות'; }
    catch { return 'חבר צוות'; }
  })();
  const response = await fetch('/api/store', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ action, payload, actor }),
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
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  const [syncStatus, setSyncStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [hasLoaded, setHasLoaded] = useState(false);
  const [state, setState] = useState<StoreState>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('shift_guild_store') || '{}');
      return { ...defaultState, currentUser: normalizeTeamMember(saved.currentUser) };
    } catch {
      return defaultState;
    }
  });

  useEffect(() => {
    let active = true;
    let inFlight = false;
    let refreshQueued = false;
    let checkingVersion = false;
    let syncVersion = 0;
    let lastFullAt = 0;
    let lastFullAttemptAt = 0;
    let lastVersionErrorAt = 0;
    let fullRefreshFailed = false;
    let refreshAfterWriteTimer: number | undefined;
    const refresh = async () => {
      if (!active || document.visibilityState === 'hidden') return;
      if (inFlight) {
        refreshQueued = true;
        return;
      }
      inFlight = true;
      lastFullAttemptAt = Date.now();
      try {
        const response = await fetch('/api/store', { credentials: 'same-origin', cache: 'no-store' });
        if (!response.ok) throw new Error(`Store request failed: ${response.status}`);
        const data = await response.json();
        if (active) {
          syncVersion = Number(data.syncVersion ?? 0);
          lastFullAt = Date.now();
          lastVersionErrorAt = 0;
          fullRefreshFailed = false;
          const { syncVersion: _version, ...storeData } = data;
          setState(s => ({
            ...s,
            ...storeData,
            candidates: data.candidates.map((candidate: Candidate) => {
              const pendingStatus = pendingCandidateStatus.current.get(candidate.id);
              return pendingStatus ? { ...candidate, status: pendingStatus } : candidate;
            }),
            currentUser: s.currentUser,
          }));
          setSyncStatus('ready');
          setHasLoaded(true);
        }
      } catch (error) {
        console.error('Store refresh failed:', error);
        fullRefreshFailed = true;
        if (active) setSyncStatus('error');
      } finally {
        inFlight = false;
        if (refreshQueued) {
          refreshQueued = false;
          void refresh();
        }
      }
    };
    refreshRef.current = refresh;

    const checkForChanges = async () => {
      if (!active || document.visibilityState === 'hidden' || inFlight || checkingVersion) return;
      const now = Date.now();
      if (fullRefreshFailed || !lastFullAt || now - lastFullAt >= 12 * 60 * 60_000) {
        if (now - lastFullAttemptAt >= 5 * 60_000) void refresh();
        return;
      }
      if (now - lastVersionErrorAt < 2 * 60_000) return;
      checkingVersion = true;
      try {
        const response = await fetch('/api/store?syncVersion=1', { credentials: 'same-origin' });
        if (!response.ok) throw new Error(`Store version request failed: ${response.status}`);
        const data = await response.json();
        if (!active) return;
        if (Number(data.syncVersion ?? 0) !== syncVersion) await refresh();
        else setSyncStatus('ready');
      } catch (error) {
        console.error('Store version check failed:', error);
        lastVersionErrorAt = Date.now();
        if (active) setSyncStatus('error');
      } finally {
        checkingVersion = false;
      }
    };
    const refreshAfterWrite = () => {
      window.clearTimeout(refreshAfterWriteTimer);
      refreshAfterWriteTimer = window.setTimeout(() => {
        refreshAfterWriteTimer = undefined;
        void refresh();
      }, 300);
    };
    const refreshWhenVisible = () => { if (document.visibilityState === 'visible') void checkForChanges(); };
    void refresh();
    const interval = window.setInterval(() => void checkForChanges(), 30_000);
    window.addEventListener('shift-store-updated', refreshAfterWrite);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      active = false;
      refreshRef.current = async () => {};
      window.clearInterval(interval);
      window.clearTimeout(refreshAfterWriteTimer);
      window.removeEventListener('shift-store-updated', refreshAfterWrite);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('shift_guild_store', JSON.stringify({ currentUser: state.currentUser }));
  }, [state.currentUser]);

  const setCurrentUser = (currentUser: string | null) => setState(s => ({ ...s, currentUser: normalizeTeamMember(currentUser) }));
  const retrySync = () => { void refreshRef.current(); };
  const addEquipment = async (eq: Omit<Equipment, 'id'>) => { await sendStoreAction('equipment.add', eq); };
  const updateEquipment = async (id: string, equipment: Omit<Equipment, 'id'>) => { await sendStoreAction('equipment.update', { id, equipment }); };
  const removeEquipment = async (id: string) => { await sendStoreAction('equipment.remove', { id }); };
  const updateEquipmentStatus = async (id: string, status: Equipment['status']) => sendStoreAction('equipment.status', { id, status });
  const addRequirement = async (req: Omit<NextMeetingRequirement, 'id' | 'isBrought'>) => sendStoreAction('requirement.add', req);
  const toggleRequirement = async (id: string) => sendStoreAction('requirement.toggle', { id });
  const addMeeting = async (meeting: Omit<Meeting, 'id'>) => { await sendStoreAction('meeting.add', meeting); };
  const removeMeeting = async (id: string) => sendStoreAction('meeting.remove', { id });
  const updateMeeting = async (id: string, meeting: Partial<Omit<Meeting, 'id'>>) => { await sendStoreAction('meeting.update', { id, meeting }); };
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
  const addMeetingEquipment = async (item: Omit<MeetingEquipment, 'id'>) => { await sendStoreAction('meetingEquipment.add', { item }); };
  const updateMeetingEquipment = async (id: string, item: Omit<MeetingEquipment, 'id'>) => { await sendStoreAction('meetingEquipment.update', { id, item }); };
  const removeMeetingEquipment = async (id: string) => { await sendStoreAction('meetingEquipment.remove', { id }); };
  const setLogisticsEmailRecipients = async (recipients: string[]) => { await sendStoreAction('logistics.emailRecipients', { recipients }); };
  const addCandidateMessage = async (id: string, message: ChatMessage, candidateName: string) => { await sendStoreAction('candidate.message', { id, message, candidateName }); };
  const addExpense = async (expense: Omit<Expense, 'id'>) => { await sendStoreAction('budget.expense', { expense }); };
  const updateExpense = async (id: string, expense: Omit<Expense, 'id'>) => { await sendStoreAction('budget.expense.update', { id, expense }); };
  const removeExpense = async (id: string) => { await sendStoreAction('budget.expense.remove', { id }); };
  const setTotalBudget = async (totalAnnual: number) => sendStoreAction('budget.total', { totalAnnual });
  const addChannelMessage = async (message: Omit<ChatMessage, 'id'>) => sendStoreAction('chat.add', { message });

  return (
    <StoreContext.Provider value={{
      ...state, syncStatus, hasLoaded, retrySync, setCurrentUser, addEquipment, updateEquipment, removeEquipment, updateEquipmentStatus, addRequirement, toggleRequirement,
      addMeeting, removeMeeting, updateMeeting, addCandidate, addCandidates, updateCandidateStatus,
      removeCandidate, removeAllCandidates, addCandidateMessage, addMeetingEquipment, updateMeetingEquipment,
      removeMeetingEquipment, setLogisticsEmailRecipients, addExpense, updateExpense, removeExpense, setTotalBudget, addChannelMessage,
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
