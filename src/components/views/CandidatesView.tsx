import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Papa from 'papaparse';
import { ArrowDownToLine, ChevronDown, ClipboardList, ExternalLink, FileSpreadsheet, Mail, MessageCircle, Phone, Trash2, Upload, X } from 'lucide-react';
import { useStore } from '../../StoreContext';
import { Candidate, ChatMessage } from '../../types';
import { extractCandidateRows } from '../../lib/candidateSpreadsheet';

const columns: { id: Candidate['status']; title: string; accent: string; dot: string }[] = [
  { id: 'pending', title: 'חדשים', accent: 'border-t-blue-500', dot: 'bg-blue-500' },
  { id: 'accepted', title: 'עובר', accent: 'border-t-green-500', dot: 'bg-green-500' },
  { id: 'rejected', title: 'לא עובר', accent: 'border-t-red-500', dot: 'bg-red-500' },
  { id: 'maybe', title: 'מתנדנד', accent: 'border-t-amber-500', dot: 'bg-amber-500' },
];

const statusLabels: Record<Candidate['status'], string> = {
  pending: 'חדשים',
  accepted: 'עובר',
  rejected: 'לא עובר',
  maybe: 'מתנדנד',
};

const normalize = (value: string) => value
  .replace(/^\uFEFF/, '')
  .normalize('NFKC')
  .toLocaleLowerCase('he')
  .replace(/[\u200e\u200f\u202a-\u202e]/g, '')
  .replace(/[?:!：]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

function LinkedAnswer({ question, answer }: { question: string; answer: string }) {
  const isResume = /קורות חיים|resume|\bcv\b/i.test(question);
  const parts = String(answer).split(/(https?:\/\/[^\s<>"']+)/gi);

  return <dd className="whitespace-pre-wrap break-words text-sm leading-6 text-text-main">
    {parts.map((part, index) => {
      if (!/^https?:\/\//i.test(part)) return <React.Fragment key={index}>{part}</React.Fragment>;
      const href = part.replace(/[.,;:!?)}\]]+$/u, '');
      const trailingText = part.slice(href.length);
      try {
        const url = new URL(href);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return <React.Fragment key={index}>{part}</React.Fragment>;
        return <React.Fragment key={index}>
          <a href={url.href} target="_blank" rel="noopener noreferrer" aria-label={isResume ? 'פתיחת קורות החיים בכרטיסייה חדשה' : `פתיחת קישור אל ${url.hostname} בכרטיסייה חדשה`} title={url.href} className="inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-lg border border-brand/25 bg-brand/10 px-2.5 py-1 font-bold text-brand transition hover:border-brand hover:bg-brand/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            <ExternalLink size={14} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{isResume ? 'פתיחת קורות החיים' : `פתיחת קישור · ${url.hostname}`}</span>
          </a>{trailingText}
        </React.Fragment>;
      } catch {
        return <React.Fragment key={index}>{part}</React.Fragment>;
      }
    })}
  </dd>;
}

function findAnswer(row: Record<string, string>, aliases: string[]) {
  const entries = Object.entries(row);
  const normalizedAliases = aliases.map(normalize);
  const exact = entries.find(([key, value]) => normalizedAliases.includes(normalize(key)) && value?.trim());
  if (exact) return exact[1].trim();
  const partial = entries.find(([key, value]) => normalizedAliases.some(alias => normalize(key).includes(alias)) && value?.trim());
  return partial?.[1]?.trim() ?? '';
}

function candidateFromRow(row: Record<string, string>, index: number) {
  const answers = Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim(), (value ?? '').trim()]));
  const email = findAnswer(row, ['כתובת אימייל', 'כתובת דואר אלקטרוני', 'אימייל', 'דואר אלקטרוני', 'email', 'e-mail']);
  const phone = findAnswer(row, ['מספר טלפון', 'טלפון נייד', 'טלפון', 'phone', 'mobile']);
  const responseId = findAnswer(row, ['response id', 'form response id', 'מזהה תגובה']);
  const firstName = findAnswer(row, ['שם פרטי', 'first name']);
  const lastName = findAnswer(row, ['שם משפחה', 'last name']);
  const name = findAnswer(row, ['שם מלא', 'שם פרטי ומשפחה', 'שם ומשפחה', 'שם המועמד', 'איך קוראים לך', 'full name'])
    || [firstName, lastName].filter(Boolean).join(' ')
    || findAnswer(row, ['שם', 'name'])
    || email
    || `מועמד חדש ${index + 1}`;
  const major = findAnswer(row, ['מגמה / תפקיד', 'מגמה', 'תפקיד', 'מסלול', 'major']);
  const joinReason = findAnswer(row, ['למה תרצה להצטרף', 'למה תרצו להצטרף', 'מדוע אתה רוצה להצטרף', 'סיבה להצטרפות', 'למה תרצה', 'ספר לנו למה', 'join reason', 'why']);

  return {
    name,
    major,
    joinReason,
    level: 1,
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(responseId ? { formResponseId: responseId } : {}),
    formAnswers: answers,
  };
}

function signature(candidate: Pick<Candidate, 'name' | 'major' | 'joinReason' | 'email' | 'phone' | 'formResponseId' | 'formAnswers' | 'rawAnswers'>) {
  const identities = [
    candidate.formResponseId && `response:${normalize(candidate.formResponseId)}`,
    candidate.email && `email:${normalize(candidate.email)}`,
    candidate.phone && `phone:${candidate.phone.replace(/\D/g, '')}`,
  ].filter((value): value is string => Boolean(value));
  if (identities.length) return identities;

  const answers = candidate.formAnswers ?? candidate.rawAnswers ?? {};
  const fullResponse = Object.entries(answers)
    .sort(([left], [right]) => normalize(left).localeCompare(normalize(right), 'he'))
    .map(([question, answer]) => `${normalize(question)}=${normalize(String(answer ?? ''))}`)
    .join('&');
  return [`response:${fullResponse || normalize(`${candidate.name}|${candidate.major}|${candidate.joinReason}`)}`];
}

export default function CandidatesView() {
  const { candidates, currentUser, updateCandidateStatus, addCandidates, addCandidateMessage, removeCandidate, removeAllCandidates } = useStore();
  const fileInput = useRef<HTMLInputElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileStatus, setMobileStatus] = useState<Candidate['status']>('pending');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const selectedCandidate = candidates.find(candidate => candidate.id === selectedId) ?? null;
  const deleteTarget = candidates.find(candidate => candidate.id === deleteTargetId) ?? null;
  const grouped = useMemo(() => Object.fromEntries(
    columns.map(column => [column.id, candidates.filter(candidate => (candidate.status ?? 'pending') === column.id)])
  ) as Record<Candidate['status'], Candidate[]>, [candidates]);

  useEffect(() => {
    if (!selectedCandidate) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedCandidate]);

  const importFile = async (file?: File) => {
    if (!file || busy) return;
    setError('');
    setNotice('');
    const isXlsx = file.name.toLocaleLowerCase().endsWith('.xlsx');
    const isCsv = file.name.toLocaleLowerCase().endsWith('.csv') || file.type === 'text/csv';
    if (!isCsv && !isXlsx) {
      setError('אפשר לייבא קובץ CSV או XLSX בלבד.');
      return;
    }

    setBusy(true);
    try {
      let rows: Record<string, string>[];
      let detail = '';
      if (isXlsx) {
        const { default: readExcelFile } = await import('read-excel-file/browser');
        const parsed = extractCandidateRows(await readExcelFile(file));
        rows = parsed.rows;
        detail = ` · גיליון „${parsed.sheetName}”${parsed.skippedEmpty ? ` · דולגו ${parsed.skippedEmpty} שורות ללא פרטי קשר` : ''}`;
      } else {
        const result = await new Promise<Papa.ParseResult<Record<string, string>>>((resolve, reject) => {
          Papa.parse<Record<string, string>>(file, {
            header: true,
            skipEmptyLines: 'greedy',
            transformHeader: header => header.replace(/^\uFEFF/, '').trim(),
            complete: resolve,
            error: reject,
          });
        });
        if (!result.meta.fields?.length) throw new Error('לא נמצאו כותרות עמודות בקובץ ה־CSV.');
        rows = result.data.filter(row => Object.values(row).some(value => String(value ?? '').trim()));
        if (result.errors.length) detail = ` · ${result.errors.length} שורות עם אזהרות CSV`;
      }

      setNotice(`נקראו ${rows.length} שורות. בודק כפילויות לפני השמירה…`);
      const seen = new Set(candidates.flatMap(signature));
      let skipped = 0;
      const pendingCandidates: Array<ReturnType<typeof candidateFromRow>> = [];
      for (const [index, row] of rows.entries()) {
        const candidate = candidateFromRow(row, index);
        const keys = signature(candidate);
        if (keys.some(key => seen.has(key))) {
          skipped += 1;
          continue;
        }
        keys.forEach(key => seen.add(key));
        pendingCandidates.push(candidate);
      }
      if (pendingCandidates.length) {
        setNotice(`נמצאו ${pendingCandidates.length} מועמדים חדשים מתוך ${rows.length} שורות. שומר…`);
        await addCandidates(pendingCandidates);
      }
      setNotice(`יובאו ${pendingCandidates.length} מתוך ${rows.length} שורות לחלונית „חדשים”${skipped ? ` · דולגו ${skipped} כפילויות` : ''}${detail}.`);
    } catch (importError) {
      console.error('Candidate import failed:', importError);
      setNotice('');
      setError(importError instanceof Error ? `הייבוא לא הושלם: ${importError.message}` : 'הייבוא לא הושלם. בדקו את מבנה הקובץ ואת החיבור ל־Firestore.');
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const moveCandidate = async (candidateId: string, status: Candidate['status']) => {
    const candidate = candidates.find(item => item.id === candidateId);
    if (!candidate || candidate.status === status) return;
    try {
      await updateCandidateStatus(candidateId, status);
    } catch (moveError) {
      console.error('Candidate status update failed:', moveError);
      setError('לא ניתן לעדכן את הסטטוס. בדקו את חיבור Firestore.');
    }
  };

  const confirmRemoveCandidate = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeCandidate(deleteTarget.id);
      if (selectedId === deleteTarget.id) setSelectedId(null);
      setDeleteTargetId(null);
      setNotice(`המועמד ${deleteTarget.name} הוסר.`);
      setError('');
    } catch (removeError) {
      console.error('Candidate removal failed:', removeError);
      setError('לא ניתן להסיר את המועמד. בדקו את חיבור Firestore.');
    } finally {
      setDeleting(false);
    }
  };

  const confirmRemoveAllCandidates = async () => {
    if (!candidates.length) return;
    setDeletingAll(true);
    try {
      const deletedCount = await removeAllCandidates();
      setDeleteAllOpen(false);
      setSelectedId(null);
      setNotice(`נמחקו ${deletedCount} מועמדים וכל התשובות והשיחות שלהם.`);
      setError('');
    } catch (removeError) {
      console.error('Bulk candidate removal failed:', removeError);
      setError('לא ניתן למחוק את כל המועמדים. בדקו את חיבור Firestore.');
    } finally {
      setDeletingAll(false);
    }
  };

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedCandidate || !message.trim()) return;
    const chatMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      senderName: currentUser || 'חבר צוות',
      text: message.trim(),
      timestamp: new Date().toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' }),
    };
    setMessage('');
    try {
      await addCandidateMessage(selectedCandidate.id, chatMessage);
    } catch (sendError) {
      console.error('Candidate message failed:', sendError);
      setMessage(chatMessage.text);
      setError('ההודעה לא נשמרה. נסו שוב לאחר בדיקת החיבור.');
    }
  };

  return (
    <div className="@container space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-3xl font-black text-text-main mb-2">מיונים</h2>
          <p className="text-text-muted">ניהול מועמדים, תשובות מטופסי ההרשמה ושיחות צוות.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy || deletingAll}
            className="gaming-button shrink-0 disabled:cursor-wait disabled:opacity-60"
          >
            <Upload size={18} />
            {busy ? 'מייבא…' : 'ייבוא מועמדים מ־CSV / XLSX'}
          </button>
          <button
            type="button"
            onClick={() => setDeleteAllOpen(true)}
            disabled={!candidates.length || busy || deletingAll}
            className="flex shrink-0 items-center gap-2 rounded-xl border-2 border-red-700 bg-red-600 px-4 py-2 font-bold text-white shadow-[3px_3px_0_#7f1d1d] transition hover:translate-y-0.5 hover:shadow-[1px_1px_0_#7f1d1d] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 size={18} />מחיקת כל המועמדים
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={event => importFile(event.target.files?.[0])}
        />
      </header>

      <div
        onDragEnter={event => { event.preventDefault(); setDragging(true); }}
        onDragOver={event => event.preventDefault()}
        onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
        onDrop={event => {
          event.preventDefault();
          setDragging(false);
          importFile(event.dataTransfer.files?.[0]);
        }}
        className={`rounded-2xl border-2 border-dashed px-5 py-4 transition-colors ${dragging ? 'border-brand bg-brand/10' : 'border-border bg-surface/70'}`}
      >
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="text-brand shrink-0" size={22} />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-text-main">ייבוא תשובות מטופס הרשמה</p>
            <p className="text-sm text-text-muted">גררו לכאן קובץ Excel ‏(XLSX) או CSV, או לחצו על כפתור הייבוא. הייבוא מזהה גיליון וכותרות ושומר את התשובות המלאות בכרטיס המועמד.</p>
          </div>
          <ArrowDownToLine className="hidden sm:block text-text-muted" size={20} />
        </div>
      </div>

      {notice && <div role="status" className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm font-bold text-green-700 dark:text-green-300">{notice}</div>}
      {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-700 dark:text-red-300">{error}</div>}

      <div role="tablist" aria-label="קטגוריות מיונים" className="grid grid-cols-4 gap-1.5 md:hidden">
        {columns.map(column => (
          <button
            key={column.id}
            id={`candidate-tab-${column.id}`}
            type="button"
            role="tab"
            aria-selected={mobileStatus === column.id}
            aria-controls={`candidate-column-${column.id}`}
            onClick={() => setMobileStatus(column.id)}
            className={`flex min-h-12 min-w-0 flex-col items-center justify-center rounded-xl border px-1 py-1.5 text-center transition-colors ${mobileStatus === column.id ? 'border-brand bg-brand/10 text-brand' : 'border-border bg-surface text-text-muted'}`}
          >
            <span className="truncate text-[11px] font-black leading-4">{column.title}</span>
            <span className="text-[11px] font-bold leading-4">{grouped[column.id].length}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 @min-[760px]:grid-cols-4">
        {columns.map(column => {
          const items = grouped[column.id];
          return (
            <section
              key={column.id}
              id={`candidate-column-${column.id}`}
              aria-label={column.title}
              onDragOver={event => event.preventDefault()}
              onDrop={event => {
                event.preventDefault();
                const candidateId = event.dataTransfer.getData('text/candidate-id');
                if (candidateId) void moveCandidate(candidateId, column.id);
              }}
              className={`pixel-column min-h-0 min-w-0 rounded-2xl border border-border border-t-4 ${column.accent} bg-surface-alt/60 p-2.5 transition-colors md:min-h-64 ${mobileStatus !== column.id ? 'hidden md:block' : ''} ${dragging ? 'ring-2 ring-brand/30' : ''}`}
            >
              <div className="flex items-center justify-between px-1 pb-2.5">
                <h3 className="flex items-center gap-2 text-base font-black text-text-main"><span className={`h-2 w-2 rounded-full ${column.dot}`} />{column.title}</h3>
                <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-black text-text-muted">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map(candidate => (
                  <article
                    key={candidate.id}
                    draggable
                    onDragStart={event => {
                      event.dataTransfer.setData('text/candidate-id', candidate.id);
                      event.dataTransfer.effectAllowed = 'move';
                    }}
                    className="gaming-card group isolate cursor-grab p-2.5 active:cursor-grabbing sm:p-3"
                  >
                    <button type="button" onClick={() => setSelectedId(candidate.id)} className="w-full rounded-lg text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-black text-text-main" title={candidate.name}>{candidate.name || 'מועמד חדש'}</span>
                          <span className="mt-0.5 block truncate text-xs text-text-muted">{candidate.major || candidate.email || 'פרטי מועמד'}</span>
                        </span>
                        <MessageCircle size={16} className="mt-0.5 shrink-0 text-brand opacity-70 group-hover:opacity-100" />
                      </span>
                    </button>
                    <div className="mt-2 flex min-w-0 items-center gap-1 border-t border-border pt-2">
                      <span className="mr-auto truncate text-[11px] text-text-muted">{Object.keys(candidate.formAnswers ?? candidate.rawAnswers ?? {}).length} תשובות</span>
                      <button
                        type="button"
                        aria-label={`הסרת המועמד ${candidate.name}`}
                        title="הסרת מועמד"
                        onClick={event => { event.stopPropagation(); setDeleteTargetId(candidate.id); }}
                        onKeyDown={event => event.stopPropagation()}
                        draggable={false}
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-text-muted transition hover:bg-red-500/10 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                      ><Trash2 size={15} /></button>
                      <label className="sr-only" htmlFor={`candidate-status-${candidate.id}`}>שינוי סטטוס ל{candidate.name}</label>
                      <select
                        id={`candidate-status-${candidate.id}`}
                        value={candidate.status ?? 'pending'}
                        onClick={event => event.stopPropagation()}
                        onChange={event => void moveCandidate(candidate.id, event.target.value as Candidate['status'])}
                        className="min-h-10 min-w-0 max-w-24 rounded-lg border border-border bg-surface px-1 py-1.5 text-[11px] font-bold text-text-main"
                      >
                        {columns.map(option => <option key={option.id} value={option.id}>{option.title}</option>)}
                      </select>
                    </div>
                  </article>
                ))}
                {items.length === 0 && (
                  <div className="flex min-h-20 flex-col items-center justify-center rounded-xl border border-dashed border-border px-3 text-center text-sm text-text-muted sm:min-h-40">
                    <ChevronDown size={18} className="mb-2 opacity-60" />
                    אין מועמדים בקטגוריה
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {selectedCandidate && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-2 backdrop-blur-sm sm:p-5" onMouseDown={event => { if (event.target === event.currentTarget) setSelectedId(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="candidate-dialog-title" className="flex max-h-[calc(100dvh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl sm:max-h-[calc(100dvh-2.5rem)] sm:rounded-3xl">
            <header className="shrink-0 border-b border-border bg-gradient-to-bl from-brand/10 via-surface to-surface p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 text-[11px] font-black tracking-wide text-brand">תיק מועמד</div>
                  <h2 id="candidate-dialog-title" className="break-words text-2xl font-black leading-tight text-text-main sm:text-3xl">{selectedCandidate.name || 'מועמד חדש'}</h2>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => setDeleteTargetId(selectedCandidate.id)} aria-label="הסרת מועמד" title="הסרת מועמד" className="grid h-10 w-10 place-items-center rounded-xl border border-red-500/30 text-red-600 transition hover:bg-red-500/10">
                    <Trash2 size={17} />
                  </button>
                  <button type="button" onClick={() => setSelectedId(null)} aria-label="סגירה" className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface text-text-muted transition hover:bg-surface-alt hover:text-text-main"><X size={20} /></button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="rounded-full border border-brand/25 bg-brand/10 px-3 py-1.5 font-black text-brand">{statusLabels[selectedCandidate.status ?? 'pending']}</span>
                {selectedCandidate.major && <span className="rounded-full border border-border bg-surface px-3 py-1.5 font-bold text-text-main">{selectedCandidate.major}</span>}
                {selectedCandidate.email && <a href={`mailto:${selectedCandidate.email}`} dir="ltr" className="flex max-w-full items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 font-bold text-text-main hover:border-brand hover:text-brand"><Mail size={14} className="shrink-0" /><span className="min-w-0 break-all">{selectedCandidate.email}</span></a>}
                {selectedCandidate.phone && <a href={`tel:${selectedCandidate.phone}`} dir="ltr" className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 font-bold text-text-main hover:border-brand hover:text-brand"><Phone size={14} />{selectedCandidate.phone}</a>}
              </div>
            </header>

            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1.3fr)_minmax(290px,0.7fr)] lg:overflow-hidden">
              <div className="custom-scrollbar border-b border-border p-4 sm:p-5 lg:overflow-y-auto lg:border-b-0 lg:border-l">
                <h3 className="mb-4 flex items-center gap-2 text-base font-black text-text-main"><ClipboardList size={18} className="text-brand" />תשובות מטופס ההרשמה</h3>
                {selectedCandidate.joinReason && (
                  <div className="mb-4 rounded-2xl border border-brand/20 bg-brand/10 p-4">
                    <div className="mb-1 text-xs font-black text-brand">למה רוצים להצטרף</div>
                    <p className="whitespace-pre-wrap break-words text-sm leading-6 text-text-main">{selectedCandidate.joinReason}</p>
                  </div>
                )}
                {Object.entries(selectedCandidate.formAnswers ?? selectedCandidate.rawAnswers ?? {}).filter(([, value]) => String(value ?? '').trim()).length ? (
                  <dl className="grid gap-2">
                    {Object.entries(selectedCandidate.formAnswers ?? selectedCandidate.rawAnswers ?? {})
                      .filter(([, value]) => String(value ?? '').trim())
                      .sort(([left], [right]) => {
                        const isName = (field: string) => /שם|name|full\s*name/i.test(field);
                        return Number(!isName(left)) - Number(!isName(right));
                      })
                      .map(([question, answer]) => (
                      <div key={question} className="rounded-xl border border-border bg-surface-alt/50 p-3.5">
                        <dt className="mb-1 text-xs font-black text-text-muted">{question}</dt>
                        <LinkedAnswer question={question} answer={answer} />
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-text-muted">לא נמצאו תשובות גולמיות עבור המועמד הזה.</p>
                )}
              </div>

              <div className="flex min-h-[340px] flex-col bg-surface-alt/30 lg:min-h-0">
                <div className="border-b border-border p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-lg font-black text-text-main"><MessageCircle size={19} className="text-brand" />שיחת צוות על המועמד</div>
                  <p className="mt-1 text-xs text-text-muted">הודעות השיחה נשמרות בכרטיס המועמד וזמינות לצוות.</p>
                </div>
                <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-4 sm:p-5" aria-live="polite">
                  {(selectedCandidate.messages ?? []).length ? selectedCandidate.messages?.map(chatMessage => {
                    const ownMessage = chatMessage.senderName === currentUser;
                    return (
                      <div key={chatMessage.id} className={`flex flex-col ${ownMessage ? 'items-end' : 'items-start'}`}>
                        <span className="mb-1 px-1 text-[11px] font-bold text-text-muted">{chatMessage.senderName} · {chatMessage.timestamp}</span>
                        <p className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-6 ${ownMessage ? 'rounded-tl-sm bg-brand text-white' : 'rounded-tr-sm bg-surface-alt text-text-main'}`}>{chatMessage.text}</p>
                      </div>
                    );
                  }) : <div className="grid h-full min-h-24 place-items-center text-center text-sm text-text-muted">אין הודעות עדיין. התחילו שיחה על המועמד.</div>}
                </div>
                <form onSubmit={sendMessage} className="flex gap-2 border-t border-border bg-surface-alt p-3">
                  <input value={message} onChange={event => setMessage(event.target.value)} aria-label="הודעה לצוות" placeholder="כתבו הודעה לצוות…" className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-main outline-none transition focus:border-brand" />
                  <button type="submit" disabled={!message.trim()} className="gaming-button !px-4 !py-2 disabled:opacity-50">שליחה</button>
                </form>
              </div>
            </div>
          </section>
        </div>, document.body
      )}

      {deleteTarget && createPortal(
        <div className="fixed inset-0 z-[110] grid place-items-center bg-black/65 p-4" onMouseDown={event => { if (event.target === event.currentTarget && !deleting) setDeleteTargetId(null); }}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="remove-candidate-title" className="w-full max-w-md rounded-2xl border border-red-500/40 bg-surface p-6 shadow-2xl">
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-red-500/10 text-red-600"><Trash2 size={22} /></div>
            <h2 id="remove-candidate-title" className="text-xl font-black text-text-main">להסיר את {deleteTarget.name}?</h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">ההסרה תמחק גם את תשובות הטופס ואת שיחת הצוות של המועמד.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteTargetId(null)} disabled={deleting} className="rounded-xl border border-border px-4 py-2 font-bold text-text-main transition hover:bg-surface-alt disabled:opacity-50">ביטול</button>
              <button type="button" onClick={() => void confirmRemoveCandidate()} disabled={deleting} className="flex items-center gap-2 rounded-xl border-2 border-red-700 bg-red-600 px-4 py-2 font-bold text-white shadow-[3px_3px_0_#7f1d1d] transition hover:translate-y-0.5 hover:shadow-[1px_1px_0_#7f1d1d] disabled:cursor-wait disabled:opacity-60">
                <Trash2 size={16} />{deleting ? 'מסיר…' : 'הסרת מועמד'}
              </button>
            </div>
          </section>
        </div>, document.body
      )}

      {deleteAllOpen && createPortal(
        <div className="fixed inset-0 z-[120] grid place-items-center bg-black/65 p-4" onMouseDown={event => { if (event.target === event.currentTarget && !deletingAll) setDeleteAllOpen(false); }}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="remove-all-candidates-title" className="w-full max-w-md rounded-2xl border border-red-500/40 bg-surface p-6 shadow-2xl">
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-red-500/10 text-red-600"><Trash2 size={22} /></div>
            <h2 id="remove-all-candidates-title" className="text-xl font-black text-text-main">למחוק את כל המועמדים?</h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">פעולה זו תמחק לצמיתות {candidates.length} מועמדים מכל הקטגוריות, כולל תשובות הטופס ושיחות הצוות שלהם. אי אפשר לשחזר את המידע.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteAllOpen(false)} disabled={deletingAll} className="rounded-xl border border-border px-4 py-2 font-bold text-text-main transition hover:bg-surface-alt disabled:opacity-50">ביטול</button>
              <button type="button" onClick={() => void confirmRemoveAllCandidates()} disabled={deletingAll} className="flex items-center gap-2 rounded-xl border-2 border-red-700 bg-red-600 px-4 py-2 font-bold text-white shadow-[3px_3px_0_#7f1d1d] transition hover:translate-y-0.5 hover:shadow-[1px_1px_0_#7f1d1d] disabled:cursor-wait disabled:opacity-60">
                <Trash2 size={16} />{deletingAll ? 'מוחק…' : 'מחיקת כל המועמדים'}
              </button>
            </div>
          </section>
        </div>, document.body
      )}
    </div>
  );
}
