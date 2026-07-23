import dotenv from 'dotenv';
import path from 'path';
const envPath = process.env.NODE_ENV === 'development' ? '.env.development' : '.env';
dotenv.config({ path: path.resolve(__dirname, envPath) });

import PizZip from 'pizzip';
import { PlaceholderInjector } from './src/services/placeholderInjector.service';
import fs from 'fs';

const ORIGINAL_FILE = '../test.docx';

async function main() {
  const buf = fs.readFileSync(ORIGINAL_FILE);
  const zip = new PizZip(buf);
  const documentXml = zip.file('word/document.xml').asText();

  console.log('=== ORIGINAL word/document.xml (first 300 chars) ===');
  console.log(documentXml.substring(0, 300));
  console.log('\n=== ORIGINAL has xmlns:w? ===');
  console.log(documentXml.includes('xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'));

  const injector = new PlaceholderInjector();
  
  const mockSections = [
    {
      id: 'section_1',
      title: 'Education',
      order: 0,
      repeatable: false,
      fields: [
        { key: 'degree', label: 'Degree', type: 'text', required: true, aiEnhanceable: true },
        { key: 'institution', label: 'Institution', type: 'text', required: true, aiEnhanceable: true },
      ] as any,
    },
  ] as any;

  const extractedDoc = {
    paragraphs: [],
    runs: [],
    hasTables: false,
    hasImages: false,
    placeholderCount: 0,
  };

  const result = await injector.inject(buf, extractedDoc, mockSections);

  if (!result.success) {
    console.log('\nInjection failed:', result.issues);
    return;
  }

  const processedZip = new PizZip(result.buffer);
  const processedXml = processedZip.file('word/document.xml').asText();

  console.log('\n=== PROCESSED word/document.xml (first 300 chars) ===');
  console.log(processedXml.substring(0, 300));
  console.log('\n=== PROCESSED has xmlns:w? ===');
  console.log(processedXml.includes('xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'));

  console.log('\n=== COMPARISON ===');
  console.log('Original length:', documentXml.length);
  console.log('Processed length:', processedXml.length);
  console.log('Difference:', processedXml.length - documentXml.length, 'bytes');
  console.log('xmlns:w preserved:', processedXml.includes('xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'));
}

main().catch(console.error);
