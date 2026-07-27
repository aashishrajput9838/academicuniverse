const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater').default;

function extractText(docxBuffer) {
  const zip = new PizZip(docxBuffer);
  const xml = zip.file('word/document.xml').asText();
  const matches = [...xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)];
  return matches.map(m => m[1]).join('');
}

const ourTemplatePath = path.join('..', 'input data', 'word-test.docx');
const ourTemplateBuf = fs.readFileSync(ourTemplatePath);

console.log('=== Official Docxtemplater Example Pattern ===');
console.log('Using: new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })');
console.log('');

// Test 1: Official example with our template (strict)
console.log('--- Test 1: Official example + our template (strict) ---');
try {
  const zip1 = new PizZip(ourTemplateBuf);
  const doc1 = new Docxtemplater(zip1, {
    paragraphLoop: true,
    linebreaks: true,
  });
  doc1.setData({ name: 'Alice' });
  doc1.render();
  const out1 = doc1.getZip().generate({ type: 'nodebuffer' });
  console.log('Rendered: YES');
  console.log('Text:', JSON.stringify(extractText(out1)));
} catch (e) {
  console.log('Rendered: NO');
  console.log('Error:', e.errors ? e.errors.map(err => err.message).join('; ') : e.message);
}

console.log('');

// Test 2: Official example with our template (relaxed)
console.log('--- Test 2: Official example + our template (relaxed) ---');
try {
  const zip2 = new PizZip(ourTemplateBuf);
  const doc2 = new Docxtemplater(zip2, {
    paragraphLoop: true,
    linebreaks: true,
    syntax: {
      allowUnclosedTag: true,
      allowUnopenedTag: true,
    },
    nullGetter: () => '',
  });
  doc2.setData({ name: 'Alice' });
  doc2.render();
  const out2 = doc2.getZip().generate({ type: 'nodebuffer' });
  console.log('Rendered: YES');
  console.log('Text:', JSON.stringify(extractText(out2)));
} catch (e) {
  console.log('Rendered: NO');
  console.log('Error:', e.errors ? e.errors.map(err => err.message).join('; ') : e.message);
}

console.log('');
console.log('=== Verdict ===');
console.log('If both tests produce {Alice}, the issue is in Docxtemplater\'s rendering pipeline, not our code.');
