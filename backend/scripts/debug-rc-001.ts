import { ResumeGenerationOrchestrator } from '../src/services/resumeGenerationOrchestrator.service';
import { TemplateProcessingOrchestrator } from '../src/services/templateProcessingOrchestrator.service';
import fs from 'fs';

async function debug() {
  const buffer = fs.readFileSync('input data/resume templet 5 conv.docx');
  
  const orchestrator = new TemplateProcessingOrchestrator({ enableAiAssistance: false });
  const baseline = await orchestrator.process(buffer);
  console.log('Baseline:', JSON.stringify({ success: baseline.success, sections: baseline.milestone2Result.sections.length, placeholders: baseline.injectionResult.placeholdersInjected }, null, 2));
  
  const m4orchestrator = new ResumeGenerationOrchestrator({ enableAiAssistance: false });
  const result = await m4orchestrator.generate(buffer, { name: 'Test' });
  console.log('M4 Result:', JSON.stringify({ success: result.success, issues: result.issues, fillerSuccess: result.fillerResult.success, fillerIssues: result.fillerResult.issues, validation: result.validationResult }, null, 2));
}

debug().catch(e => console.error(e));
