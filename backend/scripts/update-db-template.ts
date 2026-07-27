import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { TemplateProcessingOrchestrator } from '../src/services/templateProcessingOrchestrator.service';
import storageService from '../src/services/storageService';
import { RESUME_PLACEHOLDERS } from '../src/config/resumePlaceholders';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/academic_universe';

async function updateDbTemplate() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB:', MONGODB_URI);

  const ResumeTemplate = mongoose.model('ResumeTemplate', new mongoose.Schema({}, { strict: false }));
  const templates: any[] = await ResumeTemplate.find({}).lean();
  console.log(`Found ${templates.length} templates in DB.`);

  const polishedPath = path.join(__dirname, '..', 'input data', 'Academic_Universe_Semantic_Resume_Template_v2_polished.docx');
  const buffer = fs.readFileSync(polishedPath);

  const orchestrator = new TemplateProcessingOrchestrator({ enableAiAssistance: false });
  const result = await orchestrator.process(buffer);

  if (!result.success) {
    console.error('Template processing failed:', result.issues);
    await mongoose.disconnect();
    return;
  }

  console.log(`Processed template successfully. Sections: ${result.milestone2Result.sections.length}`);

  const placeholderSectionMap = new Map<string, string>();
  for (const p of RESUME_PLACEHOLDERS) {
    placeholderSectionMap.set(p.key.toLowerCase(), p.section);
  }

  const questions = result.milestone2Result.sections.flatMap((s: any) =>
    s.fields.map((f: any) => ({
      tag: f.key,
      question: f.label,
      type: f.type === 'textarea' ? 'textarea' : 'text',
      aiEnhanceable: f.aiEnhanceable || false,
      section: placeholderSectionMap.get(f.key.toLowerCase()) || 'other',
    }))
  );

  for (const t of templates) {
    console.log(`Updating DB template ${t._id} (${t.templateName})...`);
    let fileUrl = t.fileUrl;
    try {
      fileUrl = await storageService.uploadResumeTemplate(
        result.processedBuffer,
        `polished_template_${Date.now()}.docx`,
        t.organizationId || 'org123'
      );
    } catch (e: any) {
      console.warn('Storage upload failed, using original fileUrl:', e.message);
    }

    await ResumeTemplate.findByIdAndUpdate(t._id, {
      $set: {
        fileUrl,
        originalFileUrl: fileUrl,
        sections: result.milestone2Result.sections,
        questions,
        confidence: result.milestone2Result.confidence,
        validationStatus: 'valid',
      },
    });
    console.log(`Updated template ${t._id} successfully!`);
  }

  await mongoose.disconnect();
  console.log('Done!');
}

updateDbTemplate().catch(console.error);
