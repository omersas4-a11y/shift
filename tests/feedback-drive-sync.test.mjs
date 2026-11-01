import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

test('sync groups feedback by meeting, retries failed uploads and avoids duplicates', () => {
  const properties = new Map();
  const folders = new Map();
  const meetings = { a: { title: 'פתיחה', date: '2026-11-01' }, b: { title: 'סדנה', date: '2026-11-08' } };
  const revisions = { a: 'one', b: 'two' };
  const responses = { a: [{ id: 'r1', rating: 5, liked: 'טוב' }], b: [{ id: 'r2', rating: 4, liked: 'מצוין' }] };
  let fail = true;
  const folder = name => ({
    id: name, name, files: new Map(),
    getId() { return this.id; },
    getFilesByName(fileName) { return { hasNext: () => this.files.has(fileName) }; },
    createFile(fileName, content) { if (fail && name.includes('[a]')) { fail = false; throw new Error('temporary'); } this.files.set(fileName, content); },
  });
  const root = {
    getFoldersByName(name) { return { hasNext: () => folders.has(name), next: () => folders.get(name) }; },
    createFolder(name) { const created = folder(name); folders.set(name, created); return created; },
  };
  const string = value => ({ stringValue: value });
  const doc = (id, fields) => ({ name: `projects/p/databases/d/documents/${id}`, fields });
  const context = {
    DriveApp: { getFolderById(id) { return id === '1DE9UeFLchLArUV2C4eBhAISu7FdnlKTC' ? root : folders.get(id); } },
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => properties.get(key), setProperty: (key, value) => properties.set(key, value) }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    ScriptApp: { getOAuthToken: () => 'test-token' },
    MimeType: { PLAIN_TEXT: 'text/plain' },
    console: { error() {} },
    UrlFetchApp: { fetch(url) {
      const path = url.split('/documents/')[1].split('?')[0];
      let body;
      if (path === 'meetingFeedback') body = { documents: Object.entries(revisions).map(([id, revision]) => doc(`meetingFeedback/${id}`, { driveRevision: string(revision) })) };
      else if (path.startsWith('meetings/')) { const id = path.split('/')[1]; body = doc(path, { title: string(meetings[id].title), date: string(meetings[id].date) }); }
      else { const id = path.split('/')[1]; body = { documents: responses[id].map(r => doc(`${path}/${r.id}`, { rating: { integerValue: String(r.rating) }, ratingScale: { integerValue: '5' }, liked: string(r.liked) })) }; }
      return { getResponseCode: () => 200, getContentText: () => JSON.stringify(body) };
    } },
  };
  const source = readFileSync(new URL('../docs/feedback-drive-sync.gs', import.meta.url), 'utf8');
  const sync = runInNewContext(`${source}\nsyncFeedbackToDrive`, context);
  sync();
  assert.equal(properties.has('feedback-revision-a'), false);
  assert.equal(properties.get('feedback-revision-b'), 'two');
  sync();
  assert.equal(folders.size, 2);
  assert.deepEqual([...folders.values()].map(f => f.files.size), [1, 1]);
  sync();
  assert.deepEqual([...folders.values()].map(f => f.files.size), [1, 1]);
  revisions.a = 'three';
  responses.a.push({ id: 'r3', rating: 3, liked: 'בסדר' });
  meetings.a.title = 'שם מעודכן';
  sync();
  assert.equal(folders.size, 2);
  assert.deepEqual([...folders.values()].map(f => f.files.size), [2, 1]);
});
