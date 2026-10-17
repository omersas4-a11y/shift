const text = "Avi\rBeni\rCharlie";
console.log(text.split(/\r?\n/).length);
console.log(text.split(/[\r\n]+/).length);
