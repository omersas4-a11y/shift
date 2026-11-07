import { useState } from 'react';
import { CheckCircle2, CalendarDays } from 'lucide-react';

export const HANUKKAH_DAYS = [
  { id: 'monday', label: 'שני' }, { id: 'tuesday', label: 'שלישי' },
  { id: 'wednesday', label: 'רביעי' }, { id: 'thursday', label: 'חמישי' },
];

export default function HanukkahForm() {
  const [name, setName] = useState('');
  const [preference, setPreference] = useState<'alternate_day' | 'extend_semester' | ''>('');
  const [days, setDays] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (preference === 'alternate_day' && !days.length) { setError('בחרו לפחות יום אחד שבו אתם פנויים.'); return; }
    setSaving(true); setError('');
    try {
      const response = await fetch('/api/hanukkah', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, preference, days: preference === 'alternate_day' ? days : [] }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'שליחת התשובה נכשלה.');
      setDone(true);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'שליחת התשובה נכשלה.'); }
    finally { setSaving(false); }
  };
  return <main dir="rtl" className="feedback-page min-h-screen px-4 py-8 text-text-main sm:py-12"><div className="mx-auto max-w-xl"><img src="/logos/shift logo.png" alt="SHiFT" className="mx-auto mb-7 w-36" /><section className="rounded-2xl border border-border bg-surface p-5 shadow-lg sm:p-8">
    {done ? <div role="status" className="py-8 text-center"><CheckCircle2 size={44} className="mx-auto text-green-700" /><h1 className="mt-4 text-2xl font-black">תודה, התשובה נשמרה!</h1><p className="mt-2 text-text-muted">הצוות יוכל לראות את הבחירה שלכם.</p></div> : <><div className="mb-6"><span className="inline-flex items-center gap-2 text-sm font-bold text-brand"><CalendarDays size={17} /> סקר לסטודנטים</span><h1 className="mt-3 text-3xl font-black">השלמת מפגש חנוכה</h1><p className="mt-2 text-sm leading-6 text-text-muted">עזרו לנו לבחור את האפשרות המתאימה ביותר להשלמת המפגש.</p></div><form onSubmit={submit} className="space-y-6">
      <label className="block space-y-2 font-bold">שם מלא<input required minLength={2} maxLength={100} value={name} onChange={event => setName(event.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-3 text-text-main" /></label>
      <fieldset className="space-y-3"><legend className="mb-2 font-bold">מה אתם מעדיפים?</legend>{[{ id: 'alternate_day', label: 'השלמת המפגש ביום אחר בשבוע חנוכה' }, { id: 'extend_semester', label: 'דחיית הסמסטר בשבוע (24.1)' }].map(option => <label key={option.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 text-sm font-bold"><input type="radio" required name="preference" value={option.id} checked={preference === option.id} onChange={() => { setPreference(option.id as typeof preference); setError(''); }} className="mt-1 accent-[#ff5a00]" />{option.label}</label>)}</fieldset>
      {preference === 'alternate_day' && <fieldset className="space-y-3"><legend className="mb-2 font-bold">באילו ימים אתם פנויים להשלמת המפגש?</legend><p className="text-xs text-text-muted">אפשר לבחור כמה ימים.</p><div className="grid grid-cols-2 gap-2">{HANUKKAH_DAYS.map(day => <label key={day.id} className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm font-bold"><input type="checkbox" checked={days.includes(day.id)} onChange={event => setDays(previous => event.target.checked ? [...previous, day.id] : previous.filter(value => value !== day.id))} className="accent-[#ff5a00]" />יום {day.label}</label>)}</div></fieldset>}
      {error && <p role="alert" className="text-sm font-bold text-red-600">{error}</p>}<button type="submit" disabled={saving} className="gaming-button w-full disabled:opacity-60">{saving ? 'שולחים…' : 'שליחת התשובה'}</button>
    </form></>}
  </section></div></main>;
}
