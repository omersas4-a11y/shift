import test from 'node:test';
import assert from 'node:assert/strict';
import { handleStoreRequest } from '../api/store';
import { handleHanukkahRequest } from '../api/hanukkah';
import { sumMoney, formatMoney } from '../src/lib/money';

process.env.VERCEL_ENV = 'preview';

function makeDatabase() {
  const documents = new Map<string, Record<string, unknown>>();
  let sequence = 0;
  const ref = (collection: string, id: string) => ({
    key: `${collection}/${id}`,
    async get() { const value = documents.get(this.key); return { exists: Boolean(value), get: (field: string) => value?.[field], data: () => value }; },
    async set(value: Record<string, unknown>, options?: { merge?: boolean }) { documents.set(this.key, options?.merge ? { ...documents.get(this.key), ...value } : value); },
  });
  const db = {
    collection(name: string) { return { doc(id = `generated${++sequence}`) { return ref(name, id); }, async add(value: Record<string, unknown>) { const r = ref(name, `generated${++sequence}`); await r.set(value); return r; } }; },
    async runTransaction(fn: (tx: any) => Promise<void>) { await fn({ get: (r: any) => r.get(), set: (r: any, value: any, options: any) => { void r.set(value, options); } }); },
  };
  return { db: db as any, documents };
}
function response() { return { code: 0, body: null as any, setHeader() {}, status(code: number) { this.code = code; return this; }, json(body: any) { this.body = body; return this; } }; }

test('attendance is saved per student and meeting without erasing notes or status', async () => {
  const { db, documents } = makeDatabase(); documents.set('previewCandidates/student1', { status: 'accepted' }); documents.set('previewMeetings/meeting1', { title: 'מפגש' });
  for (const changes of [{ status: 'present' }, { note: 'איחר מעט' }, { status: 'absent' }]) {
    const res = response(); await handleStoreRequest({ method: 'POST', body: { action: 'attendance.update', payload: { candidateId: 'student1', meetingId: 'meeting1', changes } } }, res, () => db); assert.equal(res.code, 200);
  }
  assert.deepEqual(documents.get('previewAttendance/student1--meeting1'), { candidateId: 'student1', meetingId: 'meeting1', status: 'absent', note: 'איחר מעט' });
  const res = response(); await handleStoreRequest({ method: 'POST', body: { action: 'attendance.update', payload: { candidateId: 'other', meetingId: 'meeting1', changes: { status: 'present' } } } }, res, () => db); assert.equal(res.code, 500); assert.equal(documents.has('previewAttendance/other--meeting1'), false);
});

test('survey validates conditional days and saves the submitted response in preview', async () => {
  const { db, documents } = makeDatabase();
  for (const body of [{ name: 'נועה', preference: 'alternate_day', days: [] }, { name: 'נועה', preference: 'extend_semester', days: ['monday'] }, { name: 'נועה', preference: 'alternate_day', days: ['sunday'] }]) {
    const res = response(); await handleHanukkahRequest({ method: 'POST', body }, res, () => db); assert.equal(res.code, 400);
  }
  const res = response(); await handleHanukkahRequest({ method: 'POST', body: { name: ' נועה ', preference: 'alternate_day', days: ['monday', 'thursday'] } }, res, () => db); assert.equal(res.code, 201);
  const saved = [...documents].find(([key]) => key.startsWith('previewHanukkahResponses/'))?.[1]; assert.equal(saved?.name, 'נועה'); assert.deepEqual(saved?.days, ['monday', 'thursday']);
});

test('money totals retain agorot without floating-point rounding artifacts', () => {
  assert.equal(sumMoney([0.1, 0.2, 20.09]), 20.39); assert.equal(sumMoney([100, -0.01]), 99.99); assert.equal(formatMoney(20.39), '20.39');
});
