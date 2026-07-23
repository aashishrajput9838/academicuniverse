const PizZip = require('pizzip');
const fs = require('fs');

const buf = fs.readFileSync('generated-debug.docx');
const zip = new PizZip(buf);

console.log('=== DOCX VALIDATION ===');
console.log('Buffer size:', buf.length, 'bytes');

const files = Object.keys(zip.files).sort();
console.log('\nAll files inside DOCX:');
files.forEach(f => {
  try {
    const size = zip.file(f).asBinary().length;
    console.log('  ' + f + ' (' + size + ' bytes)');
  } catch (e) {
    console.log('  ' + f);
  }
});

console.log('\nCheck results:');
console.log('  word/document.xml exists:', !!zip.file('word/document.xml'));
console.log('  [Content_Types].xml exists:', !!zip.file('[Content_Types].xml'));

let docXml = '';
if (zip.file('word/document.xml')) {
  docXml = zip.file('word/document.xml').asText();
  console.log('  w:document present:', docXml.includes('<w:document'));
  console.log('  w:body present:', docXml.includes('<w:body'));
  console.log('  Contains corruption markers:', docXml.toLowerCase().includes('repair') || docXml.toLowerCase().includes('corrupt') || docXml.toLowerCase().includes('invalid'));
}

console.log('\n=== XML SNIPPET ===');
console.log(docXml.substring(0, 500));
