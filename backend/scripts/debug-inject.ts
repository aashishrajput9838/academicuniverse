import { PlaceholderInjector } from '../src/services/placeholderInjector.service';
import { DocxExtractionService } from '../src/docxExtraction.service';
import { ExtractionResultService } from '../src/services/extractionResult.service';
import fs from 'fs';
import PizZip from 'pizzip';

async function test() {
  const buffer = fs.readFileSync('input data/resume templet 5 conv.docx');
  const extractionService = new DocxExtractionService();
  const extractedDoc = await extractionService.extract(buffer);
  const extractionResultService = new ExtractionResultService({ enableAiAssistance: false });
  const extractionResult = await extractionResultService.extract(extractedDoc);
  
  const placeholderInjector = new PlaceholderInjector();
  const injectionResult = await placeholderInjector.inject(buffer, extractedDoc, extractionResult.sections);
  
  // Try to open the result as a ZIP
  try {
    const zip = new PizZip(injectionResult.buffer);
    const docXml = zip.file('word/document.xml')?.asText() || '';
    console.log('Inject succeeded. DOCX XML length:', docXml.length);
    
    // Count all w:t elements
    const wTMatches = (docXml.match(/<w:t[^>]*>/g) || []).length;
    console.log('w:t elements:', wTMatches);
    
    console.log('First 50 chars of XML:', docXml.slice(0, 50));
    console.log('Around offset 86282:', docXml.slice(86270, 86310));
  } catch (e: any) {
    console.log('PizZip open failed:', e.message);
  }
}

test().catch(e => console.error(e));
