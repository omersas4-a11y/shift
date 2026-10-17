import { Equipment, NextMeetingRequirement, Meeting, Candidate, Budget } from './types';

export const mockEquipment: Equipment[] = [
  { id: '1', name: 'ערכת מציאות מדומה (Meta Quest 3)', quantity: 2, status: 'available' },
  { id: '2', name: 'בקרי משחק (Xbox Wireless)', quantity: 8, status: 'in_use' },
  { id: '3', name: 'מקרן נייד', quantity: 1, status: 'available' },
  { id: '4', name: 'רחפן צילום (DJI Mini)', quantity: 1, status: 'maintenance' },
];

export const mockRequirements: NextMeetingRequirement[] = [
  { id: '1', personName: 'עומר', itemToBring: 'מפצל חשמל וכבל HDMI', isBrought: false },
  { id: '2', personName: 'דנה', itemToBring: 'כיבוד קל (פיצות)', isBrought: true },
  { id: '3', personName: 'רון', itemToBring: 'לפ-טופ עם Unity מותקן', isBrought: false },
];

export const mockMeetings: Meeting[] = [
  {
    id: '1',
    title: 'מבוא לפיתוח משחקים ב-Unity',
    date: '2026-07-01',
    time: '18:00',
    location: 'בניין הנדסה, חדר 204',
    lecturer: 'אלכסנדר כהן',
    content: 'במפגש נלמד את הבסיס למנוע Unity, הכרת הממשק, ויצירת אובייקטים בסיסיים במרחב התלת מימדי. מיועד למתחילים.'
  },
  {
    id: '2',
    title: 'סדנת עיצוב שלבים (Level Design)',
    date: '2026-07-15',
    time: '18:30',
    location: 'מעבדת מחשבים 3',
    lecturer: 'מיכל ינאי',
    content: 'איך לבנות שלב ששומר על מעורבות השחקן? עקרונות עיצוב, זרימה, תאורה ונקודות עניין.'
  },
  {
    id: '3',
    title: 'האקתון פיתוח משחקים 24 שעות',
    date: '2026-08-10',
    time: '09:00',
    location: 'מתחם החדשנות (WeWork)',
    lecturer: 'צוות המועדון',
    content: 'מרתון פיתוח משחקים. חלוקה לצוותים, פיצות, קולה, וקידוד עד אור הבוקר!'
  }
];

export const mockCandidates: Candidate[] = [
  { id: '1', name: 'יואב לוי', major: 'מדעי המחשב', status: 'pending', joinReason: 'אוהב לשחק ויש לי ניסיון קצת ב-C#', level: 14 },
  { id: '2', name: 'שירן כץ', major: 'עיצוב גרפי', status: 'accepted', joinReason: 'מחפשת לפתח תיק עבודות בארט למשחקים', level: 22 },
  { id: '3', name: 'תומר אברהם', major: 'הנדסת חשמל', status: 'pending', joinReason: 'מתעניין בפיתוח חומרת גיימינג ובקרים', level: 8 },
  { id: '4', name: 'נועה ברק', major: 'פסיכולוגיה', status: 'rejected', joinReason: 'רוצה לחקור התנהגות שחקנים במרחב וירטואלי', level: 5 },
  { id: '5', name: 'דניאל ימין', major: 'אדריכלות', status: 'maybe', joinReason: 'מעצב מבנים ורוצה לעזור בעיצוב שלבים תלת מימדיים', level: 12 },
  { id: '6', name: 'עידן שלום', major: 'הנדסת תוכנה', status: 'maybe', joinReason: 'פיתחתי פרויקט ב-Unreal', level: 18 },
  { id: '7', name: 'רוני כהן', major: 'תקשורת חזותית', status: 'accepted', joinReason: 'אני עוסקת ב-UI/UX ואשמח לעזור בממשקים', level: 19 },
];

export const mockBudget: Budget = {
  totalAnnual: 15000,
  expenses: [
    { id: '1', title: 'הזמנת פיצות למפגש פתיחה', amount: 450, date: '2026-03-01', category: 'אוכל ושתייה' },
    { id: '2', title: 'רישיונות תוכנה (Unity Pro לצוות)', amount: 2100, date: '2026-03-15', category: 'תוכנה' },
    { id: '3', title: 'חולצות מועדון לצוות המוביל', amount: 800, date: '2026-04-05', category: 'מרצ\'נדייז' },
    { id: '4', title: 'ציוד הקלטה להרצאות', amount: 1250, date: '2026-05-10', category: 'ציוד טכני' },
  ]
};
