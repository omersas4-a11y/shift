const Papa = require('papaparse');
const text = `Avi\tCS
Beni\tEE
Charlie\tME`;
const res = Papa.parse(text, { skipEmptyLines: true });
console.log(res.data);
