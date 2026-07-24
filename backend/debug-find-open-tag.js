const PizZip = require('pizzip');
const fs = require('fs');

const buf = fs.readFileSync('proper-headings-output.docx');
const zip = new PizZip(buf);

const keys = Object.keys(zip.files).filter(k => !k.endsWith('/'));
for (const key of keys) {
  const content = zip.file(key).asText();
  if (content.includes('{{')) {
    const idx = content.indexOf('{{');
    console.log(`${key}: {{ at offset ${idx}`);
    if (idx < 100) {
      console.log('  First 80 chars:', content.substring(0, 80));
    }
  }
}
