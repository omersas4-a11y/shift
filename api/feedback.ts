import { feedbackLinks, feedbackMeetings, getDatabase, meetingFeedback, validFeedbackCode } from './feedbackShared.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const code = req.method === 'GET' ? req.query?.code : req.body?.code;
  if (!validFeedbackCode(code)) return res.status(404).json({ error: 'קישור המשוב אינו תקין.' });

  try {
    const db = getDatabase();
    const link = await feedbackLinks(db).doc(code).get();
    if (!link.exists) return res.status(404).json({ error: 'קישור המשוב לא נמצא.' });
    const meetingId = link.get('meetingId');
    if (typeof meetingId !== 'string') return res.status(404).json({ error: 'המפגש לא נמצא.' });
    const meeting = await feedbackMeetings(db).doc(meetingId).get();
    if (!meeting.exists) return res.status(404).json({ error: 'המפגש לא נמצא.' });

    if (req.method === 'GET') {
      return res.status(200).json({
        title: String(meeting.get('title') || 'מפגש SHiFT'),
        date: String(meeting.get('date') || ''),
        time: String(meeting.get('time') || ''),
      });
    }

    const rating = Number(req.body?.rating);
    const liked = typeof req.body?.liked === 'string' ? req.body.liked.trim() : '';
    const disliked = typeof req.body?.disliked === 'string' ? req.body.disliked.trim() : '';
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || liked.length > 2000 || disliked.length > 2000) {
      return res.status(400).json({ error: 'יש לבחור דירוג תקין ולכתוב עד 2,000 תווים בכל שדה.' });
    }

    const summaryRef = meetingFeedback(db).doc(meetingId);
    const responseRef = summaryRef.collection('responses').doc();
    await db.runTransaction(async transaction => {
      const summary = await transaction.get(summaryRef);
      transaction.create(responseRef, { rating, ratingScale: 5, liked, disliked });
      transaction.set(summaryRef, {
        count: Number(summary.get('count') || 0) + 1,
        sumRating: Number(summary.get('sumRating') || 0) / (summary.get('ratingScale') === 5 ? 1 : 2) + rating,
        ratingScale: 5,
      }, { merge: true });
    });
    return res.status(201).json({ ok: true });
  } catch (error) {
    console.error('Feedback API error:', error);
    return res.status(500).json({ error: 'לא ניתן לשמור את המשוב כרגע. נסו שוב מאוחר יותר.' });
  }
}
