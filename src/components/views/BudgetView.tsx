import React from "react";
import { useState, useEffect } from 'react';
import { useStore } from '../../StoreContext';
import { Wallet, TrendingDown, Pencil, Check, X, Trash2, ImagePlus, Receipt } from 'lucide-react';
import { normalizeTeamMember, TEAM_MEMBERS } from '../../team';
import { blobToDataUrl, compressReceipt } from '../../lib/receiptImage';

async function uploadReceipt(file: File) {
  const compressed = await compressReceipt(file);
  const response = await fetch('/api/receipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: await blobToDataUrl(compressed) }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.path) throw new Error(result.error || 'העלאת הקבלה נכשלה.');
  return result.path as string;
}

async function deleteUnusedReceipt(path: string) {
  const response = await fetch(`/api/receipt?path=${encodeURIComponent(path)}`, { method: 'DELETE' });
  if (!response.ok) console.warn('Receipt cleanup was deferred:', response.status);
}

export default function BudgetView() {
  const { budget, addExpense, updateExpense, removeExpense, setTotalBudget } = useStore();
  
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPath, setReceiptPath] = useState('');
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [expenseBusy, setExpenseBusy] = useState(false);
  const [expenseFeedback, setExpenseFeedback] = useState('');
  const [expenseError, setExpenseError] = useState('');

  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [editBudgetValue, setEditBudgetValue] = useState(budget.totalAnnual);

  useEffect(() => {
    setEditBudgetValue(budget.totalAnnual);
  }, [budget.totalAnnual]);

  const totalSpent = budget.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const remaining = budget.totalAnnual - totalSpent;
  const spentPercentage = budget.totalAnnual > 0 ? Math.min((totalSpent / budget.totalAnnual) * 100, 100) : 0;
  const paymentsByMember = TEAM_MEMBERS.map(member => {
    const expenses = budget.expenses.filter(expense => normalizeTeamMember(expense.paidBy) === member);
    return { member, count: expenses.length, total: expenses.reduce((sum, expense) => sum + expense.amount, 0) };
  });
  const unassignedExpenses = budget.expenses.filter(expense => !normalizeTeamMember(expense.paidBy));
  const unassignedTotal = unassignedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  
  // Danger zone if > 85%
  const isDanger = spentPercentage > 85;

  const resetExpenseForm = () => {
    setTitle(''); setAmount(0); setCategory(''); setDate(''); setPaidBy(''); setReceiptFile(null); setReceiptPath(''); setEditingExpenseId(null); setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !category || !date || !paidBy || amount <= 0) return;
    setExpenseBusy(true); setExpenseError(''); setExpenseFeedback('');
    let uploadedPath = '';
    try {
      if (receiptFile) uploadedPath = await uploadReceipt(receiptFile);
      const expense = { title: title.trim(), amount, category: category.trim(), date, paidBy, receiptPath: uploadedPath || receiptPath };
      const previousPath = editingExpenseId ? budget.expenses.find(item => item.id === editingExpenseId)?.receiptPath : undefined;
      if (editingExpenseId) {
        await updateExpense(editingExpenseId, expense);
        setExpenseFeedback('ההוצאה עודכנה.');
      } else {
        await addExpense(expense);
        setExpenseFeedback('ההוצאה נוספה.');
      }
      if (previousPath && previousPath !== expense.receiptPath) void deleteUnusedReceipt(previousPath);
      resetExpenseForm();
    } catch (error) {
      console.error('Expense save failed:', error);
      if (uploadedPath) void deleteUnusedReceipt(uploadedPath);
      setExpenseError(error instanceof Error ? error.message : 'לא ניתן לשמור את ההוצאה. הנתונים נשארו כפי שהיו.');
    } finally {
      setExpenseBusy(false);
    }
  };

  const startEditingExpense = (expense: typeof budget.expenses[number]) => {
    setEditingExpenseId(expense.id);
    setTitle(expense.title);
    setAmount(expense.amount);
    setCategory(expense.category);
    setDate(expense.date);
    setPaidBy(expense.paidBy || '');
    setReceiptPath(expense.receiptPath || '');
    setReceiptFile(null);
    setShowForm(true);
    setExpenseError(''); setExpenseFeedback('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmDeleteExpense = async () => {
    if (!deleteTargetId) return;
    const oldReceiptPath = budget.expenses.find(expense => expense.id === deleteTargetId)?.receiptPath;
    setExpenseBusy(true); setExpenseError(''); setExpenseFeedback('');
    try {
      await removeExpense(deleteTargetId);
      if (oldReceiptPath) void deleteUnusedReceipt(oldReceiptPath);
      setDeleteTargetId(null);
      setExpenseFeedback('ההוצאה נמחקה.');
      if (editingExpenseId === deleteTargetId) resetExpenseForm();
    } catch (error) {
      console.error('Expense deletion failed:', error);
      setExpenseError('לא ניתן למחוק את ההוצאה. הנתונים נשארו כפי שהיו.');
    } finally {
      setExpenseBusy(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 sm:space-y-8">
      <header className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <h2 className="mb-2 flex items-center gap-3 text-2xl font-black uppercase text-text-main sm:text-3xl">
            <Wallet className="shrink-0 text-brand" size={28} />
            תקציב
          </h2>
          <p className="text-text-muted">ניהול זהב ומשאבים של המועדון - מעקב הוצאות לפי תקציב שנתי.</p>
        </div>
        <button className="gaming-button w-full justify-center sm:w-auto" onClick={() => {
          if (showForm) resetExpenseForm();
          else { setEditingExpenseId(null); setShowForm(true); }
        }}>
          {showForm ? 'ביטול' : '+ רשום הוצאה'}
        </button>
      </header>

      {(expenseFeedback || expenseError) && <div role={expenseError ? 'alert' : 'status'} className={`fixed left-1/2 top-20 z-[100] flex max-w-[min(92vw,28rem)] -translate-x-1/2 items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold shadow-xl ${expenseError ? 'border-red-500/30 bg-surface text-red-700 dark:text-red-300' : 'border-green-500/30 bg-surface text-green-700 dark:text-green-300'}`}><span>{expenseError || expenseFeedback}</span><button type="button" onClick={() => { setExpenseError(''); setExpenseFeedback(''); }} className="rounded-lg p-1" aria-label="סגירת הודעה"><X size={16} /></button></div>}
      
      {showForm && (
        <form onSubmit={handleSubmit} className="gaming-card space-y-4 bg-surface-alt p-4 sm:p-6">
          <h3 className="text-lg font-black text-text-main">{editingExpenseId ? 'עריכת הוצאה' : 'רישום הוצאה חדשה'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-muted">תיאור ההוצאה</label>
              <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text-main" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-muted">סכום (₪)</label>
              <input type="number" min="1" required value={amount} onChange={e => setAmount(parseInt(e.target.value) || 0)} className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text-main" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-muted">קטגוריה</label>
              <input type="text" required value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text-main" placeholder="למשל: ציוד, אוכל, תוכנה..." />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-muted">תאריך</label>
              <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text-main" />
            </div>
            <label className="space-y-1 text-xs font-bold text-text-muted">מי שילם את ההוצאה
              <select required value={paidBy} onChange={e => setPaidBy(e.target.value)} className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text-main">
                <option value="">בחרו חבר צוות</option>
                {TEAM_MEMBERS.map(member => <option key={member} value={member}>{member}</option>)}
              </select>
            </label>
            <div className="space-y-2">
              <label htmlFor="expense-receipt" className="block text-xs font-bold text-text-muted">צילום קבלה (לא חובה)</label>
              <label htmlFor="expense-receipt" className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-brand/60 bg-surface px-3 py-2 text-sm font-bold text-brand hover:bg-brand/5"><ImagePlus size={17} />{receiptFile ? receiptFile.name : 'בחרו תמונה או צלמו קבלה'}</label>
              <input id="expense-receipt" type="file" accept="image/*" onChange={e => setReceiptFile(e.target.files?.[0] || null)} className="sr-only" />
              <p className="text-xs text-text-muted">התמונה תוקטן אוטומטית כדי לחסוך מקום.</p>
              {receiptPath && !receiptFile && <div className="flex flex-wrap items-center gap-3 text-xs font-bold"><a href={`/api/receipt?path=${encodeURIComponent(receiptPath)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-brand hover:underline"><Receipt size={15} />צפייה בקבלה הקיימת</a><button type="button" onClick={() => setReceiptPath('')} className="text-red-600 hover:underline">הסר קבלה</button></div>}
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="submit" disabled={expenseBusy} className="gaming-button mt-2 w-full justify-center disabled:opacity-60 sm:flex-1">{expenseBusy ? 'שומר…' : editingExpenseId ? 'שמירת שינויים' : 'רשום הוצאה'}</button>
            {editingExpenseId && <button type="button" onClick={resetExpenseForm} className="gaming-button-outline mt-2 w-full justify-center sm:w-auto">ביטול עריכה</button>}
          </div>
        </form>
      )}

      {/* Progress / Stats */}
      <div className="gaming-card p-4 sm:p-8">
        <div className="mb-5 grid grid-cols-2 gap-4 sm:mb-8 sm:gap-8 md:grid-cols-3">
          <div className="col-span-2 space-y-1 border-b border-border pb-4 sm:col-span-1 sm:border-0 sm:pb-0">
            <div className="text-text-muted font-bold uppercase text-sm flex items-center gap-2">
              תקציב שנתי מוקצה
              {!isEditingBudget && (
                <button 
                  onClick={() => setIsEditingBudget(true)}
                  className="text-text-muted hover:text-brand transition-colors p-1 rounded hover:bg-surface-alt"
                  title="ערוך תקציב"
                >
                  <Pencil size={14} />
                </button>
              )}
            </div>
            {isEditingBudget ? (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-black text-text-main">₪</span>
                <input 
                  type="number" 
                  min="1"
                  value={editBudgetValue}
                  onChange={(e) => setEditBudgetValue(parseInt(e.target.value) || 0)}
                  className="bg-surface border border-brand/50 rounded px-2 py-1 text-2xl font-black text-text-main w-32 focus:outline-none focus:border-brand"
                  autoFocus
                />
                <button 
                  onClick={() => {
                    if (editBudgetValue > 0) {
                      setTotalBudget(editBudgetValue);
                      setIsEditingBudget(false);
                    }
                  }}
                  className="text-green-500 hover:bg-green-500/10 p-1 rounded transition-colors"
                  title="שמור"
                >
                  <Check size={20} />
                </button>
                <button 
                  onClick={() => {
                    setEditBudgetValue(budget.totalAnnual);
                    setIsEditingBudget(false);
                  }}
                  className="text-red-500 hover:bg-red-500/10 p-1 rounded transition-colors"
                  title="ביטול"
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
            <div className="text-2xl font-black text-text-main sm:text-4xl">₪{budget.totalAnnual.toLocaleString()}</div>
            )}
          </div>
          <div className="space-y-1">
            <div className="text-text-muted font-bold uppercase text-sm">נוצל עד כה</div>
            <div className="break-words text-xl font-black text-brand sm:text-4xl">₪{totalSpent.toLocaleString()}</div>
          </div>
          <div className="space-y-1">
            <div className="text-text-muted font-bold uppercase text-sm">יתרה זמינה</div>
            <div className={`break-words text-xl font-black sm:text-4xl ${isDanger ? 'text-red-500' : 'text-green-500'}`}>
              ₪{remaining.toLocaleString()}
            </div>
          </div>
        </div>

        {/* HP Bar equivalent */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-bold">
            <span className="text-text-muted">ניצול תקציב (Mana)</span>
            <span className={isDanger ? 'text-red-500' : 'text-brand'}>{spentPercentage.toFixed(1)}%</span>
          </div>
          <div className="h-4 bg-surface-alt w-full rounded-full overflow-hidden border border-border p-[1px]">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${isDanger ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-brand shadow-[0_0_10px_rgba(255,90,0,0.8)]'}`}
              style={{ width: `${spentPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      <section aria-labelledby="payments-by-member-title" className="space-y-4">
        <div><h3 id="payments-by-member-title" className="text-xl font-black text-text-main">כמה כל אחד שילם?</h3><p className="mt-1 text-sm text-text-muted">סכום ההוצאות שנרשמו על שם כל חבר צוות.</p></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {paymentsByMember.map(({ member, count, total }) => <div key={member} className="gaming-card p-4 sm:p-5"><div className="text-sm font-bold text-text-muted">{member}</div><div className="mt-2 text-2xl font-black text-text-main">₪{total.toLocaleString('he-IL')}</div><div className="mt-1 text-xs text-text-muted">{count} {count === 1 ? 'הוצאה' : 'הוצאות'}</div></div>)}
        </div>
        {unassignedExpenses.length > 0 && <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-text-main">ללא שיוך לחבר צוות: <strong>₪{unassignedTotal.toLocaleString('he-IL')}</strong> ({unassignedExpenses.length} הוצאות)</p>}
      </section>

      {/* Expenses History */}
      <div>
        <h3 className="text-xl font-bold text-text-main mb-4 border-b border-border pb-2">היסטוריית עסקאות (Loot Table)</h3>
        <div className="space-y-2 sm:hidden">
          {budget.expenses.length === 0 && <div className="gaming-card p-4 text-center text-sm text-text-muted">עדיין אין הוצאות</div>}
          {budget.expenses.map(expense => (
            <article key={expense.id} className="gaming-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="break-words font-bold text-text-main">{expense.title}</h4>
                  <p className="mt-1 text-xs text-text-muted">{expense.date} · {expense.category}</p>
                  <p className="mt-1 text-xs text-text-muted">שולם על ידי: {expense.paidBy || 'לא צוין'}</p>
                  {expense.receiptPath && <a href={`/api/receipt?path=${encodeURIComponent(expense.receiptPath)}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"><Receipt size={15} />צפייה בקבלה</a>}
                </div>
                <strong dir="ltr" className="shrink-0 text-base text-brand">₪{expense.amount.toLocaleString()}</strong>
              </div>
              <div className="mt-3 flex gap-2 border-t border-border pt-3">
                <button type="button" onClick={() => startEditingExpense(expense)} className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-border px-3 py-2 text-sm font-bold text-text-main"><Pencil size={15} />עריכה</button>
                <button type="button" onClick={() => setDeleteTargetId(expense.id)} className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-red-500/30 px-3 py-2 text-sm font-bold text-red-600 dark:text-red-300"><Trash2 size={15} />מחיקה</button>
              </div>
            </article>
          ))}
        </div>
        <div className="gaming-card hidden overflow-x-auto sm:block">
          <table className="w-full text-right min-w-[650px]">
            <thead className="bg-surface-alt text-text-muted text-sm border-b border-border">
              <tr>
                <th className="p-4 font-bold">תאריך</th>
                <th className="p-4 font-bold">תיאור העסקה</th>
                <th className="p-4 font-bold">קטגוריה</th>
                <th className="p-4 font-bold">שולם על ידי</th>
                <th className="p-4 font-bold">סכום</th>
                <th className="p-4 font-bold">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {budget.expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-brand/5 transition-colors">
                  <td className="p-4 text-text-muted">{expense.date}</td>
                  <td className="p-4 font-bold text-text-main">{expense.title}</td>
                  <td className="p-4">
                    <span className="bg-surface-alt text-text-muted px-2 py-1 text-xs rounded border border-border">
                      {expense.category}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-text-muted">{expense.paidBy || 'לא צוין'}</td>
                  <td className="p-4 text-brand font-bold flex items-center gap-1">
                    <TrendingDown size={14} />
                    ₪{expense.amount.toLocaleString()}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      {expense.receiptPath && <a href={`/api/receipt?path=${encodeURIComponent(expense.receiptPath)}`} target="_blank" rel="noopener noreferrer" aria-label={`צפייה בקבלה של ${expense.title}`} title="צפייה בקבלה" className="rounded-lg p-2 text-brand transition hover:bg-brand/10"><Receipt size={17} /></a>}
                      <button type="button" onClick={() => startEditingExpense(expense)} aria-label={`עריכת ההוצאה ${expense.title}`} title="עריכה" className="rounded-lg p-2 text-text-muted transition hover:bg-brand/10 hover:text-brand"><Pencil size={17} /></button>
                      <button type="button" onClick={() => setDeleteTargetId(expense.id)} aria-label={`מחיקת ההוצאה ${expense.title}`} title="מחיקה" className="rounded-lg p-2 text-text-muted transition hover:bg-red-500/10 hover:text-red-600"><Trash2 size={17} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {deleteTargetId && <div className="fixed inset-0 z-[70] grid place-items-center bg-black/65 p-4" onMouseDown={event => { if (event.target === event.currentTarget && !expenseBusy) setDeleteTargetId(null); }}>
        <div role="dialog" aria-modal="true" aria-labelledby="delete-expense-title" className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 text-right shadow-2xl">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-red-500/10 text-red-600"><Trash2 size={22} /></div>
          <h3 id="delete-expense-title" className="text-xl font-black text-text-main">למחוק את ההוצאה?</h3>
          <p className="mt-2 text-sm text-text-muted">{budget.expenses.find(expense => expense.id === deleteTargetId)?.title} תוסר מהתקציב. הפעולה לא ניתנת לביטול.</p>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
            <button type="button" disabled={expenseBusy} onClick={() => setDeleteTargetId(null)} className="gaming-button-outline w-full justify-center disabled:opacity-60">ביטול</button>
            <button type="button" disabled={expenseBusy} onClick={() => void confirmDeleteExpense()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-bold text-white shadow-[4px_4px_0_#7f1d1d] disabled:opacity-60">{expenseBusy ? 'מוחק…' : <><Trash2 size={17} />מחיקת ההוצאה</>}</button>
          </div>
        </div>
      </div>}
    </div>
  );
}
