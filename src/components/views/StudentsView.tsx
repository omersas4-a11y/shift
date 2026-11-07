import { useEffect, useState } from 'react';
import { ClipboardCheck, UsersRound } from 'lucide-react';
import { useStore } from '../../StoreContext';
import type { AttendanceRecord } from '../../types';
import type { CandidateNavigationTarget } from '../../lib/activityNavigation';
import CandidatesView from './CandidatesView';

function AttendanceCell({ candidateId, meetingId, record }: { candidateId: string; meetingId: string; record?: AttendanceRecord }) {
  const { updateAttendance } = useStore();
  const [status, setStatus] = useState<AttendanceRecord['status']>(record?.status || '');
  const [note, setNote] = useState(record?.note || '');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setStatus(record?.status || ''); }, [record?.status]);
  useEffect(() => { if (!dirty) setNote(record?.note || ''); }, [record?.note]);
  const saveStatus = async (value: AttendanceRecord['status']) => {
    const previous = status; setStatus(value); setSaving(true); setError('');
    try { await updateAttendance(candidateId, meetingId, { status: value }); }
    catch { setStatus(previous); setError('השמירה נכשלה'); }
    finally { setSaving(false); }
  };
  const saveNote = async () => {
    if (!dirty) return;
    setSaving(true); setError('');
    try { await updateAttendance(candidateId, meetingId, { note }); setDirty(false); }
    catch { setError('שמירת ההערה נכשלה'); }
    finally { setSaving(false); }
  };
  const statusStyle = status === 'present'
    ? 'border-green-600 bg-green-100 text-green-900 dark:border-green-400 dark:bg-green-950 dark:text-green-100'
    : status === 'absent'
      ? 'border-red-600 bg-red-100 text-red-900 dark:border-red-400 dark:bg-red-950 dark:text-red-100'
      : 'border-border bg-surface text-text-main';
  return <div className="min-w-44 space-y-2">
    <select aria-label="סטטוס נוכחות" value={status} disabled={saving} onChange={event => void saveStatus(event.target.value as AttendanceRecord['status'])} className={`w-full cursor-pointer rounded-lg border-2 px-3 py-2.5 text-sm font-bold disabled:opacity-60 ${statusStyle}`}>
      <option value="">לא סומן</option><option value="present">✓ נוכח/ת</option><option value="absent">✕ לא נוכח/ת</option>
    </select>
    <textarea aria-label="הערת נוכחות" placeholder="הוספת הערה…" value={note} disabled={saving} maxLength={2000} rows={2} onChange={event => { setNote(event.target.value); setDirty(true); }} onBlur={() => void saveNote()} className="w-full resize-y rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-text-main disabled:opacity-60" />
    {saving && <span className="text-xs text-text-muted">שומר…</span>}{error && <span role="alert" className="text-xs font-bold text-red-600">{error} {dirty && <button type="button" onClick={() => void saveNote()} className="underline">נסו שוב</button>}</span>}
  </div>;
}

function AttendanceView() {
  const { candidates, meetings, attendance } = useStore();
  const students = candidates.filter(candidate => candidate.status === 'accepted').slice().sort((a, b) => a.name.localeCompare(b.name, 'he'));
  const ordered = meetings.slice().sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const records = new Map(attendance.map(record => [`${record.candidateId}--${record.meetingId}`, record]));
  const meetingIds = new Set(ordered.map(meeting => meeting.id));
  const absences = new Map<string, number>();
  attendance.forEach(record => { if (record.status === 'absent' && meetingIds.has(record.meetingId)) absences.set(record.candidateId, (absences.get(record.candidateId) || 0) + 1); });
  return <section className="space-y-5" aria-labelledby="attendance-heading">
    <div><h2 id="attendance-heading" className="text-2xl font-black text-text-main">נוכחות במפגשים</h2><p className="mt-2 text-sm text-text-muted">סטודנטים בסטטוס ״עובר״ מופיעים כאן אוטומטית. הסימון וההערות נשמרים לכל מפגש בנפרד.</p></div>
    {!students.length ? <p className="gaming-card p-6 text-center text-text-muted">עדיין אין סטודנטים שהתקבלו במיונים.</p> : !ordered.length ? <p className="gaming-card p-6 text-center text-text-muted">הוסיפו מפגשים לסילבוס כדי לסמן נוכחות.</p> : <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm"><table className="w-full border-separate border-spacing-0 text-right text-sm"><thead><tr><th scope="col" className="sticky right-0 z-20 min-w-40 border-b-2 border-brand bg-surface-alt p-4 text-text-main">סטודנט/ית<br /><span className="text-xs font-normal text-text-muted">{students.length} סטודנטים</span></th>{ordered.map((meeting, index) => <th scope="col" key={meeting.id} className="min-w-52 border-b-2 border-r border-brand/30 bg-surface-alt p-4 align-top"><span className="mb-1 block text-xs font-bold text-brand">מפגש {index + 1}</span><span className="block text-base font-black text-text-main">{meeting.title}</span><span className="mt-1 block text-xs font-medium text-text-muted">{meeting.date.split('-').reverse().join('/')}</span></th>)}</tr></thead><tbody>{students.map((student, index) => <tr key={student.id} className="align-top"><th scope="row" className={`sticky right-0 z-10 min-w-40 border-b border-border p-4 font-bold text-text-main ${index % 2 ? 'bg-surface-alt' : 'bg-surface'}`}>{student.name}<span className="mt-2 block text-xs font-medium text-text-muted">סה״כ חיסורים: <strong className={(absences.get(student.id) || 0) > 0 ? "text-red-700 dark:text-red-300" : "text-text-main"}>{absences.get(student.id) || 0}</strong></span></th>{ordered.map(meeting => <td key={meeting.id} className={`border-b border-r border-border p-3 ${index % 2 ? 'bg-surface-alt/50' : 'bg-surface'}`}><AttendanceCell candidateId={student.id} meetingId={meeting.id} record={records.get(`${student.id}--${meeting.id}`)} /></td>)}</tr>)}</tbody></table><p className="px-4 py-3 text-xs text-text-muted">גללו הצידה כדי לעבור בין המפגשים. השם נשאר מוצמד כדי להקל על המעקב.</p></div>}
  </section>;
}

export default function StudentsView({ target }: { target: CandidateNavigationTarget | null }) {
  const [tab, setTab] = useState<'screening' | 'attendance'>('screening');
  useEffect(() => { if (target) setTab('screening'); }, [target]);
  return <div className="space-y-5"><div><h1 className="flex items-center gap-3 text-2xl font-black text-text-main sm:text-3xl"><UsersRound className="text-brand" />סטודנטים</h1><div role="tablist" aria-label="ניהול סטודנטים" className="mt-4 inline-flex rounded-xl border border-border bg-surface p-1"><button role="tab" aria-selected={tab === 'screening'} onClick={() => setTab('screening')} className={`rounded-lg px-5 py-2 text-sm font-bold ${tab === 'screening' ? 'bg-brand text-white' : 'text-text-muted'}`}>מיונים</button><button role="tab" aria-selected={tab === 'attendance'} onClick={() => setTab('attendance')} className={`inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-bold ${tab === 'attendance' ? 'bg-brand text-white' : 'text-text-muted'}`}><ClipboardCheck size={16} />נוכחות</button></div></div>{tab === 'screening' ? <CandidatesView target={target} /> : <AttendanceView />}</div>;
}
