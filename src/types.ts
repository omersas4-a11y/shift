export interface Equipment {
  id: string;
  name: string;
  quantity: number;
  status: 'available' | 'in_use' | 'maintenance';
}

export interface NextMeetingRequirement {
  id: string;
  personName: string;
  itemToBring: string;
  isBrought: boolean;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  lecturer: string;
  content: string;
}

export interface ChatMessage {
  id: string;
  senderName: string;
  isSystem?: boolean;
  text: string;
  timestamp: string;
  channelId?: string;
}

export interface Candidate {
  id: string;
  name: string;
  major: string;
  status: 'pending' | 'accepted' | 'rejected' | 'maybe';
  joinReason: string;
  level: number;
  messages?: ChatMessage[];
  formResponseId?: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string;
  category: string;
}

export interface Budget {
  totalAnnual: number;
  expenses: Expense[];
}
