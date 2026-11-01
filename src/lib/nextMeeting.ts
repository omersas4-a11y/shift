import type { Meeting } from '../types';

export function findNextMeeting(meetings: Meeting[], now = new Date()): Meeting | undefined {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  return meetings.filter(meeting => /^\d{4}-\d{2}-\d{2}$/.test(meeting.date) && meeting.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '99:99').localeCompare(b.time || '99:99') || a.id.localeCompare(b.id))[0];
}
