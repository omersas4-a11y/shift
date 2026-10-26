import { useEffect, useState } from 'react';
import JoystickRating from '../JoystickRating';

type PublicMeeting = { title: string; date: string; time: string };

export default function FeedbackPage({ code }: { code: string }) {
  const [meeting, setMeeting] = useState<PublicMeeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rating, setRating] = useState(0);
  const [liked, setLiked] = useState('');
  const [disliked, setDisliked] = useState('');
  const [saving, setSaving] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/feedback?code=${encodeURIComponent(code)}`)
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'הקישור אינו זמין.'); return data as PublicMeeting; })
      .then(data => { if (alive) setMeeting(data); })
      .catch(cause => { if (alive) setError(cause instanceof Error ? cause.message : 'הקישור אינו זמין.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [code]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!rating || saving) return;
    setSaving(true); setError('');
    try {
      const response = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, rating, liked, disliked }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'שמירת המשוב נכשלה.');
      setComplete(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'שמירת המשוב נכשלה.'); }
    finally { setSaving(false); }
  };

  return <main dir="rtl" className="feedback-page min-h-dvh px-4 py-7 text-[#261B13] sm:py-12">
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 flex items-center justify-between gap-3"><img src="/logos/shift logo.png" alt="SHiFT" className="h-auto w-28 object-contain sm:w-36" /><span className="rounded-full border border-[#261B13]/15 bg-white/80 px-3 py-1 text-xs font-bold">משוב אנונימי</span></div>
      <section className="feedback-panel overflow-hidden rounded-[24px] border-2 border-[#261B13] bg-[#EFECEA] shadow-[6px_6px_0_#261B13]">
        <div className="h-2 bg-[linear-gradient(90deg,#FF5A00_0_25%,#261B13_25%_50%,#FF5A00_50%_75%,#261B13_75%)]" />
        <div className="p-5 sm:p-9">
          {loading ? <p className="py-16 text-center font-bold">טוענים את המפגש…</p> : meeting ? <>
            <p className="mb-2 text-sm font-black text-[#C34800]">איך היה במפגש?</p>
            <h1 className="mb-2 text-2xl font-black leading-tight sm:text-3xl">{meeting.title}</h1>
            <p className="mb-7 text-sm text-[#5A514B]">{meeting.date && meeting.date.split('-').reverse().join('/')} {meeting.time && `· ${meeting.time}`}</p>
            {complete ? <div role="status" className="rounded-2xl border border-[#FF5A00]/30 bg-white p-8 text-center"><div className="mb-3 text-4xl">✓</div><h2 className="text-xl font-black">תודה על המשוב!</h2><p className="mt-2 text-sm text-[#5A514B]">התשובות נשמרו בלי שם או פרטים מזהים.</p></div> :
              <form onSubmit={submit} className="space-y-7">
                <fieldset><legend className="mb-2 text-base font-black">דרגו את המפגש</legend><p className="mb-4 text-sm text-[#5A514B]">בחרו בין 1 ל־5 ג'ויסטיקים</p><JoystickRating value={rating} onChange={setRating} /><p className="mt-3 min-h-5 text-sm font-bold text-[#C34800]">{rating ? `${rating} מתוך 5` : 'עדיין לא נבחר דירוג'}</p></fieldset>
                <label className="block text-sm font-black">מה אהבת?<textarea value={liked} onChange={event => setLiked(event.target.value)} maxLength={2000} rows={4} placeholder="ספרו לנו מה עבד טוב…" className="feedback-input mt-2 block w-full resize-y rounded-xl border-2 border-[#261B13]/25 bg-white p-3 font-normal outline-none focus:border-[#FF5A00]" /></label>
                <label className="block text-sm font-black">מה פחות אהבת?<textarea value={disliked} onChange={event => setDisliked(event.target.value)} maxLength={2000} rows={4} placeholder="מה כדאי לשפר בפעם הבאה?" className="feedback-input mt-2 block w-full resize-y rounded-xl border-2 border-[#261B13]/25 bg-white p-3 font-normal outline-none focus:border-[#FF5A00]" /></label>
                {error && <p role="alert" className="text-sm font-bold text-red-700">{error}</p>}
                <button disabled={!rating || saving} type="submit" className="min-h-12 w-full rounded-xl bg-[#FF5A00] px-5 py-3 font-black text-white shadow-[3px_3px_0_#261B13] transition hover:bg-[#E04E00] disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'שולחים…' : 'שליחת משוב'}</button>
                <p className="text-center text-xs leading-relaxed text-[#5A514B]">המשוב אנונימי. אין צורך להתחבר או להזין פרטים אישיים.</p>
              </form>}
          </> : <div role="alert" className="py-16 text-center"><h1 className="text-xl font-black">המשוב אינו זמין</h1><p className="mt-2 text-sm">{error || 'הקישור אינו תקין.'}</p></div>}
        </div>
      </section>
    </div>
  </main>;
}
