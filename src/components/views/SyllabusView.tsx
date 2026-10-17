import React from "react";
import { useState } from 'react';
import { useStore } from '../../StoreContext';
import { MapPin, Clock, Calendar as CalendarIcon, User, Swords, Pencil, Trash2 } from 'lucide-react';
import { Meeting } from '../../types';

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
  const [content, setContent] = useState('');

  const resetForm = () => {
    setTitle(''); setDate(''); setTime(''); setLocation(''); setLecturer(''); setContent('');
    setEditingMeetingId(null);
    setShowForm(false);
  };

  const handleEditClick = (meeting: Meeting) => {
    setTitle(meeting.title);
    setDate(meeting.date);
    setTime(meeting.time);
    setLocation(meeting.location);
    setLecturer(meeting.lecturer);
    setContent(meeting.content);
    setEditingMeetingId(meeting.id);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !time) return;
    
    if (editingMeetingId) {
      updateMeeting(editingMeetingId, { title, date, time, location, lecturer, content });
    } else {
      addMeeting({ title, date, time, location, lecturer, content });
    }
    
    resetForm();
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black uppercase text-text-main mb-2 flex items-center gap-3">
            <Swords className="text-brand" size={32} />
            סילבוס
          </h2>
          <p className="text-text-muted">לוח הזמנים של המועדון, מפגשים מתוכננים והרצאות.</p>
        </div>
        <button className="gaming-button" onClick={() => {
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
        <form onSubmit={handleSubmit} className="gaming-card p-6 space-y-4 bg-surface-alt">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-muted">כותרת המפגש</label>
              <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text-main" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-muted">מרצה / מוביל</label>
              <input type="text" value={lecturer} onChange={e => setLecturer(e.target.value)} className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text-main" />
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
          <button type="submit" className="gaming-button w-full mt-4">
            {editingMeetingId ? 'עדכן מפגש' : 'שמור מפגש'}
          </button>
        </form>
      )}

      <div className="relative border-r-2 border-border pr-8 space-y-8 mt-8">
        {meetings.map((meeting, index) => (
          <div key={meeting.id} className="relative">
            {/* Timeline Node */}
            <div className="absolute -right-[41px] top-4 w-5 h-5 rounded-full bg-bg border-4 border-brand shadow-[0_0_10px_rgba(255,90,0,0.5)] z-10" />
            
            <div className="gaming-card p-6 mr-4">
              <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-4">
                <div>
                  <div className="text-brand font-bold mb-1 tracking-wider text-sm">
                    שלב {index + 1}
                  </div>
                  <h3 className="text-2xl font-black text-text-main">{meeting.title}</h3>
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
              
              <div className="flex items-center justify-between border-t border-border pt-4">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <User size={16} className="text-text-muted" />
                  <span className="text-text-muted">מרצה / מוביל:</span>
                  <span className="text-text-main bg-surface-alt px-2 py-1 rounded">{meeting.lecturer}</span>
                </div>
                
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
    </div>
  );
}
