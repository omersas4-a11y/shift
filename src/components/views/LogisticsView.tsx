import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, CalendarDays, Check, ChevronLeft, Clock3, Copy, Mail, MapPin,
  MessageCircle, PackagePlus, Pencil, Plus, Trash2, Users, X,
} from 'lucide-react';
import { useStore } from '../../StoreContext';
import { MeetingEquipment } from '../../types';
import { TEAM_MEMBERS } from '../../team';

const formatDate = (value: string) => {
  if (!value) return 'תאריך לא נקבע';
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(year, month - 1, day));
};

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export default function LogisticsView({ onOpenSyllabus }: { onOpenSyllabus?: () => void }) {
  const {
    meetings, meetingEquipment, logisticsEmailRecipients, currentUser,
    addMeetingEquipment, updateMeetingEquipment, removeMeetingEquipment, setLogisticsEmailRecipients,
  } = useStore();
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [assignedTo, setAssignedTo] = useState('');
  const [recipientInput, setRecipientInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingRecipient, setSavingRecipient] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const orderedMeetings = useMemo(() => [...meetings].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)), [meetings]);
  const activeMeeting = meetings.find(meeting => meeting.id === activeMeetingId) ?? null;
  const activeItems = useMemo(() => meetingEquipment
    .filter(item => item.meetingId === activeMeetingId)
    .sort((a, b) => a.name.localeCompare(b.name, 'he')), [meetingEquipment, activeMeetingId]);
  const assignedCount = activeItems.filter(item => item.assignedTo).length;
  const parsedRecipients = logisticsEmailRecipients;
  const messageText = useMemo(() => {
    if (!activeMeeting) return '';
    const lines = [
      `לוגיסטיקה למפגש: ${activeMeeting.title}`,
      [formatDate(activeMeeting.date), activeMeeting.time, activeMeeting.location].filter(Boolean).join(' · '),
      '',
      'מה כל אחד מביא:',
    ];
    if (!activeItems.length) lines.push('אין ציוד ברשימה כרגע.');
    TEAM_MEMBERS.forEach(member => {
      const items = activeItems.filter(item => item.assignedTo === member);
      if (items.length) lines.push(`${member}: ${items.map(item => `${item.name}${item.quantity > 1 ? ` ×${item.quantity}` : ''}`).join(', ')}`);
    });
    const unassigned = activeItems.filter(item => !item.assignedTo);
    if (unassigned.length) lines.push(`טרם שובץ: ${unassigned.map(item => `${item.name}${item.quantity > 1 ? ` ×${item.quantity}` : ''}`).join(', ')}`);
    return lines.join('\n');
  }, [activeMeeting, activeItems]);

  useEffect(() => {
    if (!feedback && !error) return;
    const timeout = window.setTimeout(() => { setFeedback(''); setError(''); }, 2800);
    return () => window.clearTimeout(timeout);
  }, [feedback, error]);

  useEffect(() => {
    setFeedback('');
    setError('');
    setShowAddForm(false);
    setEditingItemId(null);
  }, [activeMeetingId]);

  const resetItemForm = () => {
    setName(''); setQuantity(1); setAssignedTo(''); setEditingItemId(null); setShowAddForm(false);
  };

  const startEditing = (item: MeetingEquipment) => {
    setEditingItemId(item.id); setName(item.name); setQuantity(item.quantity); setAssignedTo(item.assignedTo); setShowAddForm(false);
  };

  const saveItem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeMeeting || !name.trim() || quantity < 1) return;
    setSaving(true); setError(''); setFeedback('');
    const item = { meetingId: activeMeeting.id, name: name.trim(), quantity, assignedTo };
    try {
      if (editingItemId) await updateMeetingEquipment(editingItemId, item);
      else await addMeetingEquipment(item);
      setFeedback(editingItemId ? 'פרטי הציוד עודכנו.' : 'הציוד נוסף למפגש.');
      resetItemForm();
    } catch (saveError) {
      console.error('Meeting equipment save failed:', saveError);
      setError('לא ניתן לשמור את הציוד. בדקו את החיבור ונסו שוב.');
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (item: MeetingEquipment) => {
    if (!window.confirm(`להסיר את „${item.name}” מרשימת הציוד למפגש?`)) return;
    setError(''); setFeedback('');
    try {
      await removeMeetingEquipment(item.id);
      setFeedback('הציוד הוסר מהמפגש.');
    } catch (removeError) {
      console.error('Meeting equipment removal failed:', removeError);
      setError('לא ניתן להסיר את הציוד כרגע.');
    }
  };

  const addRecipient = async (event: React.FormEvent) => {
    event.preventDefault();
    const email = recipientInput.trim();
    if (!isEmail(email)) {
      setError('כתובת המייל לא תקינה. בדקו אותה ונסו שוב.');
      setFeedback('');
      return;
    }
    if (parsedRecipients.some(recipient => recipient.toLowerCase() === email.toLowerCase())) {
      setError('הכתובת הזו כבר נמצאת ברשימה.');
      setFeedback('');
      return;
    }
    if (parsedRecipients.length >= 30) {
      setError('אפשר לשמור עד 30 נמענים.');
      setFeedback('');
      return;
    }
    setSavingRecipient(true); setError(''); setFeedback('');
    try {
      await setLogisticsEmailRecipients([...parsedRecipients, email]);
      setRecipientInput('');
      setFeedback('כתובת המייל נוספה ונשמרה לצוות.');
    } catch (saveError) {
      console.error('Logistics email recipient save failed:', saveError);
      setError('לא הצלחנו לשמור את הכתובת.');
    } finally {
      setSavingRecipient(false);
    }
  };

  const removeRecipient = async (email: string) => {
    setSavingRecipient(true); setError(''); setFeedback('');
    try {
      await setLogisticsEmailRecipients(parsedRecipients.filter(recipient => recipient !== email));
      setFeedback('כתובת המייל הוסרה.');
    } catch (saveError) {
      console.error('Logistics email recipient removal failed:', saveError);
      setError('לא הצלחנו להסיר את הכתובת.');
    } finally {
      setSavingRecipient(false);
    }
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setFeedback('ההודעה הועתקה. אפשר להדביק אותה בכל מקום.');
      setError('');
    } catch (copyError) {
      console.error('Logistics message copy failed:', copyError);
      setError('ההעתקה נחסמה בדפדפן. סמנו והעתיקו את ההודעה מהתצוגה.');
    }
  };

  const sendWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(messageText)}`, '_blank', 'noopener,noreferrer');
    setError('');
    setFeedback('פתחנו את WhatsApp עם ההודעה מוכנה.');
  };

  const sendEmail = () => {
    if (!parsedRecipients.length || parsedRecipients.some(email => !isEmail(email))) {
      setError('הגדירו כתובת מייל תקינה לפני פתיחת הודעת המייל.');
      return;
    }
    const subject = `ציוד למפגש: ${activeMeeting?.title ?? ''}`;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(parsedRecipients.join(','))}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(messageText)}`;
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
    setError('');
    setFeedback('פתחנו טיוטה ב־Gmail עם הנמענים וההודעה.');
  };

  if (!activeMeeting) {
    const nextMeeting = orderedMeetings.find(meeting => meeting.date >= new Date().toISOString().slice(0, 10));
    return (
      <div className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="relative overflow-hidden rounded-[28px] bg-[#251c17] px-4 py-5 text-white shadow-xl sm:px-9 sm:py-10">
          <div className="absolute -left-12 -top-20 h-64 w-64 rounded-full bg-brand/30 blur-3xl" aria-hidden="true" />
          <div className="relative flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-orange-100"><PackagePlus size={14} />תכנון מפגשים · לוגיסטיקה</div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">כל מפגש, כל הפרטים.</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/65 sm:text-base">בוחרים מפגש מהסילבוס, מחלקים ציוד בין הצוות, ושולחים לכולם סיכום מוכן.</p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand text-white"><CalendarDays size={22} /></div>
              <div><div className="text-2xl font-black leading-none">{orderedMeetings.length}</div><div className="mt-1 text-xs text-white/60">מפגשים בסילבוס</div></div>
            </div>
          </div>
        </header>

        <section aria-labelledby="logistics-meetings-title" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs font-black uppercase tracking-[0.16em] text-brand">היומן של הצוות</p><h2 id="logistics-meetings-title" className="mt-1 text-2xl font-black text-text-main">לאיזה מפגש מתכוננים?</h2></div>
            {nextMeeting && <span className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1.5 text-xs font-bold text-brand"><span className="h-2 w-2 rounded-full bg-brand" />הבא בתור · {formatDate(nextMeeting.date)}</span>}
          </div>

          {orderedMeetings.length ? (
            <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
              {orderedMeetings.map((meeting, index) => {
                const isNext = meeting.id === nextMeeting?.id;
                const itemCount = meetingEquipment.filter(item => item.meetingId === meeting.id).length;
                return (
                  <button key={meeting.id} type="button" onClick={() => setActiveMeetingId(meeting.id)} className="group flex w-full items-center gap-4 border-b border-border p-4 text-right transition-colors last:border-b-0 hover:bg-brand/[0.04] sm:gap-5 sm:px-6 sm:py-5">
                    <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-sm font-black ${isNext ? 'bg-brand text-white' : 'bg-surface-alt text-text-muted group-hover:bg-brand/10 group-hover:text-brand'}`}>{String(index + 1).padStart(2, '0')}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-black text-text-main sm:text-lg">{meeting.title}</h3>
                        {isNext && <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-black text-green-700 dark:text-green-300">המפגש הבא</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted sm:text-sm">
                        <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} className="text-brand" />{formatDate(meeting.date)}</span>
                        <span className="inline-flex items-center gap-1.5"><Clock3 size={14} className="text-brand" />{meeting.time || 'שעה לא נקבעה'}</span>
                        {meeting.location && <span className="inline-flex items-center gap-1.5"><MapPin size={14} className="text-brand" />{meeting.location}</span>}
                      </div>
                    </div>
                    <div className="hidden shrink-0 text-left sm:block"><div className="text-sm font-black text-text-main">{itemCount}</div><div className="text-[11px] text-text-muted">פריטי ציוד</div></div>
                    <ChevronLeft size={20} className="shrink-0 text-text-muted transition-transform group-hover:-translate-x-1 group-hover:text-brand" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-surface p-5 text-center sm:p-12">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-brand"><CalendarDays size={26} /></div>
              <h3 className="mt-4 text-lg font-black text-text-main">עוד אין מפגשים בסילבוס</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-muted">אחרי שיוצרים מפגש בסילבוס, הוא יופיע כאן ואפשר יהיה להכין עבורו רשימת ציוד משלו.</p>
              {onOpenSyllabus && <button type="button" onClick={onOpenSyllabus} className="gaming-button mt-5"><CalendarDays size={16} />מעבר לסילבוס</button>}
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <button type="button" onClick={() => setActiveMeetingId(null)} className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-bold text-text-muted transition hover:border-brand/40 hover:text-brand"><ArrowRight size={16} />כל המפגשים</button>

      <header className="relative overflow-hidden rounded-[28px] border border-border bg-surface p-4 shadow-sm sm:p-8">
        <div className="absolute -left-10 -top-20 h-52 w-52 rounded-full bg-brand/10 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-brand">תכנון ציוד למפגש</p>
            <h1 className="mt-2 break-words text-3xl font-black text-text-main sm:text-4xl">{activeMeeting.title}</h1>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-text-muted">
              <span className="inline-flex items-center gap-2"><CalendarDays size={16} className="text-brand" />{formatDate(activeMeeting.date)}</span>
              <span className="inline-flex items-center gap-2"><Clock3 size={16} className="text-brand" />{activeMeeting.time || 'שעה לא נקבעה'}</span>
              {activeMeeting.location && <span className="inline-flex items-center gap-2"><MapPin size={16} className="text-brand" />{activeMeeting.location}</span>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-2xl bg-surface-alt px-4 py-3">
            <Users size={18} className="text-brand" /><span className="text-sm font-black text-text-main">{assignedCount}/{activeItems.length}</span><span className="text-xs text-text-muted">שובצו לאחראי</span>
          </div>
        </div>
      </header>

      {(feedback || error) && <div role={error ? 'alert' : 'status'} className={`fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-1/2 z-[100] flex max-w-[min(92vw,26rem)] -translate-x-1/2 items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200 md:bottom-5 ${error ? 'border-red-500/30 bg-surface/95 text-red-700 dark:text-red-300' : 'border-green-500/30 bg-surface/95 text-green-700 dark:text-green-300'}`}><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${error ? 'bg-red-500/10' : 'bg-green-500/10'}`}>{error ? <X size={16} /> : <Check size={16} />}</span><span>{error || feedback}</span></div>}

      <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm" aria-labelledby="equipment-title">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-5 sm:px-7">
          <div><p className="text-xs font-black uppercase tracking-[0.16em] text-brand">רשימה למפגש הזה בלבד</p><h2 id="equipment-title" className="mt-1 text-2xl font-black text-text-main">מה צריך להביא?</h2></div>
          <button type="button" onClick={() => { resetItemForm(); setShowAddForm(true); }} className="gaming-button"><Plus size={18} />הוספת ציוד</button>
        </div>

        {activeItems.length ? (
          <div className="divide-y divide-border">
            {activeItems.map((item, index) => editingItemId === item.id ? (
              <form key={item.id} onSubmit={saveItem} className="grid gap-3 bg-brand/[0.035] p-4 sm:grid-cols-[minmax(0,1fr)_100px_minmax(160px,0.65fr)_auto] sm:items-end sm:px-6">
                <div><label htmlFor="edit-equipment-name" className="mb-1 block text-xs font-bold text-text-muted">שם הפריט</label><input id="edit-equipment-name" required autoFocus value={name} onChange={event => setName(event.target.value)} className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-main outline-none focus:border-brand" /></div>
                <div><label htmlFor="edit-equipment-quantity" className="mb-1 block text-xs font-bold text-text-muted">כמות</label><input id="edit-equipment-quantity" type="number" min="1" required value={quantity} onChange={event => setQuantity(Number(event.target.value))} className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-main outline-none focus:border-brand" /></div>
                <div><label htmlFor="edit-equipment-owner" className="mb-1 block text-xs font-bold text-text-muted">מי מביא?</label><select id="edit-equipment-owner" value={assignedTo} onChange={event => setAssignedTo(event.target.value)} className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-main outline-none focus:border-brand"><option value="">עדיין לא שובץ</option>{TEAM_MEMBERS.map(member => <option key={member} value={member}>{member}</option>)}</select></div>
                <div className="flex gap-2"><button type="submit" disabled={saving} className="rounded-xl bg-brand px-3 py-2.5 text-sm font-black text-white disabled:opacity-50"><Check size={17} /></button><button type="button" disabled={saving} onClick={resetItemForm} className="rounded-xl border border-border px-3 py-2.5 text-text-muted"><X size={17} /></button></div>
              </form>
            ) : (
              <div key={item.id} className="group grid gap-3 px-4 py-4 transition-colors hover:bg-surface-alt/45 sm:grid-cols-[48px_minmax(0,1.1fr)_minmax(170px,0.8fr)_auto] sm:items-center sm:px-6">
                <div className="hidden h-10 w-10 place-items-center rounded-xl bg-surface-alt text-xs font-black text-text-muted sm:grid">{String(index + 1).padStart(2, '0')}</div>
                <div className="min-w-0"><h3 className="truncate font-black text-text-main">{item.name}<span className="mr-2 rounded-lg bg-surface-alt px-2 py-0.5 text-xs font-bold text-text-muted">×{item.quantity}</span></h3><p className="mt-1 text-xs text-text-muted">ציוד למפגש · {activeMeeting.title}</p></div>
                <div className="flex items-center gap-2 sm:justify-self-start"><span className={`h-2 w-2 rounded-full ${item.assignedTo ? 'bg-green-500' : 'bg-amber-500'}`} /><select aria-label={`מי מביא את ${item.name}`} value={item.assignedTo} onChange={async event => {
                  try { await updateMeetingEquipment(item.id, { meetingId: item.meetingId, name: item.name, quantity: item.quantity, assignedTo: event.target.value }); setFeedback('האחראי עודכן.'); setError(''); }
                  catch (assignError) { console.error('Equipment assignment failed:', assignError); setError('לא ניתן לעדכן את האחראי.'); }
                }} className="min-w-36 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-bold text-text-main outline-none transition focus:border-brand"><option value="">בחירת אחראי</option>{TEAM_MEMBERS.map(member => <option key={member} value={member}>{member}</option>)}</select></div>
                <div className="flex items-center gap-1 sm:justify-self-end"><button type="button" onClick={() => startEditing(item)} aria-label={`עריכת ${item.name}`} className="rounded-xl p-2.5 text-text-muted transition hover:bg-brand/10 hover:text-brand"><Pencil size={17} /></button><button type="button" onClick={() => void deleteItem(item)} aria-label={`הסרת ${item.name}`} className="rounded-xl p-2.5 text-text-muted transition hover:bg-red-500/10 hover:text-red-600"><Trash2 size={17} /></button></div>
              </div>
            ))}
          </div>
        ) : !showAddForm ? (
          <div className="px-5 py-12 text-center sm:px-8"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-brand"><PackagePlus size={25} /></div><h3 className="mt-4 text-lg font-black text-text-main">רשימת הציוד עוד ריקה</h3><p className="mt-2 text-sm text-text-muted">הוסיפו פריט ושייכו אותו לחבר או חברת צוות.</p><button type="button" onClick={() => setShowAddForm(true)} className="gaming-button mt-5"><Plus size={17} />הוספת הפריט הראשון</button></div>
        ) : null}

        {showAddForm && (
          <form onSubmit={saveItem} className="grid gap-3 border-t border-border bg-surface-alt/60 p-4 sm:grid-cols-[minmax(0,1fr)_100px_minmax(160px,0.65fr)_auto] sm:items-end sm:px-6">
            <div><label htmlFor="new-equipment-name" className="mb-1 block text-xs font-bold text-text-muted">שם הפריט</label><input id="new-equipment-name" required autoFocus placeholder="למשל: מקרן, כבל HDMI…" value={name} onChange={event => setName(event.target.value)} className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-main outline-none focus:border-brand" /></div>
            <div><label htmlFor="new-equipment-quantity" className="mb-1 block text-xs font-bold text-text-muted">כמות</label><input id="new-equipment-quantity" type="number" min="1" required value={quantity} onChange={event => setQuantity(Number(event.target.value))} className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-main outline-none focus:border-brand" /></div>
            <div><label htmlFor="new-equipment-owner" className="mb-1 block text-xs font-bold text-text-muted">מי מביא?</label><select id="new-equipment-owner" value={assignedTo} onChange={event => setAssignedTo(event.target.value)} className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-main outline-none focus:border-brand"><option value="">עדיין לא שובץ</option>{TEAM_MEMBERS.map(member => <option key={member} value={member}>{member}</option>)}</select></div>
            <div className="flex gap-2"><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"><Plus size={17} />{saving ? 'שומר…' : 'הוספה'}</button><button type="button" disabled={saving} onClick={resetItemForm} aria-label="ביטול" className="rounded-xl border border-border px-3 py-2.5 text-text-muted"><X size={17} /></button></div>
          </form>
        )}
      </section>

      <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm" aria-labelledby="share-logistics-title">
        <div className="grid gap-4 p-4 sm:gap-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-brand">מוכן להפצה</p>
            <h2 id="share-logistics-title" className="mt-1 text-2xl font-black text-text-main">כולם יודעים מה להביא.</h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-text-muted">ההודעה נוצרת מרשימת הציוד של המפגש ומקובצת לפי מי שאחראי להביא כל פריט.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={sendWhatsApp} className="inline-flex items-center gap-2 rounded-xl bg-[#20a864] px-4 py-3 text-sm font-black text-white transition hover:bg-[#178d53]"><MessageCircle size={17} />שליחה בוואטסאפ</button>
              <button type="button" onClick={sendEmail} className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-black text-text-main transition hover:border-brand/50 hover:text-brand"><Mail size={17} />פתיחה ב־Gmail</button>
              <button type="button" onClick={() => void copyMessage()} className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-black text-text-main transition hover:border-brand/50 hover:text-brand"><Copy size={17} />העתקת הודעה</button>
            </div>
            <details className="mt-5 rounded-2xl border border-border bg-surface-alt/50 p-4">
              <summary className="cursor-pointer text-sm font-bold text-text-main">הגדרת נמעני מייל לצוות</summary>
              <div className="mt-4 space-y-4">
                <form onSubmit={addRecipient} className="space-y-2">
                  <label htmlFor="logistics-email-recipient" className="block text-xs font-bold text-text-muted">מוסיפים כתובת אחת בכל פעם</label>
                  <div className="flex gap-2">
                    <input id="logistics-email-recipient" type="email" dir="ltr" required value={recipientInput} onChange={event => setRecipientInput(event.target.value)} placeholder="name@example.com" className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-left text-sm text-text-main outline-none focus:border-brand" />
                    <button type="submit" disabled={savingRecipient} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-text-main px-3 py-2.5 text-xs font-black text-surface transition hover:opacity-90 disabled:opacity-50"><Plus size={15} />{savingRecipient ? 'שומר…' : 'הוספת כתובת'}</button>
                  </div>
                </form>
                {parsedRecipients.length ? <ul className="flex flex-wrap gap-2" aria-label="כתובות שמורות">
                  {parsedRecipients.map(email => <li key={email} className="inline-flex max-w-full items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-main"><span dir="ltr" className="truncate">{email}</span><button type="button" disabled={savingRecipient} onClick={() => void removeRecipient(email)} aria-label={`הסרת ${email}`} className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-text-muted transition hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50"><X size={14} /></button></li>)}
                </ul> : <p className="rounded-xl border border-dashed border-border px-3 py-3 text-xs text-text-muted">עדיין לא נוספו נמענים. הכתובות שתוסיפו כאן יישמרו לצוות.</p>}
              </div>
            </details>
          </div>
          <div className="min-w-0 rounded-2xl border border-border bg-[#fbfaf8] p-4 dark:bg-[#1d1a18] sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3 border-b border-border pb-3"><div className="flex items-center gap-2 text-xs font-black text-text-muted"><MessageCircle size={15} className="text-brand" />תצוגת הודעה</div><span className="rounded-full bg-green-500/10 px-2.5 py-1 text-[10px] font-bold text-green-700 dark:text-green-300">{activeItems.length} פריטים</span></div>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-sans text-sm leading-6 text-text-main">{messageText}</pre>
          </div>
        </div>
      </section>
      <p className="text-center text-xs text-text-muted">{currentUser ? `מתכננים כ־${currentUser}` : 'ההגדרות משותפות לצוות'} · ציוד נשמר בנפרד לכל מפגש</p>
    </div>
  );
}
