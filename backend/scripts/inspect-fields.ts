import { TemplateProcessingOrchestrator } from '../src/services/templateProcessingOrchestrator.service';
import fs from 'fs';

async function inspect() {
  const buffer = fs.readFileSync('input data/resume templet 5 conv.docx');
  const orchestrator = new TemplateProcessingOrchestrator({ enableAiAssistance: false });
  const result = await orchestrator.process(buffer);
  result.milestone2Result.sections.forEach(s => {
    console.log(s.title + ': fields=' + s.fields.map(f => f.key + '(' + f.type + ',' + f.required + ')').join(', '));
  });
}

inspect().catch(e => console.error(e));
