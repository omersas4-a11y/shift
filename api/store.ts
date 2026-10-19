import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const FIRESTORE_DATABASE_ID = 'ai-studio-shift-8a9dab80-6b8a-460c-a6cd-1b84bdbec9e2';

function getDatabase() {
  const existing = getApps()[0];
  if (existing) return getFirestore(existing, FIRESTORE_DATABASE_ID);

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT');
  const credentials = JSON.parse(raw);
  const app = initializeApp({ credential: cert(credentials), projectId: credentials.project_id });
  return getFirestore(app, FIRESTORE_DATABASE_ID);
}

export async function saveWebhookCandidate(id: string, data: Record<string, unknown>) {
  await getDatabase().collection('candidates').doc(id).set(data);
}

async function readStore(db: ReturnType<typeof getDatabase>) {
  const [equipment, requirements, meetings, candidates, chatMessages, budget] = await Promise.all([
    db.collection('equipment').get(),
    db.collection('requirements').get(),
    db.collection('meetings').get(),
    db.collection('candidates').get(),
    db.collection('chatMessages').get(),
    db.collection('budget').doc('main').get(),
  ]);
  return {
    equipment: equipment.docs.map(item => ({ id: item.id, ...item.data() })),
    requirements: requirements.docs.map(item => ({ id: item.id, ...item.data() })),
    meetings: meetings.docs.map(item => ({ id: item.id, ...item.data() })),
    candidates: candidates.docs.map(item => ({ id: item.id, ...item.data() })),
    chatMessages: chatMessages.docs.map(item => ({ id: item.id, ...item.data() })),
    budget: budget.exists ? budget.data() : { totalAnnual: 5000, expenses: [] },
  };
}

async function writeStore(db: ReturnType<typeof getDatabase>, action: string, payload: any) {
  const collection = (name: string) => db.collection(name);
  const id = (value: unknown) => String(value ?? '');
  switch (action) {
    case 'equipment.add': {
      const ref = collection('equipment').doc();
      await ref.set({ ...payload, id: ref.id });
      break;
    }
    case 'equipment.status':
      await collection('equipment').doc(id(payload.id)).update({ status: payload.status });
      break;
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
      const ref = collection('meetings').doc();
      await ref.set({ ...payload, id: ref.id });
      break;
    }
    case 'meeting.update':
      await collection('meetings').doc(id(payload.id)).update(payload.meeting);
      break;
    case 'meeting.remove':
      await collection('meetings').doc(id(payload.id)).delete();
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
    case 'candidate.message':
      await collection('candidates').doc(id(payload.id)).update({ messages: FieldValue.arrayUnion(payload.message) });
      break;
    case 'budget.expense':
    case 'budget.total': {
      const ref = collection('budget').doc('main');
      await db.runTransaction(async tx => {
        const snapshot = await tx.get(ref);
        const current = snapshot.exists ? snapshot.data()! : { totalAnnual: 5000, expenses: [] };
        if (action === 'budget.expense') {
          tx.set(ref, { ...current, expenses: [...(current.expenses || []), { ...payload.expense, id: Date.now().toString() }] });
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
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const db = getDatabase();
    if (req.method === 'GET') return res.status(200).json(await readStore(db));
    await writeStore(db, String(req.body?.action || ''), req.body?.payload || {});
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Store API error:', error);
    return res.status(500).json({ error: 'לא ניתן לעדכן את הנתונים כרגע.' });
  }
}
