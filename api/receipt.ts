import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { del, get, put } from '@vercel/blob';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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
const budgetDocument = (db: ReturnType<typeof getDatabase>) => db.collection('budget').doc(process.env.VERCEL_ENV === 'preview' ? 'preview-main' : 'main');

const receiptPrefix = () => `${process.env.VERCEL_ENV === 'preview' ? 'preview' : 'production'}/receipts/`;

function validPath(value: unknown): value is string {
  return typeof value === 'string' && new RegExp(`^${receiptPrefix()}[a-f0-9-]{36}\\.webp$`).test(value);
}

async function receiptIsReferenced(path: string) {
  const snapshot = await budgetDocument(getDatabase()).get();
  const expenses = snapshot.data()?.expenses;
  return Array.isArray(expenses) && expenses.some(expense => expense.receiptPath === path);
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    if (req.method === 'POST') {
      const data = req.body?.data;
      if (typeof data !== 'string' || data.length > 480_000 || !/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(data)) {
        return res.status(400).json({ error: 'יש לבחור צילום קבלה תקין.' });
      }
      const image = Buffer.from(data.slice('data:image/webp;base64,'.length), 'base64');
      if (!image.length || image.length > 350_000 || image.subarray(0, 4).toString() !== 'RIFF' || image.subarray(8, 12).toString() !== 'WEBP') {
        return res.status(413).json({ error: 'צילום הקבלה גדול מדי. נסו תמונה אחרת.' });
      }
      const path = `${receiptPrefix()}${randomUUID()}.webp`;
      await put(path, image, { access: 'private', contentType: 'image/webp', addRandomSuffix: false });
      return res.status(200).json({ path });
    }

    const path = req.query?.path;
    if (!validPath(path)) return res.status(400).json({ error: 'נתיב קבלה לא תקין.' });
    const referenced = await receiptIsReferenced(path);

    if (req.method === 'GET') {
      if (!referenced) return res.status(404).end();
      const result = await get(path, { access: 'private' });
      if (!result || result.statusCode !== 200) return res.status(404).end();
      res.setHeader('Content-Type', result.blob.contentType || 'image/webp');
      res.setHeader('Content-Disposition', 'inline; filename="receipt.webp"');
      Readable.fromWeb(result.stream as any).pipe(res);
      return;
    }

    if (req.method === 'DELETE') {
      if (referenced) return res.status(409).json({ error: 'הקבלה עדיין משויכת להוצאה.' });
      await del(path);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Receipt API error:', error);
    return res.status(500).json({ error: 'לא ניתן לטפל בקבלה כרגע.' });
  }
}
