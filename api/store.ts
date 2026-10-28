import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const FIRESTORE_DATABASE_ID = 'ai-studio-shift-8a9dab80-6b8a-460c-a6cd-1b84bdbec9e2';

const isPreview = () => process.env.VERCEL_ENV === 'preview';
const syncVersionDocument = (db: ReturnType<typeof getDatabase>) => db.collection('settings').doc(isPreview() ? 'store-sync-preview' : 'store-sync-production');
const getSyncVersion = async (db: ReturnType<typeof getDatabase>) => {
  const snapshot = await syncVersionDocument(db).get();
  return Number(snapshot.get('version') ?? 0);
};
const bumpSyncVersion = async (db: ReturnType<typeof getDatabase>) => {
  try {
    await syncVersionDocument(db).set({ version: FieldValue.increment(1) }, { merge: true });
  } catch (error) {
    // The main write has already succeeded. A failed sync marker must not invite a retry that duplicates it.
    console.error('Store sync version update failed:', error);
  }
};
const meetingEquipmentCollection = (db: ReturnType<typeof getDatabase>) => db.collection(isPreview() ? 'previewMeetingEquipment' : 'meetingEquipment');
const meetingsCollection = (db: ReturnType<typeof getDatabase>) => db.collection(isPreview() ? 'previewMeetings' : 'meetings');
const activityCollection = (db: ReturnType<typeof getDatabase>) => db.collection(isPreview() ? 'previewActivityEvents' : 'activityEvents');
const logisticsSettingsDocument = (db: ReturnType<typeof getDatabase>) => db.collection('settings').doc(isPreview() ? 'logistics-preview' : 'logistics');
const previewCollections: Record<string, string> = {
  equipment: 'previewEquipment',
  requirements: 'previewRequirements',
  candidates: 'previewCandidates',
  chatMessages: 'previewChatMessages',
};
const collectionFor = (db: ReturnType<typeof getDatabase>, name: string) => db.collection(isPreview() ? previewCollections[name] || name : name);

async function ensurePreviewBaseData(db: ReturnType<typeof getDatabase>) {
  if (!isPreview()) return;
  const marker = db.collection('settings').doc('preview-base-data-initialized');
  await db.runTransaction(async transaction => {
    const initialized = await transaction.get(marker);
    if (initialized.exists) return;
    const sources = await Promise.all(Object.keys(previewCollections).map(name => transaction.get(db.collection(name))));
    Object.keys(previewCollections).forEach((name, index) => {
      for (const document of sources[index].docs) transaction.set(collectionFor(db, name).doc(document.id), document.data());
    });
    transaction.set(marker, { initializedAt: FieldValue.serverTimestamp() });
  });
}

export const budgetDocument = (db: ReturnType<typeof getDatabase>) => db.collection('budget').doc(isPreview() ? 'preview-main' : 'main');

async function ensurePreviewBudget(db: ReturnType<typeof getDatabase>) {
  if (!isPreview()) return;
  const preview = budgetDocument(db);
  await db.runTransaction(async transaction => {
    const existing = await transaction.get(preview);
    if (existing.exists) return;
    const original = await transaction.get(db.collection('budget').doc('main'));
    transaction.set(preview, original.exists ? original.data()! : { totalAnnual: 5000, expenses: [] });
  });
}

async function ensurePreviewMeetings(db: ReturnType<typeof getDatabase>) {
  if (!isPreview()) return;
  const marker = db.collection('settings').doc('preview-meetings-initialized');
  await db.runTransaction(async transaction => {
    const initialized = await transaction.get(marker);
    if (initialized.exists) return;
    const originalMeetings = await transaction.get(db.collection('meetings'));
    for (const meeting of originalMeetings.docs) {
      transaction.set(meetingsCollection(db).doc(meeting.id), meeting.data());
    }
    transaction.set(marker, { initializedAt: FieldValue.serverTimestamp() });
  });
}

export function getDatabase() {
  const existing = getApps()[0];
  if (existing) return getFirestore(existing, FIRESTORE_DATABASE_ID);

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT');
  const credentials = JSON.parse(raw);
  const app = initializeApp({ credential: cert(credentials), projectId: credentials.project_id });
  return getFirestore(app, FIRESTORE_DATABASE_ID);
}

export async function saveWebhookCandidate(id: string, data: Record<string, unknown>) {
  const db = getDatabase();
  await db.collection('candidates').doc(id).set(data);
  await bumpSyncVersion(db);
}

async function readStore(db: ReturnType<typeof getDatabase>) {
  await Promise.all([ensurePreviewMeetings(db), ensurePreviewBudget(db), ensurePreviewBaseData(db)]);
  // Read the marker first so a write during the collection queries is seen by the next poll.
  const syncVersion = await getSyncVersion(db);
  const [equipment, meetingEquipment, requirements, meetings, candidates, chatMessages, budget, logisticsSettings, activityEvents] = await Promise.all([
    collectionFor(db, 'equipment').get(),
    meetingEquipmentCollection(db).get(),
    collectionFor(db, 'requirements').get(),
    meetingsCollection(db).get(),
    collectionFor(db, 'candidates').get(),
    collectionFor(db, 'chatMessages').get(),
    budgetDocument(db).get(),
    logisticsSettingsDocument(db).get(),
    activityCollection(db).orderBy('createdAt', 'desc').limit(40).get(),
  ]);
  return {
    equipment: equipment.docs.map(item => ({ id: item.id, ...item.data() })),
    meetingEquipment: meetingEquipment.docs.map(item => ({ id: item.id, ...item.data() })),
    logisticsEmailRecipients: logisticsSettings.exists ? logisticsSettings.get('emailRecipients') ?? [] : [],
    requirements: requirements.docs.map(item => ({ id: item.id, ...item.data() })),
    meetings: meetings.docs.map(item => ({ id: item.id, ...item.data() })),
    activityEvents: activityEvents.docs.map(item => ({ id: item.id, ...item.data() })),
    candidates: candidates.docs.map(item => ({ id: item.id, ...item.data() })),
    chatMessages: chatMessages.docs.map(item => ({ id: item.id, ...item.data() })),
    budget: budget.exists ? budget.data() : { totalAnnual: 5000, expenses: [] },
    syncVersion,
  };
}

async function readActivityPage(db: ReturnType<typeof getDatabase>, before: string) {
  const query = activityCollection(db).orderBy('createdAt', 'desc').startAfter(before).limit(40);
  const snapshot = await query.get();
  return { activityEvents: snapshot.docs.map(item => ({ id: item.id, ...item.data() })), hasMore: snapshot.size === 40 };
}

function activityFor(action: string, payload: any, deletedCount = 0) {
  switch (action) {
    case 'meeting.add': return { category: 'syllabus', text: `נוסף מפגש: ${payload.title || 'מפגש חדש'}` };
    case 'meeting.update': return { category: 'syllabus', text: payload.meeting?.status && Object.keys(payload.meeting).length === 1 ? 'סטטוס מפגש עודכן' : `פרטי מפגש עודכנו${payload.meeting?.title ? `: ${payload.meeting.title}` : ''}` };
    case 'meeting.remove': return { category: 'syllabus', text: 'מפגש הוסר מהסילבוס' };
    case 'candidate.add': return { category: 'candidates', text: `נוסף מועמד: ${payload.candidate?.name || 'מועמד חדש'}` };
    case 'candidate.addMany': return { category: 'candidates', text: `יובאו ${payload.candidates?.length || 0} מועמדים` };
    case 'candidate.status': return { category: 'candidates', text: `סטטוס מועמד שונה ל${({ pending: 'חדשים', accepted: 'עובר', rejected: 'לא עובר', maybe: 'מתנדנד' } as Record<string, string>)[payload.status] || 'סטטוס חדש'}` };
    case 'candidate.remove': return { category: 'candidates', text: 'מועמד הוסר מהמיונים' };
    case 'candidate.removeAll': return { category: 'candidates', text: `נמחקו ${deletedCount} מועמדים מהמיונים` };
    case 'candidate.message': return {
      category: 'candidates',
      text: `נוספה הודעה לשיחת מועמד: ${String(payload.candidateName || 'מועמד').slice(0, 80)}`,
      candidateId: String(payload.id || ''),
      messageId: String(payload.message?.id || ''),
    };
    case 'meetingEquipment.add': return { category: 'logistics', text: `נוסף ציוד: ${payload.item?.name || 'פריט חדש'}` };
    case 'meetingEquipment.update': return { category: 'logistics', text: `ציוד עודכן: ${payload.item?.name || 'פריט'}` };
    case 'meetingEquipment.remove': return { category: 'logistics', text: 'ציוד הוסר ממפגש' };
    case 'logistics.emailRecipients': return { category: 'logistics', text: 'עודכנו נמעני הדוא״ל בלוגיסטיקה' };
    case 'equipment.add': return { category: 'logistics', text: `נוסף ציוד: ${payload.name || 'פריט חדש'}` };
    case 'equipment.update': return { category: 'logistics', text: `מלאי עודכן: ${payload.equipment?.name || 'פריט'}` };
    case 'equipment.remove': return { category: 'logistics', text: 'פריט הוסר מהמלאי הכללי' };
    case 'equipment.status': return { category: 'logistics', text: 'סטטוס ציוד עודכן' };
    case 'requirement.add': return { category: 'logistics', text: 'נוספה דרישת ציוד למפגש' };
    case 'requirement.toggle': return { category: 'logistics', text: 'סימון דרישת ציוד עודכן' };
    case 'budget.expense': return { category: 'budget', text: `נוספה הוצאה: ${payload.expense?.title || 'הוצאה חדשה'}` };
    case 'budget.expense.update': return { category: 'budget', text: `עודכנה הוצאה: ${payload.expense?.title || 'הוצאה'}` };
    case 'budget.expense.remove': return { category: 'budget', text: 'הוצאה הוסרה מהתקציב' };
    case 'budget.total': return { category: 'budget', text: 'התקציב השנתי עודכן' };
    default: return null;
  }
}

async function writeStore(db: ReturnType<typeof getDatabase>, action: string, payload: any, actor: string): Promise<number | void> {
  const collection = (name: string) => collectionFor(db, name);
  const id = (value: unknown) => String(value ?? '');
  if (action.startsWith('meeting.')) await ensurePreviewMeetings(db);
  if (action.startsWith('budget.')) await ensurePreviewBudget(db);
  if (/^(equipment\.|requirement\.|candidate\.|chat\.)/.test(action)) await ensurePreviewBaseData(db);
  let deletedCount = 0;
  switch (action) {
    case 'equipment.add': {
      if (typeof payload.name !== 'string' || !payload.name.trim() || !Number.isInteger(payload.quantity) || payload.quantity < 1) throw new Error('Invalid inventory item');
      const ref = collection('equipment').doc();
      await ref.set({ name: payload.name.trim(), quantity: payload.quantity, status: 'available', id: ref.id });
      break;
    }
    case 'equipment.update': {
      const equipment = payload.equipment;
      if (!id(payload.id) || typeof equipment?.name !== 'string' || !equipment.name.trim() || !Number.isInteger(equipment.quantity) || equipment.quantity < 1) throw new Error('Invalid inventory item');
      await collection('equipment').doc(id(payload.id)).update({ name: equipment.name.trim(), quantity: equipment.quantity });
      break;
    }
    case 'equipment.remove':
      await collection('equipment').doc(id(payload.id)).delete();
      break;
    case 'equipment.status':
      await collection('equipment').doc(id(payload.id)).update({ status: payload.status });
      break;
    case 'meetingEquipment.add': {
      const item = payload.item;
      if (!item?.meetingId || !item?.name || !Number.isInteger(item.quantity) || item.quantity < 1) throw new Error('Invalid meeting equipment');
      const source = String(item.sourceEquipmentId || '');
      if (source && (!/^[A-Za-z0-9_-]+$/.test(item.meetingId) || !/^[A-Za-z0-9_-]+$/.test(source))) throw new Error('Invalid inventory source');
      const ref = source ? meetingEquipmentCollection(db).doc(`default-${item.meetingId}-${source}`) : meetingEquipmentCollection(db).doc();
      await ref.set({ ...payload.item, id: ref.id });
      break;
    }
    case 'meetingEquipment.update':
      await meetingEquipmentCollection(db).doc(id(payload.id)).update(payload.item);
      break;
    case 'meetingEquipment.remove':
      await meetingEquipmentCollection(db).doc(id(payload.id)).delete();
      break;
    case 'logistics.emailRecipients': {
      const recipients = Array.isArray(payload.recipients)
        ? payload.recipients.filter((value: unknown): value is string => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())).map((value: string) => value.trim()).slice(0, 30)
        : [];
      await logisticsSettingsDocument(db).set({ emailRecipients: recipients }, { merge: true });
      break;
    }
    case 'requirement.add': {
      const ref = collection('requirements').doc();
      await ref.set({ ...payload, id: ref.id, isBrought: false });
      break;
    }
    case 'requirement.toggle': {
      const ref = collection('requirements').doc(id(payload.id));
      await db.runTransaction(async tx => {
        const snapshot = await tx.get(ref);
        if (snapshot.exists) tx.update(ref, { isBrought: !snapshot.get('isBrought') });
      });
      break;
    }
    case 'meeting.add': {
      const ref = meetingsCollection(db).doc();
      await ref.set({ ...payload, id: ref.id });
      break;
    }
    case 'meeting.update':
      await meetingsCollection(db).doc(id(payload.id)).update(payload.meeting);
      break;
    case 'meeting.remove':
      await meetingsCollection(db).doc(id(payload.id)).delete();
      break;
    case 'candidate.add':
    case 'candidate.addMany': {
      const candidates = action === 'candidate.add' ? [payload.candidate] : payload.candidates;
      if (!Array.isArray(candidates) || candidates.length > 450) throw new Error('Invalid candidates batch');
      const batch = db.batch();
      for (const candidate of candidates) {
        const requestedId = candidate.formResponseId && /^[A-Za-z0-9_-]+$/.test(candidate.formResponseId)
          ? candidate.formResponseId : '';
        const ref = requestedId ? collection('candidates').doc(requestedId) : collection('candidates').doc();
        batch.set(ref, { ...candidate, id: ref.id, status: 'pending', messages: [] });
      }
      await batch.commit();
      break;
    }
    case 'candidate.status':
      await collection('candidates').doc(id(payload.id)).update({ status: payload.status });
      break;
    case 'candidate.remove':
      await collection('candidates').doc(id(payload.id)).delete();
      break;
    case 'candidate.removeAll': {
      const candidates = await collection('candidates').get();
      for (let start = 0; start < candidates.docs.length; start += 450) {
        const batch = db.batch();
        candidates.docs.slice(start, start + 450).forEach(candidate => batch.delete(candidate.ref));
        await batch.commit();
      }
      deletedCount = candidates.docs.length;
      break;
    }
    case 'candidate.message':
      await collection('candidates').doc(id(payload.id)).update({ messages: FieldValue.arrayUnion(payload.message) });
      break;
    case 'budget.expense':
    case 'budget.expense.update':
    case 'budget.expense.remove':
    case 'budget.total': {
      const ref = budgetDocument(db);
      await db.runTransaction(async tx => {
        const snapshot = await tx.get(ref);
        const current = snapshot.exists ? snapshot.data()! : { totalAnnual: 5000, expenses: [] };
        const expenses = Array.isArray(current.expenses) ? current.expenses : [];
        if (action === 'budget.expense') {
          tx.set(ref, { ...current, expenses: [...expenses, { ...payload.expense, id: Date.now().toString() }] });
        } else if (action === 'budget.expense.update' || action === 'budget.expense.remove') {
          const expenseId = id(payload.id);
          const index = expenses.findIndex((expense: any) => id(expense.id) === expenseId);
          if (!expenseId || index < 0) throw new Error('Expense not found');
          const nextExpenses = expenses.slice();
          if (action === 'budget.expense.update') {
            nextExpenses[index] = { ...payload.expense, id: expenseId };
          } else {
            nextExpenses.splice(index, 1);
          }
          tx.set(ref, { ...current, expenses: nextExpenses });
        } else {
          tx.set(ref, { ...current, totalAnnual: payload.totalAnnual });
        }
      });
      break;
    }
    case 'chat.add': {
      const ref = collection('chatMessages').doc();
      await ref.set({ ...payload.message, id: ref.id, createdAt: new Date().toISOString() });
      break;
    }
    default:
      throw new Error('Unknown store action');
  }
  const event = activityFor(action, payload, deletedCount);
  if (event) {
    try {
      await activityCollection(db).add({ ...event, actor: actor.trim().slice(0, 80) || 'חבר צוות', createdAt: new Date().toISOString() });
    } catch (error) {
      console.error('Activity log write failed:', error);
    }
  }
  await bumpSyncVersion(db);
  if (action === 'candidate.removeAll') return deletedCount;
}

export async function handleStoreRequest(req: any, res: any, getDb: typeof getDatabase = getDatabase) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const db = getDb();
    if (req.method === 'GET') {
      if (req.query?.syncVersion === '1') {
        const syncVersion = await getSyncVersion(db);
        res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=15');
        return res.status(200).json({ syncVersion });
      }
      if (typeof req.query?.activityBefore === 'string') return res.status(200).json(await readActivityPage(db, req.query.activityBefore));
      return res.status(200).json(await readStore(db));
    }
    const deleted = await writeStore(db, String(req.body?.action || ''), req.body?.payload || {}, String(req.body?.actor || 'חבר צוות'));
    return res.status(200).json({ ok: true, ...(deleted === undefined ? {} : { deleted }) });
  } catch (error) {
    console.error('Store API error:', error);
    return res.status(500).json({ error: 'לא ניתן לעדכן את הנתונים כרגע.' });
  }
}

export default function handler(req: any, res: any) {
  return handleStoreRequest(req, res);
}
