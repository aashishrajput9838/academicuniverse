const fs = require('fs');
const path = require('path');

// Read the parsed XML from the output file
const xml = fs.readFileSync('proper-headings-output-extracted/word/document.xml', 'utf8');

// Find all {{ and }} positions
const openMatches = [];
const closeMatches = [];
for (let i = 0; i < xml.length; i++) {
  if (xml[i] === '{' && xml[i+1] === '{') {
    openMatches.push(i);
  }
  if (xml[i] === '}' && xml[i+1] === '}') {
    closeMatches.push(i);
  }
}

console.log('XML length:', xml.length);
console.log('Open tags at:', openMatches);
console.log('Close tags at:', closeMatches);

// Extract tags between open and close
openMatches.forEach((openIdx, i) => {
  const closeIdx = closeMatches[i];
  if (closeIdx) {
    const tag = xml.substring(openIdx, closeIdx + 2);
    console.log(`Tag ${i}: offset ${openIdx}-${closeIdx+2}: "${tag}"`);
  }
});

// Now run docxtemplater lexer on this XML
try {
  const XmlTemplater = require('docxtemplater/js/xml-templater');
  const xt = new XmlTemplater();
  const result = xt.preparse(xml);
  console.log('\nDocxtemplater lexer result:', result);
} catch (err) {
  console.log('\nDocxtemplater error:', err.message);
  if (err.properties) {
    console.log('Properties:', JSON.stringify(err.properties, null, 2));
  }
}
