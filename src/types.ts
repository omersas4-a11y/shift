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
  /** Original Google Forms fields, kept intact so the team can review every answer. */
  formAnswers?: Record<string, string>;
  /** Legacy field populated by the existing Forms webhook. */
  rawAnswers?: Record<string, string>;
  email?: string;
  phone?: string;
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
