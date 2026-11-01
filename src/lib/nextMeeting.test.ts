import assert from 'node:assert/strict';
import test from 'node:test';
import { findNextMeeting } from './nextMeeting';
import type { Meeting } from '../types';

const meeting = (id: string, date: string, time = '19:30'): Meeting => ({ id, date, time, title: id, location: '', lecturer: '', content: '' });

test('selects the earliest upcoming meeting regardless of storage order', () => {
  const meetings = [meeting('last', '2026-11-22'), meeting('past', '2026-10-30'), meeting('next', '2026-11-01'), meeting('later', '2026-11-08')];
  assert.equal(findNextMeeting(meetings, new Date('2026-11-01T12:00:00Z'))?.id, 'next');
  assert.equal(meetings[0].id, 'last');
});

test('uses the Israeli calendar day and selects the earlier time for the same day', () => {
  const meetings = [meeting('later', '2026-11-02', '20:00'), meeting('earlier', '2026-11-02', '18:00'), meeting('yesterday', '2026-11-01')];
  assert.equal(findNextMeeting(meetings, new Date('2026-11-01T22:30:00Z'))?.id, 'earlier');
});

test('returns no upcoming meeting when all dates have passed', () => {
  assert.equal(findNextMeeting([meeting('old', '2026-10-31')], new Date('2026-11-01T12:00:00Z')), undefined);
});
