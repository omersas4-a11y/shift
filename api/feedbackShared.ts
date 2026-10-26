import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const FIRESTORE_DATABASE_ID = 'ai-studio-shift-8a9dab80-6b8a-460c-a6cd-1b84bdbec9e2';
export function getDatabase() {
  const existing = getApps()[0];
  if (existing) return getFirestore(existing, FIRESTORE_DATABASE_ID);
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT');
  const credentials = JSON.parse(raw);
  const app = initializeApp({ credential: cert(credentials), projectId: credentials.project_id });
  return getFirestore(app, FIRESTORE_DATABASE_ID);
}

// The local server and Vercel previews must never write student feedback into production.
export const isFeedbackPreview = () => process.env.VERCEL_ENV !== 'production';

export const feedbackMeetings = (db: ReturnType<typeof getDatabase>) =>
  db.collection(isFeedbackPreview() ? 'previewMeetings' : 'meetings');

export const feedbackLinks = (db: ReturnType<typeof getDatabase>) =>
  db.collection(isFeedbackPreview() ? 'previewFeedbackLinks' : 'feedbackLinks');

export const meetingFeedback = (db: ReturnType<typeof getDatabase>) =>
  db.collection(isFeedbackPreview() ? 'previewMeetingFeedback' : 'meetingFeedback');

export const validFeedbackCode = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{8,16}$/.test(value);
