import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveCandidateMessageTarget } from './activityNavigation';
import type { ActivityEvent, Candidate, ChatMessage } from '../types';

const candidate = (id: string, messages: ChatMessage[]): Candidate => ({
  id, name: `Candidate ${id}`, major: '', status: 'pending', joinReason: '', level: 0, messages,
});
const message = (id: string, senderName: string, timestamp: string): ChatMessage => ({
  id, senderName, timestamp, text: 'Test message',
});
const event = (createdAt: string, extra: Partial<ActivityEvent> = {}): ActivityEvent => ({
  id: 'event', category: 'candidates', text: 'נוספה הודעה לשיחת מועמד', actor: 'טל', createdAt, ...extra,
});

test('new candidate-message events target the stored candidate and exact message', () => {
  assert.deepEqual(resolveCandidateMessageTarget(event('2026-10-26T10:00:00.000Z', {
    candidateId: 'candidate-2', messageId: 'message-7',
  }), []), { candidateId: 'candidate-2', messageId: 'message-7' });
});

test('legacy events identify the message saved immediately before the notification', () => {
  const createdAt = '2026-10-26T10:00:30.000Z';
  const displayMinute = new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(createdAt));
  const candidates = [
    candidate('older', [message(`${Date.parse(createdAt) - 25_000}-a`, 'טל', displayMinute)]),
    candidate('matching', [message(`${Date.parse(createdAt) - 300}-b`, 'טל', displayMinute)]),
  ];
  assert.deepEqual(resolveCandidateMessageTarget(event(createdAt), candidates), {
    candidateId: 'matching', messageId: candidates[1].messages![0].id,
  });
});

test('ambiguous legacy events do not send the user to an unrelated message', () => {
  const createdAt = '2026-10-26T10:00:30.000Z';
  const displayMinute = new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(createdAt));
  const candidates = [candidate('one', [
    message(`${Date.parse(createdAt) - 300}-a`, 'טל', displayMinute),
    message(`${Date.parse(createdAt) - 600}-b`, 'טל', displayMinute),
  ])];
  assert.equal(resolveCandidateMessageTarget(event(createdAt), candidates), null);
});
