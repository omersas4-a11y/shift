import Papa from 'papaparse';
const text = "Avi\rBeni\rCharlie";
const res = Papa.parse(text, { skipEmptyLines: true });
console.log(res.data);
