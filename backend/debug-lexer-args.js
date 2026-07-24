const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater').default;
const Lexer = require('docxtemplater/js/lexer');

// Patch Lexer.parse to see arguments
const originalParse = Lexer.parse;
Lexer.parse = function(xmllexed, delimiters, syntax, fileType) {
  console.log('Lexer.parse called with fileType:', fileType);
  console.log('xmllexed length:', xmllexed.length);
  
  var contentParts = xmllexed.filter(p => p.type === 'content');
  console.log('Content parts:');
  contentParts.forEach((p, i) => {
    console.log(`  [${i}] position=${p.position} value=${JSON.stringify(p.value)}`);
  });
  
  const result = originalParse(xmllexed, delimiters, syntax, fileType);
  console.log('Lexer.parse errors:', result.errors.length);
  return result;
};

const zip = new PizZip();
zip.file('word/document.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>{{name}}</w:t></w:r></w:p></w:body></w:document>');
zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
zip.file('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>');

try {
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.setData({ name: 'World' });
  doc.render();
  console.log('SUCCESS');
} catch (err) {
  console.error('FAILED:', err.message);
}
