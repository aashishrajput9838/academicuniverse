import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { v2 as cloudinary } from 'cloudinary';

// Load root .env
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

import { TemplateProcessingOrchestrator } from '../src/services/templateProcessingOrchestrator.service';
import storageService from '../src/services/storageService';
import { RESUME_PLACEHOLDERS } from '../src/config/resumePlaceholders';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/academic_universe';

async function reprocessAllDbTemplates() {
  console.log('=== RE-PROCESSING ALL MONGO DB TEMPLATES WITH FIXED PLACEHOLDER INJECTOR ===\n');

  await mongoose.connect(MONGODB_URI);
  const ResumeTemplate = mongoose.model('ResumeTemplate', new mongoose.Schema({}, { strict: false }));
  const templates: any[] = await ResumeTemplate.find({}).lean();

  console.log(`Found ${templates.length} templates in DB.`);

  const polishedPath = path.join(__dirname, '..', 'input data', 'Academic_Universe_Semantic_Resume_Template_v2_polished.docx');
  const polishedBuffer = fs.readFileSync(polishedPath);

  const orchestrator = new TemplateProcessingOrchestrator({ enableAiAssistance: false });
  const processResult = await orchestrator.process(polishedBuffer);

  if (!processResult.success) {
    console.error('Failed to process polished template:', processResult.issues);
    await mongoose.disconnect();
    return;
  }

  console.log(`Polished template processed successfully. Sections count: ${processResult.milestone2Result.sections.length}`);

  const placeholderSectionMap = new Map<string, string>();
  for (const p of RESUME_PLACEHOLDERS) {
    placeholderSectionMap.set(p.key.toLowerCase(), p.section);
  }

  const questions = processResult.milestone2Result.sections.flatMap((s: any) =>
    s.fields.map((f: any) => ({
      tag: f.key,
      question: f.label,
      type: f.type === 'textarea' ? 'textarea' : 'text',
      aiEnhanceable: f.aiEnhanceable || false,
      section: placeholderSectionMap.get(f.key.toLowerCase()) || 'other',
    }))
  );

  for (const t of templates) {
    console.log(`\nRe-processing DB Template ${t._id} (${t.templateName || 'Unnamed'})...`);
    
    let uploadedFileUrl: string = t.fileUrl;
    try {
      uploadedFileUrl = await storageService.uploadResumeTemplate(
        processResult.processedBuffer,
        `polished_fixed_${Date.now()}.docx`,
        t.organizationId || 'org123'
      );
      console.log(`Uploaded new clean processed DOCX to Cloudinary: ${uploadedFileUrl}`);
    } catch (e: any) {
      console.warn(`Cloudinary upload warning: ${e.message}. Updating local data.`);
    }

    await ResumeTemplate.findByIdAndUpdate(t._id, {
      $set: {
        fileUrl: uploadedFileUrl,
        originalFileUrl: uploadedFileUrl,
        sections: processResult.milestone2Result.sections,
        questions,
        confidence: processResult.milestone2Result.confidence,
        validationStatus: 'valid',
      },
    });

    console.log(`DB Template ${t._id} updated successfully!`);
  }

  await mongoose.disconnect();
  console.log('\nAll DB templates re-processed and updated successfully!');
}

reprocessAllDbTemplates().catch(console.error);
