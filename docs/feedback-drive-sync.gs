// Run installFeedbackSync once from the Google account that can edit the
// feedback folder and read the SHiFT Firestore database.
const SHIFT_PROJECT = 'shift-1fffe';
const SHIFT_DATABASE = 'ai-studio-shift-8a9dab80-6b8a-460c-a6cd-1b84bdbec9e2';
const SHIFT_FOLDER = '1DE9UeFLchLArUV2C4eBhAISu7FdnlKTC';
const SHIFT_DOCUMENTS = `https://firestore.googleapis.com/v1/projects/${SHIFT_PROJECT}/databases/${SHIFT_DATABASE}/documents`;

function firestoreGet(path) {
  const response = UrlFetchApp.fetch(`${SHIFT_DOCUMENTS}/${path}`, {
    headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` },
    muteHttpExceptions: true,
  });
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
    throw new Error(`Firestore request failed (${response.getResponseCode()})`);
  }
  return JSON.parse(response.getContentText());
}

function listDocuments(path) {
  const documents = [];
  let token = '';
  do {
    const page = firestoreGet(`${path}?pageSize=100${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`);
    documents.push(...(page.documents || []));
    token = page.nextPageToken || '';
  } while (token);
  return documents;
}

function documentId(doc) { return doc.name.split('/').pop(); }
function field(doc, key) { return (doc.fields || {})[key] || {}; }
function textField(doc, key) { return field(doc, key).stringValue || ''; }
function numberField(doc, key) { const value = field(doc, key); return Number(value.integerValue || value.doubleValue || 0); }

function syncFeedbackToDrive() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const root = DriveApp.getFolderById(SHIFT_FOLDER);
    const settings = PropertiesService.getScriptProperties();
    const summaries = listDocuments('meetingFeedback');
    for (const summary of summaries) {
      const meetingId = documentId(summary);
      const revision = textField(summary, 'driveRevision') || 'legacy';
      const key = `feedback-revision-${meetingId}`;
      if (settings.getProperty(key) === revision) continue;
      const meeting = firestoreGet(`meetings/${encodeURIComponent(meetingId)}`);
      const title = textField(meeting, 'title') || 'מפגש SHiFT';
      const date = textField(meeting, 'date');
      const folderName = `${date || 'ללא תאריך'} - ${title.replace(/[\\/]/g, '-').slice(0, 100)} [${meetingId}]`;
      const folderKey = `feedback-folder-${meetingId}`;
      let folder;
      const folderId = settings.getProperty(folderKey);
      if (folderId) {
        try { folder = DriveApp.getFolderById(folderId); } catch (_) { /* Folder was removed or access changed. */ }
      }
      if (!folder) {
        const existingFolders = root.getFoldersByName(folderName);
        folder = existingFolders.hasNext() ? existingFolders.next() : root.createFolder(folderName);
        settings.setProperty(folderKey, folder.getId());
      }
      const responses = listDocuments(`meetingFeedback/${encodeURIComponent(meetingId)}/responses`);
      for (const response of responses) {
        const responseId = documentId(response);
        const fileName = `משוב - ${responseId}.txt`;
        if (folder.getFilesByName(fileName).hasNext()) continue;
        const rating = numberField(response, 'rating') / (numberField(response, 'ratingScale') === 5 ? 1 : 2);
        const contents = [`מפגש: ${title}`, `תאריך: ${date || 'לא צוין'}`, `דירוג: ${rating}/5`, '', 'מה אהבת?', textField(response, 'liked') || 'לא צוין', '', 'מה פחות אהבת?', textField(response, 'disliked') || 'לא צוין'].join('\n');
        folder.createFile(fileName, contents, MimeType.PLAIN_TEXT);
      }
      settings.setProperty(key, revision);
    }
  } finally { lock.releaseLock(); }
}

function installFeedbackSync() {
  // Verify both permissions and perform the first sync before enabling the timer.
  syncFeedbackToDrive();
  const triggers = ScriptApp.getProjectTriggers().filter(trigger => trigger.getHandlerFunction() === 'syncFeedbackToDrive');
  if (!triggers.length) ScriptApp.newTrigger('syncFeedbackToDrive').timeBased().everyMinutes(5).create();
}
