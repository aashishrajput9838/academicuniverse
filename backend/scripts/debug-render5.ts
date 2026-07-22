import { PlaceholderInjector } from '../src/services/placeholderInjector.service';
import { DocxExtractionService } from '../src/docxExtraction.service';
import { ExtractionResultService } from '../src/services/extractionResult.service';
import fs from 'fs';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

async function test() {
  const buffer = fs.readFileSync('input data/resume templet 5 conv.docx');
  const es = new DocxExtractionService();
  const ed = await es.extract(buffer);
  const er = new ExtractionResultService({ enableAiAssistance: false });
  const mr = await er.extract(ed);
  
  const pi = new PlaceholderInjector();
  const res = await pi.inject(buffer, ed, mr.sections);
  
  try {
    const zip = new PizZip(res.buffer);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    doc.setData({ x: '1' });
    doc.render();
    console.log('Render OK');
  } catch (e: any) {
    console.log('Render FAIL:', e.message);
    
    // Now let's check if the issue is in how xmlBuilder formats the XML
    const zip = new PizZip(res.buffer);
    const docXml = zip.file('word/document.xml')?.asText() || '';
    
    // Find first few placeholders and their context
    const matches: {offset: number; tag: string; context: string}[] = [];
    const regex = /\{\{[^}]+\}\}/g;
    let m;
    while ((m = regex.exec(docXml)) !== null) {
      const start = Math.max(0, m.index - 30);
      const end = Math.min(docXml.length, m.index + m[0].length + 30);
      matches.push({
        offset: m.index,
        tag: m[0],
        context: docXml.slice(start, end).replace(/\n/g, '\\n')
      });
    }
    
    console.log('First 5 placeholders:');
    matches.slice(0, 5).forEach(x => {
      console.log(`  offset ${x.offset}: ${x.tag}`);
      console.log(`    ${x.context}\n`);
    });
    
    console.log('Checking XML validity...');
    try {
      const testZip = new PizZip(res.buffer);
      const testDocXml = testZip.file('word/document.xml')?.asText() || '';
      const parser = new (require('fast-xml-parser').XMLParser)({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        textNodeName: '#text',
        parseTagValue: false,
        parseAttributeValue: false,
        trimValues: false,
      });
      parser.parse(testDocXml);
      console.log('XML parse: OK');
    } catch (parseErr: any) {
      console.log('XML parse: FAIL -', parseErr.message);
    }
  }
}

test().catch(e => console.error(e));
