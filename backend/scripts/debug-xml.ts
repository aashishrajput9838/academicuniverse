import { PlaceholderInjector } from '../src/services/placeholderInjector.service';
import { DocxExtractionService } from '../src/docxExtraction.service';
import { ExtractionResultService } from '../src/services/extractionResult.service';
import fs from 'fs';
import PizZip from 'pizzip';
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: '#text',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: false,
});

async function debug() {
  const buffer = fs.readFileSync('input data/resume templet 5 conv.docx');
  const extractionService = new DocxExtractionService();
  const extractedDoc = await extractionService.extract(buffer);
  
  const extractionResultService = new ExtractionResultService({ enableAiAssistance: false });
  const extractionResult = await extractionResultService.extract(extractedDoc);
  
  const placeholderInjector = new PlaceholderInjector();
  const injectionResult = await placeholderInjector.inject(buffer, extractedDoc, extractionResult.sections);
  
  const zip = new PizZip(injectionResult.buffer);
  const docXml = zip.file('word/document.xml')?.asText() || '';
  
  const matches: { offset: number; tag: string; context: string }[] = [];
  const regex = /\{\{[^}]+\}\}/g;
  let match;
  while ((match = regex.exec(docXml)) !== null) {
    const start = Math.max(0, match.index - 10);
    const end = Math.min(docXml.length, match.index + match[0].length + 10);
    matches.push({
      offset: match.index,
      tag: match[0],
      context: docXml.slice(start, end).replace(/\n/g, '\\n')
    });
  }
  
  console.log('Total tags:', matches.length);
  matches.forEach(m => {
    console.log(`Offset ${m.offset}: ${m.tag}`);
    console.log(`  Context: ${m.context}\n`);
  });
}

debug().catch(e => console.error(e));
