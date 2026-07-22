import { ResumeGenerationOrchestrator } from '../src/services/resumeGenerationOrchestrator.service';
import fs from 'fs';

async function testOne() {
  console.log('START');
  const buffer = fs.readFileSync('input data/resume templet 5 conv.docx');
  console.log('BUFFER READ');
  const orchestrator = new ResumeGenerationOrchestrator({ enableAiAssistance: false });
  console.log('ORCHESTRATOR CREATED');
  const result = await orchestrator.generate(buffer, { name: 'Test' });
  console.log('RESULT:', JSON.stringify({ success: result.success, issues: result.issues, fillerIssues: result.fillerResult.issues, validation: result.validationResult }, null, 2));
}

testOne().catch(e => console.error('ERROR:', e));
