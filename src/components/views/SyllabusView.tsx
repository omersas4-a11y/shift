import React from "react";
import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../StoreContext';
import { MapPin, Clock, Calendar as CalendarIcon, User, Swords, Pencil, Trash2, Mail, Phone, Plus, X, MessageCircle } from 'lucide-react';
import { Meeting } from '../../types';
import { Copy, RefreshCw, Star, X as CloseIcon } from 'lucide-react';
import { createPortal } from 'react-dom';
import JoystickRating from '../JoystickRating';

type FeedbackSummary = { meetingId: string; count: number; sumRating: number };
type FeedbackResponse = { id: string; rating: number; liked: string; disliked: string };

type MeetingStatus = NonNullable<Meeting['status']>;
const statuses: { value: MeetingStatus; label: string; color: string; text: string }[] = [
  { value: 'unscheduled', label: 'טרם נקבע', color: '#dc2626', text: '#fff' },
  { value: 'in_progress', label: 'בטיפול', color: '#facc15', text: '#422006' },
  { value: 'closed', label: 'נסגר', color: '#16a34a', text: '#fff' },
];

function StatusSlider({ value, onChange, disabled = false }: { value: MeetingStatus; onChange: (status: MeetingStatus) => void; disabled?: boolean }) {
  const index = Math.max(0, statuses.findIndex(status => status.value === value));
  return <div role="group" aria-label="סטטוס המפגש" className="relative grid w-full max-w-sm grid-cols-3 rounded-xl border border-border bg-surface-alt p-1">
    <span aria-hidden="true" className="status-slider-thumb absolute bottom-1 right-1 top-1 rounded-lg shadow-sm" style={{ width: 'calc((100% - 8px) / 3)', transform: `translateX(-${index * 100}%)`, backgroundColor: statuses[index].color }} />
    {statuses.map(status => <button key={status.value} type="button" disabled={disabled} aria-pressed={value === status.value} onClick={() => onChange(status.value)} className="relative z-10 min-h-10 rounded-lg px-1 text-xs font-bold transition-colors duration-300 disabled:cursor-wait sm:text-sm" style={{ color: value === status.value ? status.text : 'var(--theme-text-muted)' }}>{status.label}</button>)}
  </div>;
}

function ContactDetails({ name, email, phone }: { name: string; email?: string; phone?: string }) {
  if (!name && !email && !phone) return null;
  const phoneDigits = phone?.replace(/\D/g, '') ?? '';
  const whatsAppNumber = phoneDigits.startsWith('9720') ? `972${phoneDigits.slice(4)}`
    : phoneDigits.startsWith('00') ? phoneDigits.slice(2)
    : phoneDigits.startsWith('0') ? `972${phoneDigits.slice(1)}` : phoneDigits;
  return <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
    <span className="flex items-center gap-2 font-bold text-text-main"><User size={16} className="text-text-muted" />{name || 'מרצה ללא שם'}</span>
    {email && <a href={`mailto:${email}`} dir="ltr" className="flex items-center gap-1 break-all text-brand hover:underline"><Mail size={14} />{email}</a>}
    {phone && <a href={`tel:${phone}`} dir="ltr" className="flex items-center gap-1 text-brand hover:underline"><Phone size={14} />{phone}</a>}
    {whatsAppNumber && <a href={`https://wa.me/${whatsAppNumber}`} target="_blank" rel="noopener noreferrer" aria-label={`פתח צ׳אט WhatsApp עם ${name || 'המרצה'}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-green-600/25 bg-green-600/10 px-2.5 text-xs font-bold text-green-700 transition hover:bg-green-600/20 dark:text-green-300"><MessageCircle size={15} />צ׳אט WhatsApp</a>}
  </div>;
}

const emptySecondLecturer = { name: '', email: '', phone: '' };

export default function SyllabusView() {
  const { meetings, addMeeting, removeMeeting, updateMeeting } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [lecturer, setLecturer] = useState('');
  const [lecturerEmail, setLecturerEmail] = useState('');
  const [lecturerPhone, setLecturerPhone] = useState('');
  const [secondLecturer, setSecondLecturer] = useState(emptySecondLecturer);
  const [hasSecondLecturer, setHasSecondLecturer] = useState(false);
  const [status, setStatus] = useState<MeetingStatus>('unscheduled');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [statusError, setStatusError] = useState('');
  const [statusOverrides, setStatusOverrides] = useState<Record<string, MeetingStatus>>({});
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);
  const [feedbackSummaries, setFeedbackSummaries] = useState<Record<string, FeedbackSummary>>({});
  const [feedbackMeeting, setFeedbackMeeting] = useState<Meeting | null>(null);
  const [feedbackResponses, setFeedbackResponses] = useState<FeedbackResponse[]>([]);
  const [feedbackCursor, setFeedbackCursor] = useState<string | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [confirmFeedbackDeleteId, setConfirmFeedbackDeleteId] = useState<string | null>(null);
  const [deletingFeedbackId, setDeletingFeedbackId] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState('');
  const orderedMeetings = useMemo(() => [...meetings].sort((a, b) =>
    a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.id.localeCompare(b.id)
  ), [meetings]);

  useEffect(() => {
    void refreshSummaries();
    const onVisible = () => { if (document.visibilityState === 'visible') void refreshSummaries(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const refreshSummaries = async () => {
    try {
      const response = await fetch('/api/feedback-admin');
      if (!response.ok) throw new Error();
      const data = await response.json() as { summaries: FeedbackSummary[] };
      setFeedbackSummaries(Object.fromEntries(data.summaries.map(summary => [summary.meetingId, summary])));
    } catch { setFeedbackError('טעינת סיכומי המשובים נכשלה.'); }
  };

  const copyFeedbackLink = async (meetingId: string) => {
    setCopyingId(meetingId); setFeedbackNotice('');
    try {
      const response = await fetch('/api/feedback-admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ meetingId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'יצירת הקישור נכשלה.');
      const link = `${window.location.origin}/f/${data.code}`;
      await navigator.clipboard.writeText(link);
      setFeedbackNotice('הקישור למשוב הועתק');
    } catch (error) { setFeedbackNotice(error instanceof Error ? error.message : 'העתקת הקישור נכשלה.'); }
    finally { setCopyingId(null); window.setTimeout(() => setFeedbackNotice(''), 4000); }
  };

  const loadFeedback = async (meeting: Meeting, cursor?: string) => {
    setFeedbackLoading(true); setFeedbackError('');
    try {
      const params = new URLSearchParams({ meetingId: meeting.id });
      if (cursor) params.set('cursor', cursor);
      const response = await fetch(`/api/feedback-admin?${params}`);
      const data = await response.json() as { responses?: FeedbackResponse[]; nextCursor?: string | null; error?: string };
      if (!response.ok) throw new Error(data.error || 'טעינת המשובים נכשלה.');
      setFeedbackResponses(previous => cursor ? [...previous, ...(data.responses || [])] : data.responses || []);
      setFeedbackCursor(data.nextCursor || null);
      await refreshSummaries();
    } catch (error) { setFeedbackError(error instanceof Error ? error.message : 'טעינת המשובים נכשלה.'); }
    finally { setFeedbackLoading(false); }
  };

  const deleteFeedback = async (meetingId: string, responseId: string) => {
    if (deletingFeedbackId) return;
    setDeletingFeedbackId(responseId);
    setFeedbackError('');
    setFeedbackMessage('');
    try {
      const response = await fetch('/api/feedback-admin', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId, responseId }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'מחיקת המשוב נכשלה.');
      setFeedbackResponses(previous => previous.filter(item => item.id !== responseId));
      setConfirmFeedbackDeleteId(null);
      setFeedbackMessage('המשוב נמחק והדירוג עודכן.');
      await refreshSummaries();
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : 'מחיקת המשוב נכשלה.');
    } finally {
      setDeletingFeedbackId(null);
    }
  };

  useEffect(() => {
    setStatusOverrides(previous => {
      const next = { ...previous };
      let changed = false;
      for (const meeting of meetings) {
        if (next[meeting.id] === meeting.status) { delete next[meeting.id]; changed = true; }
      }
      return changed ? next : previous;
    });
  }, [meetings]);

  const resetForm = () => {
    setTitle(''); setDate(''); setTime(''); setLocation(''); setLecturer(''); setContent('');
    setLecturerEmail(''); setLecturerPhone(''); setSecondLecturer(emptySecondLecturer);
    setHasSecondLecturer(false); setStatus('unscheduled'); setSaveError('');
    setEditingMeetingId(null);
    setShowForm(false);
  };

  const handleEditClick = (meeting: Meeting) => {
    setTitle(meeting.title);
    setDate(meeting.date);
    setTime(meeting.time);
    setLocation(meeting.location);
    setLecturer(meeting.lecturer);
    setLecturerEmail(meeting.lecturerEmail || '');
    setLecturerPhone(meeting.lecturerPhone || '');
    setSecondLecturer(meeting.secondLecturer || emptySecondLecturer);
    setHasSecondLecturer(Boolean(meeting.secondLecturer && Object.values(meeting.secondLecturer).some(Boolean)));
    setStatus(meeting.status || 'unscheduled');
    setContent(meeting.content);
    setSaveError('');
    setEditingMeetingId(meeting.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date || !time || isSaving) return;
    setIsSaving(true); setSaveError('');
    const meeting = { title: title.trim(), date, time, location: location.trim(), lecturer: lecturer.trim(), lecturerEmail: lecturerEmail.trim(), lecturerPhone: lecturerPhone.trim(),
      secondLecturer: hasSecondLecturer && Object.values(secondLecturer).some(value => value.trim())
        ? { name: secondLecturer.name.trim(), email: secondLecturer.email.trim(), phone: secondLecturer.phone.trim() } : null,
      status, content: content.trim() };
    try {
      if (editingMeetingId) await updateMeeting(editingMeetingId, meeting);
      else await addMeeting(meeting);
      resetForm();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'שמירת המפגש נכשלה. נסו שוב.');
    } finally { setIsSaving(false); }
  };

  const changeMeetingStatus = async (meeting: Meeting, nextStatus: MeetingStatus) => {
    if (savingStatusId || nextStatus === (statusOverrides[meeting.id] || meeting.status || 'unscheduled')) return;
    setStatusError('');
    setStatusOverrides(previous => ({ ...previous, [meeting.id]: nextStatus }));
    setSavingStatusId(meeting.id);
    try { await updateMeeting(meeting.id, { status: nextStatus }); }
    catch (error) {
      setStatusOverrides(previous => { const next = { ...previous }; delete next[meeting.id]; return next; });
      setStatusError(error instanceof Error ? error.message : 'עדכון הסטטוס נכשל. נסו שוב.');
    } finally { setSavingStatusId(null); }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <h2 className="mb-2 flex items-center gap-3 text-2xl font-black uppercase text-text-main sm:text-3xl">
            <Swords className="shrink-0 text-brand" size={28} />
            סילבוס
          </h2>
          <p className="text-text-muted">לוח הזמנים של המועדון, מפגשים מתוכננים והרצאות.</p>
        </div>
        <button className="gaming-button w-full justify-center sm:w-auto" onClick={() => {
          if (showForm) {
            resetForm();
          } else {
            setShowForm(true);
          }
        }}>
          {showForm ? 'ביטול' : '+ צור מפגש חדש'}
        </button>
      </header>
      
      {showForm && (
        <form onSubmit={handleSubmit} className="gaming-card space-y-4 bg-surface-alt p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-muted">כותרת המפגש</label>
              <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text-main" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-muted">תאריך</label>
              <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text-main" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-muted">שעה</label>
              <input type="time" required value={time} onChange={e => setTime(e.target.value)} className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text-main" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-text-muted">מיקום</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text-main" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-text-muted">תוכן המפגש</label>
              <textarea value={content} onChange={e => setContent(e.target.value)} className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text-main min-h-[80px]" />
            </div>
          </div>
          <section className="space-y-3 rounded-xl border border-border bg-surface/70 p-4">
            <h3 className="font-bold text-text-main">מרצה / מוביל</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="space-y-1 text-xs font-bold text-text-muted">שם<input type="text" value={lecturer} onChange={e => setLecturer(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-main" /></label>
              <label className="space-y-1 text-xs font-bold text-text-muted">מייל<input type="email" dir="ltr" value={lecturerEmail} onChange={e => setLecturerEmail(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-main" /></label>
              <label className="space-y-1 text-xs font-bold text-text-muted">מספר טלפון<input type="tel" dir="ltr" value={lecturerPhone} onChange={e => setLecturerPhone(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-main" /></label>
            </div>
          </section>
          {hasSecondLecturer ? (
            <section className="space-y-3 rounded-xl border border-border bg-surface/70 p-4">
              <div className="flex items-center justify-between gap-2"><h3 className="font-bold text-text-main">מרצה נוסף</h3><button type="button" onClick={() => { setHasSecondLecturer(false); setSecondLecturer(emptySecondLecturer); }} className="flex items-center gap-1 text-xs font-bold text-text-muted hover:text-red-500"><X size={15} />הסר מרצה</button></div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <label className="space-y-1 text-xs font-bold text-text-muted">שם<input type="text" value={secondLecturer.name} onChange={e => setSecondLecturer(previous => ({ ...previous, name: e.target.value }))} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-main" /></label>
                <label className="space-y-1 text-xs font-bold text-text-muted">מייל<input type="email" dir="ltr" value={secondLecturer.email} onChange={e => setSecondLecturer(previous => ({ ...previous, email: e.target.value }))} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-main" /></label>
                <label className="space-y-1 text-xs font-bold text-text-muted">מספר טלפון<input type="tel" dir="ltr" value={secondLecturer.phone} onChange={e => setSecondLecturer(previous => ({ ...previous, phone: e.target.value }))} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-main" /></label>
              </div>
            </section>
          ) : <button type="button" onClick={() => setHasSecondLecturer(true)} className="flex items-center gap-2 rounded-lg border border-dashed border-brand px-4 py-2 text-sm font-bold text-brand transition-colors hover:bg-brand/10"><Plus size={16} />הוסף מרצה נוסף</button>}
          <div className="space-y-2"><span className="text-xs font-bold text-text-muted">סטטוס המפגש</span><StatusSlider value={status} onChange={setStatus} /></div>
          {saveError && <p role="alert" className="text-sm font-bold text-red-600">{saveError}</p>}
          <button type="submit" disabled={isSaving} className="gaming-button w-full mt-4 disabled:opacity-60">
            {isSaving ? 'שומר...' : editingMeetingId ? 'עדכן מפגש' : 'שמור מפגש'}
          </button>
        </form>
      )}

      {statusError && <p role="alert" className="rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm font-bold text-red-600">{statusError}</p>}
      {feedbackNotice && <div role="status" className="fixed left-1/2 top-6 z-[100] w-max max-w-[90vw] -translate-x-1/2 rounded-xl border border-brand/30 bg-surface px-4 py-3 text-sm font-bold text-text-main shadow-lg">{feedbackNotice}</div>}
      <div className="relative mt-6 space-y-6 border-r-2 border-border pr-5 sm:mt-8 sm:space-y-8 sm:pr-8">
        {orderedMeetings.map((meeting, index) => (
          <div key={meeting.id} className="relative">
            {/* Timeline Node */}
            <div className="absolute -right-[28px] top-4 z-10 h-4 w-4 rounded-full border-4 border-brand bg-bg shadow-[0_0_10px_rgba(255,90,0,0.5)] sm:-right-[41px] sm:h-5 sm:w-5" />
            
            <div className="gaming-card mr-2 p-4 sm:mr-4 sm:p-6">
              <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-4">
                <div>
                  <div className="text-brand font-bold mb-1 tracking-wider text-sm">
                    שלב {index + 1}
                  </div>
                  <h3 className="break-words text-xl font-black text-text-main sm:text-2xl">{meeting.title}</h3>
                </div>
                
                <div className="flex flex-col gap-2 text-sm text-text-muted bg-surface-alt p-3 rounded border border-border w-fit">
                  <div className="flex items-center gap-2">
                    <CalendarIcon size={14} className="text-brand" />
                    <span>{meeting.date.split('-').reverse().join('/')}</span>
                    <Clock size={14} className="mr-2 text-brand" />
                    <span>{meeting.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-brand" />
                    <span>{meeting.location}</span>
                  </div>
                </div>
              </div>
              
              <p className="text-text-muted leading-relaxed mb-6 border-r-2 border-border pr-4">
                {meeting.content}
              </p>
              
              <div className="mb-5 space-y-2 rounded-xl bg-surface-alt/70 p-3">
                <ContactDetails name={meeting.lecturer} email={meeting.lecturerEmail} phone={meeting.lecturerPhone} />
                {meeting.secondLecturer && <ContactDetails {...meeting.secondLecturer} />}
              </div>
              <div className="mb-5 rounded-xl border border-brand/20 bg-brand/5 p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text-muted">דירוג המפגש · משוב אנונימי</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2.5">
                      <JoystickRating value={feedbackSummaries[meeting.id]?.count ? feedbackSummaries[meeting.id].sumRating / feedbackSummaries[meeting.id].count : 0} compact />
                      <span className="text-lg font-black text-text-main">{feedbackSummaries[meeting.id]?.count ? `${Number((feedbackSummaries[meeting.id].sumRating / feedbackSummaries[meeting.id].count).toFixed(2))} / 5` : '— / 5'}</span>
                    </div>
                    <p className="mt-1 text-xs text-text-muted">{feedbackSummaries[meeting.id]?.count ? `${feedbackSummaries[meeting.id].count} משובים` : 'עדיין אין דירוגים למפגש'}</p>
                  </div>
                  <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                    <button type="button" onClick={() => void refreshSummaries()} aria-label="רענן דירוג" title="רענן דירוג" className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-surface text-text-main transition hover:border-brand"><RefreshCw size={15} /></button>
                    <button type="button" disabled={copyingId === meeting.id} onClick={() => void copyFeedbackLink(meeting.id)} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-brand bg-brand/10 px-3 text-sm font-bold text-brand transition hover:bg-brand/20 disabled:opacity-50 sm:flex-none"><Copy size={15} />{copyingId === meeting.id ? 'מכין קישור…' : 'העתק קישור למשוב'}</button>
                    <button type="button" onClick={() => { setFeedbackMeeting(meeting); setFeedbackResponses([]); setFeedbackCursor(null); setFeedbackMessage(''); setConfirmFeedbackDeleteId(null); void loadFeedback(meeting); }} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-bold text-text-main transition hover:border-brand sm:flex-none"><Star size={15} />צפייה במשובים</button>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-stretch justify-between gap-4 border-t border-border pt-4 sm:flex-row sm:items-end">
                <div className="w-full max-w-sm space-y-2"><span className="text-xs font-bold text-text-muted">סטטוס המפגש</span><StatusSlider value={statusOverrides[meeting.id] || meeting.status || 'unscheduled'} onChange={next => void changeMeetingStatus(meeting, next)} disabled={savingStatusId === meeting.id} /></div>
                
                <div className="flex items-center gap-2">
                  {confirmDeleteId === meeting.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-red-500 mr-2">בטוח?</span>
                      <button 
                        onClick={() => {
                          removeMeeting(meeting.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-3 py-1 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors rounded border border-red-500/30 text-sm font-bold"
                      >
                        כן
                      </button>
                      <button 
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-1 bg-surface-alt text-text-muted hover:text-text-main transition-colors rounded border border-border text-sm font-bold"
                      >
                        לא
                      </button>
                    </div>
                  ) : (
                    <>
                      <button 
                        onClick={() => handleEditClick(meeting)}
                        className="p-2 text-text-muted hover:text-brand transition-colors bg-surface-alt rounded border border-border"
                        title="ערוך מפגש"
                      >
                        <Pencil size={16} />
                      </button>
                      <button 
                        onClick={() => setConfirmDeleteId(meeting.id)}
                        className="p-2 text-text-muted hover:text-red-500 transition-colors bg-surface-alt rounded border border-border"
                        title="מחק מפגש"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {feedbackMeeting && createPortal(<div dir="rtl" className="fixed inset-0 z-[200] flex items-center justify-center bg-black/65 p-3 sm:p-6" onMouseDown={event => { if (event.target === event.currentTarget) setFeedbackMeeting(null); }}>
        <section role="dialog" aria-modal="true" aria-label={`משובים על ${feedbackMeeting.title}`} className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
          <header className="flex items-start justify-between gap-3 border-b border-border p-4 sm:p-5"><div><p className="text-xs font-bold text-brand">משובים אנונימיים</p><h2 className="mt-1 text-xl font-black text-text-main">{feedbackMeeting.title}</h2></div><button type="button" aria-label="סגור" onClick={() => setFeedbackMeeting(null)} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border text-text-main"><CloseIcon size={20} /></button></header>
          <div className="space-y-3 overflow-y-auto p-4 sm:p-5">
            {feedbackLoading && feedbackResponses.length === 0 ? <p className="text-center text-text-muted">טוענים משובים…</p> : null}
            {feedbackError && <p role="alert" className="text-sm font-bold text-red-600">{feedbackError}</p>}
            {feedbackMessage && <p role="status" className="rounded-lg border border-green-600/25 bg-green-600/10 px-3 py-2 text-sm font-bold text-green-700 dark:text-green-300">{feedbackMessage}</p>}
            {!feedbackLoading && !feedbackError && feedbackResponses.length === 0 ? <p className="rounded-xl bg-surface-alt p-6 text-center text-text-muted">עדיין אין משובים למפגש הזה.</p> : null}
            {feedbackResponses.map(response => <article key={response.id} className="rounded-xl border border-border bg-surface-alt/50 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3"><span className="font-black text-brand">{response.rating}/5</span><JoystickRating value={response.rating} compact /></div>
                <button type="button" disabled={Boolean(deletingFeedbackId)} onClick={() => { setConfirmFeedbackDeleteId(response.id); setFeedbackMessage(''); }} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-red-500/30 px-2.5 text-xs font-bold text-red-600 transition hover:bg-red-500/10 disabled:opacity-50"><Trash2 size={14} />מחק משוב</button>
              </div>
              <div className="space-y-2 text-sm text-text-main"><p><strong>מה אהבת?</strong> {response.liked || 'לא צוין'}</p><p><strong>מה פחות אהבת?</strong> {response.disliked || 'לא צוין'}</p></div>
              {confirmFeedbackDeleteId === response.id && <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3">
                <p className="w-full text-sm font-bold text-text-main">למחוק את המשוב הזה? אי אפשר לשחזר אותו.</p>
                <button type="button" disabled={Boolean(deletingFeedbackId)} onClick={() => setConfirmFeedbackDeleteId(null)} className="min-h-9 rounded-lg border border-border px-3 text-xs font-bold text-text-main">ביטול</button>
                <button type="button" disabled={Boolean(deletingFeedbackId)} onClick={() => void deleteFeedback(feedbackMeeting.id, response.id)} className="min-h-9 rounded-lg bg-red-600 px-3 text-xs font-bold text-white disabled:opacity-50">{deletingFeedbackId === response.id ? 'מוחק…' : 'מחק לצמיתות'}</button>
              </div>}
            </article>)}
            {feedbackCursor && <button type="button" disabled={feedbackLoading} onClick={() => void loadFeedback(feedbackMeeting, feedbackCursor)} className="min-h-10 w-full rounded-lg border border-brand px-4 text-sm font-bold text-brand disabled:opacity-50">{feedbackLoading ? 'טוענים…' : 'עוד משובים'}</button>}
          </div>
        </section>
      </div>, document.body)}
    </div>
  );
}
