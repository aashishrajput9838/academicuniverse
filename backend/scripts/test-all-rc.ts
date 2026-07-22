import { TemplateProcessingOrchestrator } from '../src/services/templateProcessingOrchestrator.service';
import { ResumeGenerationOrchestrator } from '../src/services/resumeGenerationOrchestrator.service';
import fs from 'fs';

async function testTemplate(name: string) {
  const buffer = fs.readFileSync(`input data/${name}`);
  
  const baseline = new TemplateProcessingOrchestrator({ enableAiAssistance: false });
  const baselineResult = await baseline.process(buffer);
  console.log(`\n=== ${name} ===`);
  console.log('Baseline sections:', baselineResult.milestone2Result.sections.length);
  console.log('Baseline placeholders:', baselineResult.injectionResult.placeholdersInjected);
  
  const m4 = new ResumeGenerationOrchestrator({ enableAiAssistance: false });
  try {
    const result = await m4.generate(buffer, { name: 'Test', degree: 'B.Tech', institution: 'Univ', company: 'Corp', role: 'Dev' });
    console.log('M4 success:', result.success);
    console.log('M4 issues:', result.issues.length);
    if (result.issues.length > 0) {
      result.issues.forEach(i => console.log('  -', i));
    }
  } catch (e) {
    console.error('M4 error:', e);
  }
}

Promise.all([
  testTemplate('resume templet 2 conv.docx'),
  testTemplate('resume templet 3 conv.docx'),
  testTemplate('resume templet 4 conv.docx'),
  testTemplate('resume templet 5 conv.docx'),
  testTemplate('resume templet kushagra conv.docx'),
]).catch(e => console.error(e));
