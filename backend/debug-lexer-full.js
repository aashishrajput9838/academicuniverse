const PizZip = require('pizzip');
const fs = require('fs');
const Lexer = require('docxtemplater/js/lexer');

const buf = fs.readFileSync('proper-headings-output.docx');
const zip = new PizZip(buf);

const content = zip.file('word/document.xml').asText();

// Monkey-patch parseDelimiters to see what's happening
const origParseDelimiters = Lexer.parseDelimiters;
Lexer.parseDelimiters = function(innerContentParts, delimiters, syntaxOptions) {
  var full = '';
  for (var i = 0; i < innerContentParts.length; i++) {
    var p = innerContentParts[i];
    full += p.value;
  }
  console.log('FULL length:', full.length);
  console.log('FULL content:', JSON.stringify(full));
  
  var delimiterMatches = Lexer.getAllDelimiterIndexes(full, delimiters, syntaxOptions);
  console.log('Delimiter matches in FULL:', delimiterMatches);
  
  return origParseDelimiters(innerContentParts, delimiters, syntaxOptions);
};

try {
  const Docxtemplater = require('docxtemplater').default;
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.setData({ degree: 'BS CS', institution: 'MIT', category: 'Programming' });
  doc.render();
  console.log('Render succeeded');
} catch (err) {
  console.error('Error:', err.message);
}
