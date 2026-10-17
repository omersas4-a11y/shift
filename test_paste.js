const lines = ["Moshe", "David"];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  let parts = line.split('\t');
  if (parts.length === 1) parts = line.split(',');

  const cName = parts[0]?.trim() || line;
  const cMajor = parts[1]?.trim() || 'לא צוין';
  console.log(cName, cMajor);
}
