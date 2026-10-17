import Papa from 'papaparse';
const text = `אבי כהן
בני לוי
גדי שמעון`;
const res = Papa.parse(text, { skipEmptyLines: true });
console.log(res.data);
