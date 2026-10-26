import { randomBytes } from 'node:crypto';
import { FieldPath } from 'firebase-admin/firestore';
import { feedbackLinks, feedbackMeetings, getDatabase, meetingFeedback, validFeedbackCode } from './feedbackShared.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const db = getDatabase();
    if (req.method === 'DELETE') {
      const { meetingId, responseId } = req.body || {};
      if (typeof meetingId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(meetingId) ||
          typeof responseId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(responseId)) {
        return res.status(400).json({ error: 'משוב לא תקין.' });
      }
      const summaryRef = meetingFeedback(db).doc(meetingId);
      const responseRef = summaryRef.collection('responses').doc(responseId);
      const deleted = await db.runTransaction(async transaction => {
        const [response, summary] = await Promise.all([
          transaction.get(responseRef), transaction.get(summaryRef),
        ]);
        if (!response.exists) return false;
        transaction.delete(responseRef);
        if (summary.exists) {
          const count = Number(summary.get('count') || 0);
          const sumRating = Number(summary.get('sumRating') || 0) / (summary.get('ratingScale') === 5 ? 1 : 2);
          const rating = Number(response.get('rating') || 0) / (response.get('ratingScale') === 5 ? 1 : 2);
          if (count <= 1) transaction.delete(summaryRef);
          else transaction.update(summaryRef, {
            count: count - 1,
            sumRating: Math.max(0, sumRating - rating),
            ratingScale: 5,
          });
        }
        return true;
      });
      if (!deleted) return res.status(404).json({ error: 'המשוב כבר נמחק או לא נמצא.' });
      return res.status(200).json({ ok: true });
    }
    if (req.method === 'POST') {
      const meetingId = req.body?.meetingId;
      if (typeof meetingId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(meetingId)) {
        return res.status(400).json({ error: 'מפגש לא תקין.' });
      }
      const meetingRef = feedbackMeetings(db).doc(meetingId);
      const code = await db.runTransaction(async transaction => {
        const meeting = await transaction.get(meetingRef);
        if (!meeting.exists) return null;
        const existingCode = meeting.get('feedbackCode');
        if (validFeedbackCode(existingCode)) return existingCode;
        const newCode = randomBytes(7).toString('base64url');
        const linkRef = feedbackLinks(db).doc(newCode);
        const existingLink = await transaction.get(linkRef);
        if (existingLink.exists) throw new Error('Feedback link collision');
        transaction.create(linkRef, { meetingId });
        transaction.update(meetingRef, { feedbackCode: newCode });
        return newCode;
      });
      if (!code) return res.status(404).json({ error: 'המפגש לא נמצא.' });
      return res.status(200).json({ code });
    }

    const meetingId = req.query?.meetingId;
    if (typeof meetingId !== 'string') {
      const snapshots = await meetingFeedback(db).get();
      return res.status(200).json({ summaries: snapshots.docs.map(document => ({
        meetingId: document.id,
        count: Number(document.get('count') || 0),
        sumRating: Number(document.get('sumRating') || 0) / (document.get('ratingScale') === 5 ? 1 : 2),
      })) });
    }
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(meetingId)) return res.status(400).json({ error: 'מפגש לא תקין.' });
    const cursor = req.query?.cursor;
    if (cursor !== undefined && (typeof cursor !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(cursor))) {
      return res.status(400).json({ error: 'סמן עמוד לא תקין.' });
    }
    let query = meetingFeedback(db).doc(meetingId).collection('responses').orderBy(FieldPath.documentId()).limit(50);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    return res.status(200).json({
      responses: snapshot.docs.map(document => ({
        id: document.id,
        rating: Number(document.get('rating') || 0) / (document.get('ratingScale') === 5 ? 1 : 2),
        liked: String(document.get('liked') || ''),
        disliked: String(document.get('disliked') || ''),
      })),
      nextCursor: snapshot.size === 50 ? snapshot.docs.at(-1)?.id : null,
    });
  } catch (error) {
    console.error('Feedback admin API error:', error);
    return res.status(500).json({ error: 'לא ניתן לטעון את המשובים כרגע.' });
  }
}
