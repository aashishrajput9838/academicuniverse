const PizZip = require('pizzip');
const fs = require('fs');

const buf = fs.readFileSync('proper-headings-output.docx');
const zip = new PizZip(buf);

const files = Object.keys(zip.files).filter(name => !name.endsWith('/')).sort();
console.log('Files in DOCX:', files);

for (const file of files) {
  const fileObj = zip.file(file);
  if (!fileObj) continue;
  const content = fileObj.asText();
  if (content.includes('{{') || content.includes('}}')) {
    console.log(`\n=== ${file} ===`);
    const matches = content.match(/\{\{[^}]+\}\}/g) || [];
    console.log('Placeholders:', matches);
    if (matches.length > 0) {
      content.split('').forEach((c, i) => {
        if (c === '{') console.log(`Offset ${i}: ...${content.substring(Math.max(0, i-10), i+30)}...`);
      });
    }
  }
}
