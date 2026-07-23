import http from 'http';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
const envPath = process.env.NODE_ENV === 'development' ? '.env.development' : '.env';
dotenv.config({ path: path.resolve(__dirname, envPath) });

import { TemplateProcessingOrchestrator } from './src/services/templateProcessingOrchestrator.service';
import { ResumeService } from './src/services/resumeService';

const ORIGINAL_FILE = '../test.docx';
const PROCESSED_FILE = path.join(__dirname, 'debug-processed-template.docx');
const PORT = 8766;

async function main() {
  console.log('=== STEP 1: Process original test.docx through pipeline ===');
  const originalBuffer = fs.readFileSync(ORIGINAL_FILE);
  const orchestrator = new TemplateProcessingOrchestrator({ enableAiAssistance: false });
  const processResult = await orchestrator.process(originalBuffer);

  if (!processResult.success) {
    console.log('Processing failed:', processResult.issues);
    return;
  }

  console.log('Processing succeeded. Placeholders injected:', processResult.injectionResult.placeholdersInjected);
  fs.writeFileSync(PROCESSED_FILE, processResult.processedBuffer);
  console.log('Saved processed template to:', PROCESSED_FILE);

  // Validate processed DOCX structure
  const PizZip = require('pizzip');
  const processedZip = new PizZip(processResult.processedBuffer);
  const processedDocXml = processedZip.file('word/document.xml').asText();
  console.log('\n=== STEP 2: Verify namespace preservation in processed template ===');
  console.log('Processed word/document.xml has xmlns:w:', processedDocXml.includes('xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'));
  console.log('Processed word/document.xml has w:body:', processedDocXml.includes('<w:body'));

  // Start HTTP server to serve processed template
  const server = http.createServer((req, res) => {
    fs.readFile(PROCESSED_FILE, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      res.end(data);
    });
  });

  server.listen(PORT, async () => {
    console.log(`\n=== STEP 3: Resume generation with processed template ===`);
    console.log(`HTTP server listening on port ${PORT}`);
    try {
      const templateUrl = `http://localhost:${PORT}/processed-template.docx`;
      const service = new ResumeService();
      const result = await service.processResumeTemplate(templateUrl, { name: 'Test User' }, 'none', []);
      console.log('Resume generation: SUCCESS');
      console.log('DOCX buffer size:', result.docxBuffer.length);
      console.log('HTML preview length:', result.htmlPreview.length);
      console.log('\n=== VERIFICATION PASSED ===');
      console.log('No "Could not find the body element" error occurred.');
    } catch (err) {
      console.error('Resume generation FAILED:', err);
    } finally {
      server.close();
    }
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
