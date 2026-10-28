import { useState } from 'react';
import { Check, PackagePlus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useStore } from '../StoreContext';
import type { Equipment } from '../types';

export default function InventoryManager() {
  const { equipment, addEquipment, updateEquipment, removeEquipment } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const resetForm = () => { setShowForm(false); setEditingId(null); setName(''); setQuantity(1); };
  const editItem = (item: Equipment) => {
    setEditingId(item.id); setName(item.name); setQuantity(item.quantity); setShowForm(true); setError(''); setFeedback('');
  };
  const saveItem = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName || !Number.isInteger(quantity) || quantity < 1) return;
    if (equipment.some(item => item.id !== editingId && item.name.trim().toLocaleLowerCase('he') === cleanName.toLocaleLowerCase('he'))) {
      setError('הפריט הזה כבר קיים במלאי הכללי.'); setFeedback(''); return;
    }
    setSaving(true); setError(''); setFeedback('');
    try {
      if (editingId) await updateEquipment(editingId, { name: cleanName, quantity, status: 'available' });
      else await addEquipment({ name: cleanName, quantity, status: 'available' });
      setFeedback(editingId ? 'המלאי עודכן.' : 'הפריט נוסף למלאי הכללי.');
      resetForm();
    } catch (saveError) {
      console.error('Inventory save failed:', saveError);
      setError('לא ניתן לשמור את המלאי כרגע.');
    } finally { setSaving(false); }
  };
  const deleteItem = async (item: Equipment) => {
    if (!window.confirm(`להסיר את „${item.name}” מהמלאי הכללי? פריטים שכבר הותאמו למפגש יישארו בו.`)) return;
    setSaving(true); setError(''); setFeedback('');
    try {
      await removeEquipment(item.id);
      if (editingId === item.id) resetForm();
      setFeedback('הפריט הוסר מהמלאי הכללי.');
    } catch (removeError) {
      console.error('Inventory removal failed:', removeError);
      setError('לא ניתן להסיר את הפריט כרגע.');
    } finally { setSaving(false); }
  };

  return <section aria-labelledby="inventory-title" className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5 sm:px-7">
      <div><p className="text-xs font-black uppercase tracking-[0.16em] text-brand">הגדרות לכל המפגשים</p><h2 id="inventory-title" className="mt-1 text-2xl font-black text-text-main">מלאי כללי</h2><p className="mt-2 max-w-2xl text-sm text-text-muted">הפריטים והכמויות כאן מופיעים כברירת מחדל בכל מפגש. אפשר להתאים כל מפגש בנפרד.</p></div>
      <button type="button" onClick={() => { resetForm(); setShowForm(true); setError(''); }} className="gaming-button"><Plus size={17} />הוספת פריט למלאי</button>
    </div>
    {(error || feedback) && <p role={error ? 'alert' : 'status'} className={`mx-5 mt-4 rounded-xl px-3 py-2 text-sm font-bold sm:mx-7 ${error ? 'bg-red-500/10 text-red-700 dark:text-red-300' : 'bg-green-500/10 text-green-700 dark:text-green-300'}`}>{error || feedback}</p>}
    {showForm && <form onSubmit={saveItem} className="grid gap-3 border-b border-border bg-surface-alt/50 p-4 sm:grid-cols-[minmax(0,1fr)_120px_auto] sm:items-end sm:px-7">
      <div><label htmlFor="inventory-name" className="mb-1 block text-xs font-bold text-text-muted">שם הפריט</label><input id="inventory-name" autoFocus required maxLength={100} value={name} onChange={event => setName(event.target.value)} placeholder="למשל: מקרן, כבל HDMI…" className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-main outline-none focus:border-brand" /></div>
      <div><label htmlFor="inventory-quantity" className="mb-1 block text-xs font-bold text-text-muted">כמות ברירת מחדל</label><input id="inventory-quantity" type="number" min="1" step="1" required value={quantity} onChange={event => setQuantity(Number(event.target.value))} className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-main outline-none focus:border-brand" /></div>
      <div className="flex gap-2"><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"><Check size={17} />{saving ? 'שומר…' : editingId ? 'שמירת שינוי' : 'הוספה'}</button><button type="button" disabled={saving} onClick={resetForm} aria-label="ביטול עריכת מלאי" className="rounded-xl border border-border px-3 py-2.5 text-text-muted"><X size={17} /></button></div>
    </form>}
    {equipment.length ? <ul className="divide-y divide-border" aria-label="פריטי המלאי הכללי">{[...equipment].sort((a, b) => a.name.localeCompare(b.name, 'he')).map(item => <li key={item.id} className="flex flex-wrap items-center gap-3 px-5 py-3 sm:px-7"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand"><PackagePlus size={19} /></div><strong className="min-w-0 flex-1 truncate text-sm text-text-main sm:text-base">{item.name}</strong><span className="rounded-lg bg-surface-alt px-2.5 py-1 text-xs font-black text-text-muted">×{item.quantity}</span><button type="button" disabled={saving} onClick={() => editItem(item)} aria-label={`עריכת ${item.name} במלאי`} className="rounded-xl p-2 text-text-muted hover:bg-brand/10 hover:text-brand disabled:opacity-50"><Pencil size={17} /></button><button type="button" disabled={saving} onClick={() => void deleteItem(item)} aria-label={`הסרת ${item.name} מהמלאי`} className="rounded-xl p-2 text-text-muted hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50"><Trash2 size={17} /></button></li>)}</ul>
      : <div className="px-5 py-8 text-center text-sm text-text-muted sm:px-7">המלאי הכללי ריק. הוסיפו פריטים כדי שיופיעו אוטומטית בכל מפגש.</div>}
  </section>;
}
