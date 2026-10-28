export interface Equipment {
  id: string;
  name: string;
  quantity: number;
  status: 'available' | 'in_use' | 'maintenance';
}

export interface MeetingEquipment {
  id: string;
  meetingId: string;
  name: string;
  quantity: number;
  assignedTo: string;
  sourceEquipmentId?: string;
  excluded?: boolean;
  inheritName?: boolean;
  inheritQuantity?: boolean;
}

export interface NextMeetingRequirement {
  id: string;
  personName: string;
  itemToBring: string;
  isBrought: boolean;
}

export interface Meeting {
  id: string;
  feedbackCode?: string;
  title: string;
  date: string;
  time: string;
  location: string;
  lecturer: string;
  lecturerEmail?: string;
  lecturerPhone?: string;
  secondLecturer?: { name: string; email: string; phone: string } | null;
  status?: 'unscheduled' | 'in_progress' | 'closed';
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
  paidBy?: string;
  receiptPath?: string;
}

export interface ActivityEvent {
  id: string;
  category: 'logistics' | 'candidates' | 'syllabus' | 'budget';
  text: string;
  actor: string;
  createdAt: string;
  candidateId?: string;
  messageId?: string;
}

export interface Budget {
  totalAnnual: number;
  expenses: Expense[];
}
