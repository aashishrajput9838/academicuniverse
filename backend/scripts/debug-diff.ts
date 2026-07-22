import { PlaceholderInjector } from '../src/services/placeholderInjector.service';
import { DocxExtractionService } from '../src/docxExtraction.service';
import { ExtractionResultService } from '../src/services/extractionResult.service';
import fs from 'fs';
import PizZip from 'pizzip';

async function test() {
  const buffer = fs.readFileSync('input data/resume templet 5 conv.docx');
  const es = new DocxExtractionService();
  const ed = await es.extract(buffer);
  const ir = new ExtractionResultService({ enableAiAssistance: false });
  const er = await ir.extract(ed);
  
  const pi = new PlaceholderInjector();
  const res = await pi.inject(buffer, ed, er.sections);
  
  const origZip = new PizZip(buffer);
  const origXml = origZip.file('word/document.xml')?.asText() || '';
  const injZip = new PizZip(res.buffer);
  const injXml = injZip.file('word/document.xml')?.asText() || '';
  
  console.log('Original length:', origXml.length);
  console.log('Injected length:', injXml.length);
  console.log('Diff size:', Math.abs(origXml.length - injXml.length));
  
  // Check if first 1000 chars and last 1000 chars match
  console.log('First 200 match:', origXml.slice(0, 200) === injXml.slice(0, 200));
  console.log('Last 200 match:', origXml.slice(-200) === injXml.slice(-200));
  
  // Count differences
  let diffCount = 0;
  const minLen = Math.min(origXml.length, injXml.length);
  for (let i = 0; i < minLen; i++) {
    if (origXml[i] !== injXml[i]) diffCount++;
  }
  console.log('Char diffs:', diffCount);
}

test().catch(e => console.error(e));
