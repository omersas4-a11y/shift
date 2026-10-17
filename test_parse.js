const Papa = require('papaparse');
const text = `Avi	CS
Beni	EE
Charlie	ME`;
const res = Papa.parse(text, { skipEmptyLines: true });
console.log(res.data);
