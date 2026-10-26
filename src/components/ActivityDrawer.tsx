import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X } from 'lucide-react';
import { ActivityEvent } from '../types';

const categories: Record<ActivityEvent['category'], { label: string; badge: string; dot: string }> = {
  logistics: { label: 'לוגיסטיקה', badge: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300', dot: 'bg-cyan-500' },
  candidates: { label: 'מיונים', badge: 'bg-violet-500/15 text-violet-700 dark:text-violet-300', dot: 'bg-violet-500' },
  syllabus: { label: 'סילבוס', badge: 'bg-orange-500/15 text-orange-700 dark:text-orange-300', dot: 'bg-orange-500' },
  budget: { label: 'תקציב', badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
};

export default function ActivityDrawer({ events, onClose, onSelect }: {
  events: ActivityEvent[];
  onClose: () => void;
  onSelect: (event: ActivityEvent) => void;
}) {
  const [olderEvents, setOlderEvents] = useState<ActivityEvent[]>([]);
  const [hasMore, setHasMore] = useState(events.length >= 40);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const allEvents = useMemo(() => {
    const byId = new Map([...events, ...olderEvents].map(event => [event.id, event]));
    return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [events, olderEvents]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const loadMore = async () => {
    const before = allEvents.at(-1)?.createdAt;
    if (!before || loading) return;
    setLoading(true); setError('');
    try {
      const response = await fetch(`/api/store?activityBefore=${encodeURIComponent(before)}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('לא ניתן לטעון פעולות נוספות.');
      const page = await response.json() as { activityEvents: ActivityEvent[]; hasMore: boolean };
      setOlderEvents(previous => [...previous, ...page.activityEvents]);
      setHasMore(page.hasMore);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'לא ניתן לטעון פעולות נוספות.');
    } finally { setLoading(false); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[95] bg-black/45" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <aside role="dialog" aria-modal="true" aria-labelledby="activity-heading" className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-5">
          <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand"><Bell size={20} /></div><div><h2 id="activity-heading" className="text-lg font-black text-text-main">פעילות באתר</h2><p className="text-xs text-text-muted">עדכונים שנשמרו במערכת</p></div></div>
          <button type="button" onClick={onClose} aria-label="סגירת התראות" className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-alt hover:text-text-main"><X size={20} /></button>
        </header>
        <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto px-4 py-5">
          {!allEvents.length && <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-text-muted">פעולות חדשות יופיעו כאן לאחר שמירה במערכת.</div>}
          {allEvents.map(event => {
            const category = categories[event.category] || categories.logistics;
            return <button key={event.id} type="button" onClick={() => onSelect(event)} className="flex w-full gap-3 rounded-2xl border border-border bg-surface-alt/60 p-4 text-right transition-colors hover:border-brand/50 hover:bg-brand/5">
              <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${category.dot}`} />
              <span className="min-w-0 flex-1"><span className="mb-2 flex flex-wrap items-center justify-between gap-2"><span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${category.badge}`}>{category.label}</span><time dateTime={event.createdAt} className="text-[11px] text-text-muted">{new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(event.createdAt))}</time></span><span className="block break-words text-sm font-bold text-text-main">{event.text}</span><span className="mt-1 block text-xs text-text-muted">על ידי {event.actor || 'חבר צוות'}</span></span>
            </button>;
          })}
          {error && <p role="alert" className="text-center text-sm text-red-600">{error}</p>}
          {hasMore && <button type="button" onClick={() => void loadMore()} disabled={loading} className="w-full rounded-xl border border-border px-4 py-2 text-sm font-bold text-text-main transition-colors hover:bg-surface-alt disabled:opacity-60">{loading ? 'טוען…' : 'טעינת פעולות נוספות'}</button>}
        </div>
      </aside>
    </div>, document.body
  );
}
