import React from "react";
import { useState, useEffect } from 'react';
import { useStore } from '../../StoreContext';
import { Wallet, TrendingDown, DollarSign, Pencil, Check, X } from 'lucide-react';

export default function BudgetView() {
  const { budget, addExpense, setTotalBudget } = useStore();
  
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');

  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [editBudgetValue, setEditBudgetValue] = useState(budget.totalAnnual);

  useEffect(() => {
    setEditBudgetValue(budget.totalAnnual);
  }, [budget.totalAnnual]);

  const totalSpent = budget.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const remaining = budget.totalAnnual - totalSpent;
  const spentPercentage = Math.min((totalSpent / budget.totalAnnual) * 100, 100);
  
  // Danger zone if > 85%
  const isDanger = spentPercentage > 85;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !category || !date || amount <= 0) return;
    addExpense({ title, amount, category, date });
    setTitle(''); setAmount(0); setCategory(''); setDate('');
    setShowForm(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black uppercase text-text-main mb-2 flex items-center gap-3">
            <Wallet className="text-brand" size={32} />
            תקציב
          </h2>
          <p className="text-text-muted">ניהול זהב ומשאבים של המועדון - מעקב הוצאות לפי תקציב שנתי.</p>
        </div>
        <button className="gaming-button" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'ביטול' : '+ רשום הוצאה'}
        </button>
      </header>
      
      {showForm && (
        <form onSubmit={handleSubmit} className="gaming-card p-6 space-y-4 bg-surface-alt">
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
          </div>
          <button type="submit" className="gaming-button w-full mt-4">רשום הוצאה</button>
        </form>
      )}

      {/* Progress / Stats */}
      <div className="gaming-card p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div className="space-y-1">
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
              <div className="text-4xl font-black text-text-main">₪{budget.totalAnnual.toLocaleString()}</div>
            )}
          </div>
          <div className="space-y-1">
            <div className="text-text-muted font-bold uppercase text-sm">נוצל עד כה</div>
            <div className="text-4xl font-black text-brand">₪{totalSpent.toLocaleString()}</div>
          </div>
          <div className="space-y-1">
            <div className="text-text-muted font-bold uppercase text-sm">יתרה זמינה</div>
            <div className={`text-4xl font-black ${isDanger ? 'text-red-500' : 'text-green-500'}`}>
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

      {/* Expenses History */}
      <div>
        <h3 className="text-xl font-bold text-text-main mb-4 border-b border-border pb-2">היסטוריית עסקאות (Loot Table)</h3>
        <div className="gaming-card overflow-x-auto">
          <table className="w-full text-right min-w-[500px]">
            <thead className="bg-surface-alt text-text-muted text-sm border-b border-border">
              <tr>
                <th className="p-4 font-bold">תאריך</th>
                <th className="p-4 font-bold">תיאור העסקה</th>
                <th className="p-4 font-bold">קטגוריה</th>
                <th className="p-4 font-bold">סכום</th>
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
                  <td className="p-4 text-brand font-bold flex items-center gap-1">
                    <TrendingDown size={14} />
                    ₪{expense.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
