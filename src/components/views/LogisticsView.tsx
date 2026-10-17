import React from "react";
import { useState } from 'react';
import { useStore } from '../../StoreContext';
import { PackageOpen, CheckCircle, Circle, AlertTriangle, Wrench } from 'lucide-react';

export default function LogisticsView() {
  const { equipment, requirements, toggleRequirement, addRequirement, addEquipment } = useStore();
  const [newReqName, setNewReqName] = useState('');
  const [newReqItem, setNewReqItem] = useState('');
  
  const [newEqName, setNewEqName] = useState('');
  const [newEqQty, setNewEqQty] = useState(1);

  const handleAddRequirement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReqName || !newReqItem) return;
    addRequirement({ personName: newReqName, itemToBring: newReqItem });
    setNewReqName('');
    setNewReqItem('');
  };

  const handleAddEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEqName || newEqQty < 1) return;
    addEquipment({ name: newEqName, quantity: newEqQty, status: 'available' });
    setNewEqName('');
    setNewEqQty(1);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle size={16} className="text-green-500" />;
      case 'in_use': return <AlertTriangle size={16} className="text-yellow-500" />;
      case 'maintenance': return <Wrench size={16} className="text-red-500" />;
      default: return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'פנוי לשימוש';
      case 'in_use': return 'בשימוש';
      case 'maintenance': return 'בתיקון';
      default: return status;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h2 className="text-3xl font-black uppercase text-text-main mb-2 flex items-center gap-3">
          <PackageOpen className="text-brand" size={32} />
          לוגיסטיקה
        </h2>
        <p className="text-text-muted">ניהול הציוד של המועדון וחלוקת משימות הצטיידות למפגש הקרוב.</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Next Meeting Requirements */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-brand border-b border-border pb-2">ציוד נדרש - משימה קרובה</h3>
          <div className="space-y-3">
            {requirements.map((req) => (
              <div 
                key={req.id} 
                className="gaming-card p-4 flex items-center justify-between cursor-pointer"
                onClick={() => toggleRequirement(req.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`transition-colors duration-300 ${req.isBrought ? 'text-brand' : 'text-text-muted'}`}>
                    {req.isBrought ? <CheckCircle size={24} /> : <Circle size={24} />}
                  </div>
                  <div>
                    <div className={`font-bold ${req.isBrought ? 'text-text-muted line-through' : 'text-text-main'}`}>
                      {req.itemToBring}
                    </div>
                    <div className="text-sm text-text-muted">אחראי: {req.personName}</div>
                  </div>
                </div>
                {req.isBrought && (
                  <div className="text-xs font-bold text-brand uppercase tracking-wider bg-brand/10 px-2 py-1 rounded">
                    הושלם
                  </div>
                )}
              </div>
            ))}
          </div>
          <form onSubmit={handleAddRequirement} className="gaming-card p-4 flex gap-2 items-end mt-4 bg-surface-alt">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-bold text-text-muted">פריט לציוד</label>
              <input type="text" required value={newReqItem} onChange={e => setNewReqItem(e.target.value)} className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text-main" />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs font-bold text-text-muted">אחראי</label>
              <input type="text" required value={newReqName} onChange={e => setNewReqName(e.target.value)} className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text-main" />
            </div>
            <button type="submit" className="gaming-button mb-0 h-[38px]">+</button>
          </form>
        </section>

        {/* Inventory */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-brand border-b border-border pb-2">אינוונטר המועדון</h3>
          <div className="grid grid-cols-1 gap-3">
            {equipment.map((item) => (
              <div key={item.id} className="gaming-card p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-lg">{item.name}</h4>
                  <span className="text-2xl font-black text-text-main bg-surface-alt px-3 rounded-xl leading-none flex items-center justify-center">
                    x{item.quantity}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm mt-4 bg-surface-alt px-3 py-2 w-fit rounded">
                  {getStatusIcon(item.status)}
                  <span className="text-text-muted">{getStatusText(item.status)}</span>
                </div>
              </div>
            ))}
          </div>
          
          <form onSubmit={handleAddEquipment} className="gaming-card p-4 flex gap-2 items-end mt-4 bg-surface-alt">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-bold text-text-muted">שם פריט אינוונטר</label>
              <input type="text" required value={newEqName} onChange={e => setNewEqName(e.target.value)} className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text-main" />
            </div>
            <div className="w-20 space-y-1">
              <label className="text-xs font-bold text-text-muted">כמות</label>
              <input type="number" min="1" required value={newEqQty} onChange={e => setNewEqQty(parseInt(e.target.value) || 1)} className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text-main" />
            </div>
            <button type="submit" className="gaming-button mb-0 h-[38px]">+</button>
          </form>
        </section>

      </div>
    </div>
  );
}
