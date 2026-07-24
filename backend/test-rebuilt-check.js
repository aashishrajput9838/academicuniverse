const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater').default;
const fs = require('fs');

const buf = fs.readFileSync('test-rebuilt.docx');
const zip = new PizZip(buf);
const Xml = zip.file('word/document.xml').asText();
console.log('test-rebuilt.docx XML:', Xml);

try {
  const dt = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  dt.setData({ name: 'World' });
  dt.render();
  console.log('Render succeeded');
} catch (err) {
  console.error('Failed:', err.message);
}
