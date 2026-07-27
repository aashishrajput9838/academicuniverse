import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import mammoth from 'mammoth';
import { DocxExtractionService } from '../src/docxExtraction.service';
import { SectionDetectorService } from '../src/services/sectionDetector.service';
import { PlaceholderInjector } from '../src/services/placeholderInjector.service';
import { TemplateProcessingOrchestrator } from '../src/services/templateProcessingOrchestrator.service';
import resumeService from '../src/services/resumeService';
import { RESUME_PLACEHOLDERS } from '../src/config/resumePlaceholders';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/academic_universe';

async function auditProjectsPipeline() {
  console.log('=== AUDITING PROJECTS PIPELINE ===\n');

  await mongoose.connect(MONGODB_URI);
  console.log('1. Connected to MongoDB');

  const ResumeTemplate = mongoose.model('ResumeTemplate', new mongoose.Schema({}, { strict: false }));
  const templates: any[] = await ResumeTemplate.find({}).lean();
  console.log(`Found ${templates.length} templates in MongoDB.`);

  for (const t of templates) {
    console.log(`\n----------------------------------------------------`);
    console.log(`AUDITING DB TEMPLATE ID: ${t._id}`);
    console.log(`Template Name: ${t.templateName}`);
    console.log(`fileUrl: ${t.fileUrl}`);
    console.log(`originalFileUrl: ${t.originalFileUrl}`);

    // Download fileUrl
    let templateBuffer: Buffer;
    try {
      if (t.fileUrl.startsWith('http')) {
        const resp = await axios.get(t.fileUrl, { responseType: 'arraybuffer' });
        templateBuffer = Buffer.from(resp.data);
      } else {
        templateBuffer = fs.readFileSync(t.fileUrl);
      }
    } catch (e: any) {
      console.warn(`Could not download fileUrl ${t.fileUrl}: ${e.message}, falling back to local polished template file.`);
      const polishedPath = path.join(__dirname, '..', 'input data', 'Academic_Universe_Semantic_Resume_Template_v2_polished.docx');
      templateBuffer = fs.readFileSync(polishedPath);
    }

    console.log(`Downloaded template buffer. Size: ${templateBuffer.length} bytes.`);

    // Audit 8: Document XML of fileUrl stored in DB
    const zip = new PizZip(templateBuffer);
    const docXml = zip.file('word/document.xml')?.asText() || '';

    console.log('\n--- AUDIT STEP 8: XML OF STORED TEMPLATE FILEURL ---');
    const projectPlaceholders = ['project_name', 'project_description', 'project_technologies', 'project_url'];
    for (const ph of projectPlaceholders) {
      const tagRegex = new RegExp(`\\{\\{${ph}\\}\\}`, 'g');
      const matches = docXml.match(tagRegex);
      console.log(`Placeholder '{{${ph}}}' occurrence in stored fileUrl XML: ${matches ? matches.length : 0}`);
    }

    // Audit 2: SectionDetector on stored template
    const docxExtractionService = new DocxExtractionService();
    const extractedDoc = await docxExtractionService.extract(templateBuffer);
    const sectionDetector = new SectionDetectorService();
    const { sections, issues } = sectionDetector.detect(extractedDoc);

    console.log('\n--- AUDIT STEP 2: SECTION DETECTOR RESULT ---');
    console.log(`Total sections detected: ${sections.length}`);
    const projSection = sections.find(s => s.title.toLowerCase().includes('project'));
    if (projSection) {
      console.log(`Projects section found: '${projSection.title}' (fields: ${projSection.fields.map(f => f.key).join(', ')})`);
    } else {
      console.log('WARNING: Projects section NOT found in section detector output!');
    }

    // Audit 1: PlaceholderInjector on stored template
    const injector = new PlaceholderInjector();
    injector.enableDebug();
    const injectionRes = await injector.inject(templateBuffer, extractedDoc, sections);

    console.log('\n--- AUDIT STEP 1: PLACEHOLDER INJECTOR RESULT ---');
    console.log(`Injected buffer size: ${injectionRes.buffer.length}`);
    console.log(`DataKeyMapping:`, JSON.stringify(injectionRes.dataKeyMapping, null, 2));

    const injectedZip = new PizZip(injectionRes.buffer);
    const injectedXml = injectedZip.file('word/document.xml')?.asText() || '';
    for (const ph of projectPlaceholders) {
      const tagRegex = new RegExp(`\\{\\{${ph}\\}\\}`, 'g');
      const matches = injectedXml.match(tagRegex);
      console.log(`Placeholder '{{${ph}}}' occurrence after injection: ${matches ? matches.length : 0}`);
    }

    // Audit 5 & 7: Test rendering filled DOCX using sample data
    const sampleData: Record<string, string> = {
      full_name: 'Aashish Rajput',
      phone: '+91 9876543210',
      email: 'aashish.rajput@example.com',
      github: 'https://github.com/aashishrajput',
      linkedin: 'https://linkedin.com/in/aashishrajput',
      website: 'https://aashishrajput.dev',
      location: 'Noida, Uttar Pradesh, India',
      professional_summary: 'Motivated Computer Science undergraduate with strong problem-solving skills.',
      skills: 'Java, C++, Python, JavaScript, React, Next.js, Node.js, MongoDB',
      experience_company: 'OpenAI Research Labs',
      experience_role: 'Software Engineering Intern',
      experience_start_date: '2023-06',
      experience_end_date: '2023-12',
      experience_technologies: 'Node.js, TypeScript, React, MongoDB',
      experience_description: 'Developed AI-powered web applications and optimized backend APIs.',
      education_degree: 'B.Tech Computer Science and Engineering',
      education_institution: 'Sharda University',
      education_start_year: '2021',
      education_end_year: '2025',
      education_cgpa: '8.72 / 10.0',
      education_details: 'Specialization in AI/ML.',
      project_name: 'Academic Universe',
      project_description: 'Designed and developed a multi-tenant academic management platform.',
      project_technologies: 'React, Next.js, Node.js, Express, MongoDB',
      project_url: 'https://github.com/academicuniverse/academicuniverse',
      certification_name: 'AWS Certified Cloud Practitioner',
      certification_issuer: 'Amazon Web Services',
      certification_issue_date: '2024-01',
      certification_expiry_date: '2027-01',
      certification_details: 'Validated expertise in cloud security and architecture.',
      additional_information: 'Languages: English (Fluent), Hindi (Native).',
    };

    console.log('\n--- AUDIT STEP 5 & 7: RENDERING WITH DOCXTEMPLATER ---');
    const docxTemplaterInstance = new Docxtemplater(injectedZip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
      nullGetter: () => '',
    });

    docxTemplaterInstance.render(sampleData);
    const filledBuffer = docxTemplaterInstance.getZip().generate({ type: 'nodebuffer' });

    const filledZip = new PizZip(filledBuffer);
    const filledXml = filledZip.file('word/document.xml')?.asText() || '';

    console.log('\n--- AUDIT STEP 8: FINAL RENDERED XML OCCURRENCE COUNTS ---');
    const checkValues = [
      { label: 'Project Name', value: 'Academic Universe' },
      { label: 'Project Description', value: 'Designed and developed a multi-tenant academic management platform.' },
      { label: 'Project Technologies', value: 'React, Next.js, Node.js, Express, MongoDB' },
      { label: 'Project URL', value: 'https://github.com/academicuniverse/academicuniverse' },
    ];

    for (const item of checkValues) {
      // Escape for regex
      const escaped = item.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const valRegex = new RegExp(escaped, 'g');
      const occurrences = (filledXml.match(valRegex) || []).length;
      console.log(`Value '${item.label}' ("${item.value}") occurrence count in final XML: ${occurrences}`);
    }

    const mammothResult = await mammoth.convertToHtml({ buffer: filledBuffer });
    console.log('\n--- RENDERED HTML PREVIEW ---');
    console.log(mammothResult.value);
  }

  await mongoose.disconnect();
  console.log('\nAudit complete.');
}

auditProjectsPipeline().catch(console.error);
