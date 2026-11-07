import { bumpSyncVersion, getDatabase, hanukkahCollection } from './store.js';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday'];

export async function handleHanukkahRequest(req: any, res: any, getDb: typeof getDatabase = getDatabase) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const preference = req.body?.preference;
  const days = req.body?.days;
  if (name.length < 2 || name.length > 100 || !['alternate_day', 'extend_semester'].includes(preference) || !Array.isArray(days) || days.some(day => !DAYS.includes(day)) || new Set(days).size !== days.length || (preference === 'alternate_day' && days.length === 0) || (preference === 'extend_semester' && days.length !== 0)) {
    return res.status(400).json({ error: 'יש למלא שם, לבחור העדפה ולסמן ימים פנויים כשבוחרים השלמה בשבוע חנוכה.' });
  }
  try {
    const db = getDb();
    await hanukkahCollection(db).add({ name, preference, days, createdAt: new Date().toISOString() });
    await bumpSyncVersion(db);
    return res.status(201).json({ ok: true });
  } catch (error) {
    console.error('Hanukkah survey error:', error);
    return res.status(500).json({ error: 'לא ניתן לשמור את התשובה כרגע. נסו שוב.' });
  }
}

export default function handler(req: any, res: any) { return handleHanukkahRequest(req, res); }
