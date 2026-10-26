type Sheet = { sheet: string; data: readonly (readonly unknown[])[] };

const clean = (value: string) => value
  .replace(/^\uFEFF/, '')
  .normalize('NFKC')
  .toLocaleLowerCase('he')
  .replace(/[\u200e\u200f\u202a-\u202e]/g, '')
  .replace(/[?:!：]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const identityColumns = {
  name: /(?:שם|קוראים לך|\bname\b)/i,
  email: /(?:אימייל|דואר אלקטרוני|\be-?mail\b)/i,
  phone: /(?:טלפון|נייד|\bphone\b|\bmobile\b)/i,
};

function cellText(cell: unknown, header = ''): string {
  if (cell == null) return '';
  if (cell instanceof Date) return Number.isNaN(cell.getTime()) ? '' : cell.toLocaleDateString('he-IL');
  if (typeof cell === 'boolean') return cell ? 'כן' : 'לא';
  if (typeof cell !== 'string' && typeof cell !== 'number') return '';
  const text = String(cell).trim();
  // Excel often stores Israeli mobile numbers as numbers and drops their leading zero.
  if (typeof cell === 'number' && identityColumns.phone.test(clean(header)) && /^5\d{8}$/.test(text)) return `0${text}`;
  return text;
}

function headerScore(row: readonly unknown[]) {
  const labels = row.map(cell => clean(cellText(cell)));
  const identity = Object.values(identityColumns).filter(pattern => labels.some(label => pattern.test(label))).length;
  const nonempty = labels.filter(Boolean).length;
  return identity > 0 && nonempty >= 2 ? identity * 100 + Math.min(nonempty, 30) : 0;
}

export function extractCandidateRows(sheets: Sheet[]) {
  let best: { sheet: Sheet; headerIndex: number; score: number } | null = null;

  for (const sheet of sheets) {
    for (let index = 0; index < Math.min(sheet.data.length, 50); index += 1) {
      const score = headerScore(sheet.data[index] ?? []);
      if (score > 0 && (!best || score > best.score || (score === best.score && sheet.data.length > best.sheet.data.length))) {
        best = { sheet, headerIndex: index, score };
      }
    }
  }

  if (!best) throw new Error('לא נמצאה שורת כותרות עם עמודת שם, אימייל או טלפון. בדקו שהקובץ מכיל טבלת מועמדים.');

  const headers = (best.sheet.data[best.headerIndex] ?? []).map(cell => cellText(cell));
  const usedHeaders = new Map<string, number>();
  const uniqueHeaders = headers.map((header, index) => {
    const label = header || `עמודה ${index + 1}`;
    const count = (usedHeaders.get(label) ?? 0) + 1;
    usedHeaders.set(label, count);
    return count === 1 ? label : `${label} (${count})`;
  });
  const identityIndexes = headers.flatMap((header, index) =>
    Object.values(identityColumns).some(pattern => pattern.test(clean(header))) ? [index] : []
  );

  let skippedEmpty = 0;
  const rows: Record<string, string>[] = [];
  for (const cells of best.sheet.data.slice(best.headerIndex + 1)) {
    const row = Object.fromEntries(uniqueHeaders.map((header, index) => [header, cellText(cells[index], header)]));
    if (!identityIndexes.some(index => cellText(cells[index], headers[index]))) {
      skippedEmpty += 1;
      continue;
    }
    rows.push(row);
  }

  if (!rows.length) throw new Error('נמצאו כותרות בקובץ, אך לא נמצאו שורות עם שם, אימייל או טלפון.');
  return { rows, sheetName: best.sheet.sheet, skippedEmpty };
}
