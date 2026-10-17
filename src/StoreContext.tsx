import React, { createContext, useContext, useEffect, useState } from 'react';
import { Equipment, NextMeetingRequirement, Meeting, Candidate, Budget, Expense } from './types';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { app, db } from './lib/auth';

interface StoreState {
  equipment: Equipment[];
  requirements: NextMeetingRequirement[];
  meetings: Meeting[];
  candidates: Candidate[];
  budget: Budget;
  currentUser: string | null;
  chatMessages: import('./types').ChatMessage[];
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
  
  addCandidate: (candidate: Omit<Candidate, 'id' | 'status' | 'messages'>) => void;
  updateCandidateStatus: (id: string, status: Candidate['status']) => void;
  removeCandidate: (id: string) => void;
  addCandidateMessage: (candidateId: string, message: import('./types').ChatMessage) => void;
  
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  setTotalBudget: (total: number) => void;
  
  addChannelMessage: (message: Omit<import('./types').ChatMessage, 'id'>) => void;
}

const defaultState: StoreState = {
  equipment: [],
  requirements: [],
  meetings: [],
  candidates: [],
  budget: {
    totalAnnual: 5000,
    expenses: []
  },
  currentUser: null,
  chatMessages: []
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StoreState>(() => {
    const saved = localStorage.getItem('shift_guild_store');
    return saved ? { ...defaultState, ...JSON.parse(saved) } : defaultState;
  });

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    unsubs.push(onSnapshot(collection(db, 'equipment'), (snapshot) => {
      const equipment = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipment));
      setState(s => ({ ...s, equipment }));
    }, (error) => console.error("Firestore onSnapshot error (equipment):", error)));

    unsubs.push(onSnapshot(collection(db, 'requirements'), (snapshot) => {
      const requirements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NextMeetingRequirement));
      setState(s => ({ ...s, requirements }));
    }, (error) => console.error("Firestore onSnapshot error (requirements):", error)));

    unsubs.push(onSnapshot(collection(db, 'meetings'), (snapshot) => {
      const meetings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Meeting));
      setState(s => ({ ...s, meetings }));
    }, (error) => console.error("Firestore onSnapshot error (meetings):", error)));

    unsubs.push(onSnapshot(collection(db, 'candidates'), (snapshot) => {
      const candidates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Candidate));
      setState(s => ({ ...s, candidates }));
    }, (error) => console.error("Firestore onSnapshot error (candidates):", error)));

    unsubs.push(onSnapshot(collection(db, 'chatMessages'), (snapshot) => {
      const chatMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as import('./types').ChatMessage));
      // Sort messages by timestamp, you may want to use server timestamp instead of a string time.
      // But based on the current types string timestamp is used.
      setState(s => ({ ...s, chatMessages }));
    }, (error) => console.error("Firestore onSnapshot error (chatMessages):", error)));

    unsubs.push(onSnapshot(doc(db, 'budget', 'main'), (snapshot) => {
      if (snapshot.exists()) {
        setState(s => ({ ...s, budget: snapshot.data() as Budget }));
      }
    }, (error) => console.error("Firestore onSnapshot error (budget):", error)));

    return () => unsubs.forEach(unsub => unsub());
  }, []);

  // Sync currentUser to local storage so it persists reloads
  useEffect(() => {
    localStorage.setItem('shift_guild_store', JSON.stringify({ currentUser: state.currentUser }));
  }, [state.currentUser]);

  const setCurrentUser = (user: string | null) => {
    setState(s => ({ ...s, currentUser: user }));
  };

  const addEquipment = async (eq: Omit<Equipment, 'id'>) => {
    const id = Date.now().toString();
    await setDoc(doc(db, 'equipment', id), { ...eq, id });
  };

  const updateEquipmentStatus = async (id: string, status: Equipment['status']) => {
    await updateDoc(doc(db, 'equipment', id), { status });
  };

  const addRequirement = async (req: Omit<NextMeetingRequirement, 'id' | 'isBrought'>) => {
    const id = Date.now().toString();
    await setDoc(doc(db, 'requirements', id), { ...req, id, isBrought: false });
  };

  const toggleRequirement = async (id: string) => {
    const req = state.requirements.find(r => r.id === id);
    if (req) {
      await updateDoc(doc(db, 'requirements', id), { isBrought: !req.isBrought });
    }
  };

  const addMeeting = async (meeting: Omit<Meeting, 'id'>) => {
    const id = Date.now().toString();
    await setDoc(doc(db, 'meetings', id), { ...meeting, id });
  };

  const removeMeeting = async (id: string) => {
    await deleteDoc(doc(db, 'meetings', id));
  };

  const updateMeeting = async (id: string, updatedMeeting: Omit<Meeting, 'id'>) => {
    await updateDoc(doc(db, 'meetings', id), updatedMeeting);
  };

  const addCandidate = async (candidate: Omit<Candidate, 'id' | 'status' | 'messages'>) => {
    const id = (candidate as any).formResponseId || Date.now().toString() + Math.random().toString(36).substr(2, 9);
    await setDoc(doc(db, 'candidates', id), { ...candidate, id, status: 'pending', messages: [] });
  };

  const updateCandidateStatus = async (id: string, status: Candidate['status']) => {
    await updateDoc(doc(db, 'candidates', id), { status });
  };

  const addCandidateMessage = async (candidateId: string, message: import('./types').ChatMessage) => {
    const candidate = state.candidates.find(c => c.id === candidateId);
    if (candidate) {
      const messages = [...(candidate.messages || []), message];
      await updateDoc(doc(db, 'candidates', candidateId), { messages });
    }
  };

  const removeCandidate = async (id: string) => {
    await deleteDoc(doc(db, 'candidates', id));
  };

  const addExpense = async (expense: Omit<Expense, 'id'>) => {
    const newExpense = { ...expense, id: Date.now().toString() };
    const newBudget = {
      ...state.budget,
      expenses: [...state.budget.expenses, newExpense]
    };
    await setDoc(doc(db, 'budget', 'main'), newBudget);
  };

  const setTotalBudget = async (totalAnnual: number) => {
    const newBudget = {
      ...state.budget,
      totalAnnual
    };
    await setDoc(doc(db, 'budget', 'main'), newBudget);
  };

  const addChannelMessage = async (message: Omit<import('./types').ChatMessage, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    // Use an ISO string for sorting correctly. 
    // The previous implementation used a local time string which isn't good for sorting.
    // For backwards compatibility we'll still use standard setDoc
    await setDoc(doc(db, 'chatMessages', id), { ...message, id, createdAt: new Date().toISOString() });
  };

  return (
    <StoreContext.Provider value={{
      ...state,
      setCurrentUser,
      addEquipment,
      updateEquipmentStatus,
      addRequirement,
      toggleRequirement,
      addMeeting,
      removeMeeting,
      updateMeeting,
      addCandidate,
      updateCandidateStatus,
      removeCandidate,
      addCandidateMessage,
      addExpense,
      setTotalBudget,
      addChannelMessage
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
