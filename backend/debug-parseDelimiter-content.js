const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater').default;
const Lexer = require('docxtemplater/js/lexer');

// Access internal getDelimiterErrors via parseDelimiters scope
const originalParseDelimiters = Lexer.parseDelimiters;
Lexer.parseDelimiters = function(innerContentParts, delimiters, syntaxOptions) {
  var full = '';
  for (var i = 0; i < innerContentParts.length; i++) {
    var p = innerContentParts[i];
    full += p.value;
  }
  console.log('parseDelimiters full:', JSON.stringify(full));
  console.log('parseDelimiters innerContentParts:');
  innerContentParts.forEach((p, i) => {
    console.log(`  [${i}] type=${p.type} position=${p.position || 'undefined'} value=${JSON.stringify(p.value)}`);
  });
  
  // Manually run getDelimiterErrors to see what happens
  var delimiterMatches = Lexer.getAllDelimiterIndexes ? Lexer.getAllDelimiterIndexes(full, delimiters, syntaxOptions) : null;
  console.log('delimiterMatches:', delimiterMatches);
  
  return originalParseDelimiters(innerContentParts, delimiters, syntaxOptions);
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
