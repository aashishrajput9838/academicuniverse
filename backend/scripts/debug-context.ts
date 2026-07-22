const fs = require('fs');
const PizZip = require('pizzip');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const Docxtemplater = require('docxtemplater');
const { PlaceholderInjector } = require('./src/services/placeholderInjector.service');
const { DocxExtractionService } = require('./src/docxExtraction.service');
const { ExtractionResultService } = require('./src/services/extractionResult.service');

async function test() {
  const buffer = fs.readFileSync('input data/resume templet 5 conv.docx');
  const es = new DocxExtractionService();
  const ed = await es.extract(buffer);
  const ir = new ExtractionResultService({ enableAiAssistance: false });
  const er = await ir.extract(ed);
  
  const pi = new PlaceholderInjector();
  const res = await pi.inject(buffer, ed, er.sections);
  
  const zip = new PizZip(res.buffer);
  const docXml = zip.file('word/document.xml')?.asText() || '';
  
  // Find all placeholders and show context
  const regex = /\{\{[^}]+\}\}/g;
  let match;
  let count = 0;
  while ((match = regex.exec(docXml)) !== null) {
    count++;
    const start = Math.max(0, match.index - 50);
    const end = Math.min(docXml.length, match.index + match[0].length + 50);
    const context = docXml.slice(start, end);
    
    // Check for overlapping tags
    const before = docXml.slice(Math.max(0, match.index - 100), match.index);
    const after = docXml.slice(match.index + match[0].length, Math.min(docXml.length, match.index + match[0].length + 100));
    
    console.log(`\n=== Placeholder ${count}: ${match[0]} at offset ${match.index} ===`);
    console.log('Before:', before.replace(/\n/g, '\\n'));
    console.log('Tag:', match[0]);
    console.log('After:', after.replace(/\n/g, '\\n'));
    
    if (count >= 15) break;
  }
}

test().catch(e => console.error(e));
