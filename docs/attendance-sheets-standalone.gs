// Standalone Apps Script. Run installAttendanceSync once after authorization.
const PROJECT = 'shift-1fffe';
const DATABASE = 'ai-studio-shift-8a9dab80-6b8a-460c-a6cd-1b84bdbec9e2';
const SHEET_ID = '1Pzx6a8IBYz1q7FsYaNkCu6FN77JNpHQQQXQVuBKtxsA';
const TAB_ID = 436843721;
const ROOT = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/${DATABASE}/documents`;
function firestoreGet(path) {
  const res = UrlFetchApp.fetch(`${ROOT}/${path}`, {headers:{Authorization:`Bearer ${ScriptApp.getOAuthToken()}`}, muteHttpExceptions:true});
  if (res.getResponseCode() < 200 || res.getResponseCode() >= 300) throw new Error(`Firestore request failed: ${res.getResponseCode()}`);
  return JSON.parse(res.getContentText());
}
function listDocuments(path) {
  let results = [], token = '';
  do { const page = firestoreGet(`${path}?pageSize=100${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`); results = results.concat(page.documents || []); token = page.nextPageToken || ''; } while (token);
  return results;
}
function field(doc, key) { return ((doc || {}).fields || {})[key] || {}; }
function textField(doc, key) { return field(doc, key).stringValue || ''; }
function documentId(doc) { return doc.name.split('/').pop(); }
function syncAttendanceToSheet() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const props = PropertiesService.getScriptProperties();
    const v = field(firestoreGet('settings/store-sync-production'),'version');
    const version = String(v.integerValue || v.doubleValue || 0);
    if (props.getProperty('version') === version) return;
    const students = listDocuments('candidates').filter(x => textField(x,'status') === 'accepted').sort((a,b) => textField(a,'name').localeCompare(textField(b,'name'),'he'));
    const meetings = listDocuments('meetings').sort((a,b) => (textField(a,'date')+textField(a,'time')).localeCompare(textField(b,'date')+textField(b,'time')));
    const attendance = new Map(listDocuments('attendance').map(x => [textField(x,'candidateId')+'--'+textField(x,'meetingId'),x]));
    const header=['סטודנט/ית','סה״כ חיסורים'];
    meetings.forEach(m => {const title=textField(m,'title')||'מפגש'; const date=textField(m,'date').split('-').reverse().join('/');header.push(title+'\n'+date+'\nנוכחות',title+'\nהערות');});
    const values=[header], colors=[header.map(()=>'#e34d1a')];
    students.forEach((s,i) => {
      let absent=0;const row=[textField(s,'name'),0], bg=[i%2?'#fff7f0':'#ffffff',i%2?'#fff7f0':'#ffffff'];
      meetings.forEach(m => {const a=attendance.get(documentId(s)+'--'+documentId(m));const status=a?textField(a,'status'):'';if(status==='absent')absent++;row.push(status==='present'?'נוכח/ת':status==='absent'?'לא נוכח/ת':'לא סומן', a?textField(a,'note'):'');bg.push(status==='present'?'#d6f2dc':status==='absent'?'#ffe0e0':bg[0],bg[0]);});
      row[1]=absent; values.push(row); colors.push(bg);
    });
    const sheet=SpreadsheetApp.openById(SHEET_ID).getSheets().find(s=>s.getSheetId()===TAB_ID);
    if(!sheet)throw new Error('Attendance sheet tab not found');
    if(sheet.getMaxColumns()<header.length)sheet.insertColumnsAfter(sheet.getMaxColumns(),header.length-sheet.getMaxColumns());
    if(sheet.getMaxRows()<values.length)sheet.insertRowsAfter(sheet.getMaxRows(),values.length-sheet.getMaxRows());
    sheet.clearContents().clearFormats();
    const range=sheet.getRange(1,1,values.length,header.length);
    // User-entered names and notes must remain literal text, including leading '='.
    range.setNumberFormat('@').setValues(values.map(row=>row.map(v=>typeof v==='string'&&/^[=+\-@]/.test(v)?"'"+v:v))).setBackgrounds(colors.map((row,i)=>i ? row.map((c,j)=>j===1 ? (values[i][1]>=3?'#ffc7c7':values[i][1]>=1?'#ffdfb3':'#ffffff') : j>=2 && j%2===0 && values[i][j]!=='לא סומן' ? c : '#ffffff') : row)).setFontFamily('Arial').setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true).setBorder(true,true,true,true,true,true,'#d5c4b8',SpreadsheetApp.BorderStyle.SOLID);
    sheet.getRange(1,1,1,header.length).setFontWeight('bold').setFontColor('#ffffff');
    if(students.length)sheet.getRange(2,2,students.length,1).setNumberFormat('0').setValues(values.slice(1).map(row=>[row[1]]));
    sheet.setRightToLeft(true);sheet.setFrozenRows(1);sheet.setFrozenColumns(2);sheet.setHiddenGridlines(true);
    sheet.setColumnWidths(1,header.length,165);sheet.setColumnWidth(1,220);sheet.setRowHeight(1,70);
    SpreadsheetApp.flush();props.setProperty('version',version);
  } finally { lock.releaseLock(); }
}
function installAttendanceSync() {
  syncAttendanceToSheet();
  if(!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='syncAttendanceToSheet')) ScriptApp.newTrigger('syncAttendanceToSheet').timeBased().everyMinutes(5).create();
}
