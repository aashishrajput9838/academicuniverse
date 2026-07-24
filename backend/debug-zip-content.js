const PizZip = require('pizzip');
const fs = require('fs');

const buf = fs.readFileSync('proper-headings-output.docx');
const zip = new PizZip(buf);

const file = zip.file('word/document.xml');
if (!file) {
  console.log('word/document.xml not found');
  process.exit(1);
}

const text = file.asText();
console.log('Length:', text.length);
console.log('First 100 chars:', text.substring(0, 100));
console.log('Contains {{degree}}:', text.includes('{{degree}}'));
console.log('Contains {{institution}}:', text.includes('{{institution}}'));
console.log('Contains {{category}}:', text.includes('{{category}}'));

// Check for any {{ or }} sequences
let i = 0;
while (i < text.length) {
  if (text[i] === '{') {
    const snippet = text.substring(i, Math.min(i + 20, text.length));
    console.log(`Offset ${i}: "${snippet}"`);
  }
  i++;
}
