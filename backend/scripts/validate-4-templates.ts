import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import mammoth from 'mammoth';
import { PlaceholderValidator } from '../src/services/placeholderValidator.service';
import { TemplateProcessingOrchestrator } from '../src/services/templateProcessingOrchestrator.service';
import { DocxExtractionService } from '../src/docxExtraction.service';
import { SectionDetectorService } from '../src/services/sectionDetector.service';

const TEMPLATES = [
  { file: 'template1_modern_ats_professional.docx', name: 'Template 1: Modern ATS Professional' },
  { file: 'template2_modern_two_column.docx', name: 'Template 2: Modern Two-Column Resume' },
  { file: 'template3_corporate_executive.docx', name: 'Template 3: Corporate Executive Resume' },
  { file: 'template4_minimal_elegant.docx', name: 'Template 4: Minimal Elegant Resume' },
];

// Standard Realistic Sample Data
const STANDARD_SAMPLE_DATA: Record<string, string> = {
  full_name: 'Aashish Rajput',
  phone: '+91 9876543210',
  email: 'aashish.rajput@example.com',
  github: 'https://github.com/aashishrajput',
  linkedin: 'https://linkedin.com/in/aashishrajput',
  website: 'https://aashishrajput.dev',
  location: 'Noida, Uttar Pradesh, India',
  professional_summary: 'Motivated Computer Science undergraduate with strong problem-solving skills, experience in full-stack development, AI applications, and competitive programming.',
  skills: 'Java, C++, Python, JavaScript, React, Next.js, Node.js, MongoDB, SQL, Git, Docker',
  experience_company: 'OpenAI Research Labs',
  experience_role: 'Software Engineering Intern',
  experience_start_date: '2023-06',
  experience_end_date: '2023-12',
  experience_technologies: 'Node.js, TypeScript, React, MongoDB, Docker, AWS',
  experience_description: 'Developed AI-powered web applications, optimized backend APIs, and collaborated with cross-functional teams to improve application performance.',
  education_degree: 'B.Tech Computer Science and Engineering',
  education_institution: 'Sharda University',
  education_start_year: '2021',
  education_end_year: '2025',
  education_cgpa: '8.72 / 10.0',
  education_details: 'Specialization in Artificial Intelligence and Machine Learning. Relevant coursework: Data Structures, Algorithms, DBMS, Operating Systems.',
  project_name: 'Academic Universe',
  project_description: 'Designed and developed a multi-tenant academic management platform featuring AI-powered resume generation, student analytics, and career tracking.',
  project_technologies: 'React, Next.js, Node.js, Express, MongoDB, TailwindCSS',
  project_url: 'https://github.com/academicuniverse/academicuniverse',
  certification_name: 'AWS Certified Cloud Practitioner',
  certification_issuer: 'Amazon Web Services',
  certification_issue_date: '2024-01',
  certification_expiry_date: '2027-01',
  certification_details: 'Validated expertise in cloud security, architecture, core AWS services, and billing management.',
  additional_information: 'Languages: English (Fluent), Hindi (Native). Hobbies: Competitive Programming, Tech Blogging, Open Source Contributing.',
};

// Stress Test Data with Special Characters & Long Text
const STRESS_TEST_DATA: Record<string, string> = {
  full_name: "Aashish Rajput O'Reilly",
  phone: '+91 9876543210',
  email: 'aashish.rajput@example.com',
  github: 'https://github.com/aashishrajput',
  linkedin: 'https://linkedin.com/in/aashishrajput',
  website: 'https://aashishrajput.dev',
  location: 'Noida, UP, India',
  professional_summary: 'Senior Software Engineer specializing in C++, C#, Node.js, React.js, and AI/ML architectures. Reduced latency by 50% & managed budget exceeding ₹1,00,000. Author of O\'Reilly publications on distributed systems.',
  skills: 'C++, C#, Java, Python, Node.js, React.js, AI/ML, SQL (MySQL, PostgreSQL), Docker, Kubernetes, AWS',
  experience_company: "O'Reilly Media & Tech Solutions",
  experience_role: 'Lead Architect & Senior Engineer (C++ / Node.js)',
  experience_start_date: '2022-01',
  experience_end_date: 'Present',
  experience_technologies: 'C++, C#, Node.js, React.js, Docker, AWS',
  experience_description: 'Engineered high-throughput microservices in C++ and C# handling 50,000+ RPS. Improved API throughput by 50% and saved ₹5,00,000 in monthly cloud infrastructure cost for O\'Reilly Media.',
  education_degree: 'B.Tech Computer Science (Honors in AI/ML)',
  education_institution: 'Sharda University Institute of Technology',
  education_start_year: '2018',
  education_end_year: '2022',
  education_cgpa: '9.5 / 10.0 (Top 1% Rank)',
  education_details: 'Published research on C++ / AI/ML optimization. Received ₹50,000 Academic Excellence Award.',
  project_name: 'Academic Universe (Enterprise AI/ML Portal)',
  project_description: 'Multi-tenant academic enterprise platform utilizing C++, Node.js, React.js & AI/ML algorithms. Scaled to 100,000 active students with 99.99% uptime.',
  project_technologies: 'C++, Node.js, React.js, MongoDB, Redis, Docker',
  project_url: 'https://github.com/academicuniverse/academicuniverse-enterprise',
  certification_name: 'AWS Certified Solutions Architect & C++ / C# Specialist',
  certification_issuer: "Amazon Web Services & O'Reilly Institute",
  certification_issue_date: '2023-05',
  certification_expiry_date: '2026-05',
  certification_details: 'Certified in enterprise cloud architecture, C# microservices, C++ memory optimization & AI/ML pipelines.',
  additional_information: '', // Empty optional field stress test
};

async function validateTemplates() {
  console.log('========================================================================');
  console.log('MULTI-TEMPLATE COMPATIBILITY VALIDATION REPORT');
  console.log('========================================================================\n');

  const validator = new PlaceholderValidator();
  const docxExtractor = new DocxExtractionService();
  const sectionDetector = new SectionDetectorService();

  const auditSummary: any[] = [];

  for (const tInfo of TEMPLATES) {
    console.log(`\n========================================================================`);
    console.log(`TESTING TEMPLATE: ${tInfo.name}`);
    console.log(`Filename: ${tInfo.file}`);
    console.log(`========================================================================`);

    const filePath = path.join(__dirname, '..', 'input data', tInfo.file);
    const buffer = fs.readFileSync(filePath);

    // 1. Placeholder Validation
    const valResult = await validator.validate(buffer);
    console.log('\n--- 1. PLACEHOLDER VALIDATION RESULT ---');
    console.log(`Validation Status: ${valResult.valid ? 'VALID' : 'INVALID'}`);
    console.log(`Total Placeholders Detected: ${valResult.summary.total}`);
    console.log(`Unique Placeholders: ${valResult.summary.unique}`);
    console.log(`Duplicate Placeholders: ${valResult.summary.duplicates}`);
    console.log(`Missing Required Placeholders: ${valResult.summary.missingRequired.length}`);
    console.log(`Unknown Placeholders: ${valResult.summary.unknown.length}`);
    console.log(`Deprecated Placeholders: ${valResult.summary.deprecated.length}`);

    // 2. Processing & Dynamic Form Generation
    const orchestrator = new TemplateProcessingOrchestrator({ enableAiAssistance: false });
    const procResult = await orchestrator.process(buffer);

    console.log('\n--- 2. TEMPLATE PROCESSING RESULT ---');
    console.log(`Processing Success: ${procResult.success}`);
    console.log(`Sections Detected (${procResult.milestone2Result.sections.length}):`);
    procResult.milestone2Result.sections.forEach(s => {
      console.log(`  • [Section: ${s.title}] (${s.fields.length} fields: ${s.fields.map(f => f.key).join(', ')})`);
    });

    // 3. End-to-End Rendering & XML Audit (Standard Data)
    const processedZip = new PizZip(procResult.processedBuffer);
    const doc = new Docxtemplater(processedZip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
      nullGetter: () => '',
    });

    doc.render(STANDARD_SAMPLE_DATA);
    const filledDocxBuffer = doc.getZip().generate({ type: 'nodebuffer' });

    const filledZip = new PizZip(filledDocxBuffer);
    const filledXml = filledZip.file('word/document.xml')?.asText() || '';

    console.log('\n--- 3. XML OCCURRENCE COUNT AUDIT (STANDARD DATA) ---');
    const projectChecks = [
      { key: 'project_name', value: 'Academic Universe' },
      { key: 'project_description', value: 'Designed and developed a multi-tenant academic management platform' },
      { key: 'project_technologies', value: 'React, Next.js, Node.js, Express, MongoDB, TailwindCSS' },
      { key: 'project_url', value: 'https://github.com/academicuniverse/academicuniverse' },
    ];

    let allProjectCountsExact1 = true;
    for (const check of projectChecks) {
      const escaped = check.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const count = (filledXml.match(new RegExp(escaped, 'g')) || []).length;
      console.log(`  • Value '${check.key}' ("${check.value}") occurrence count in XML: ${count}`);
      if (count !== 1) allProjectCountsExact1 = false;
    }

    const unresolvedMatches = filledXml.match(/\{\{[^}]+\}\}/g);
    console.log(`Unresolved {{placeholder}} tokens remaining in XML: ${unresolvedMatches ? unresolvedMatches.length : 0}`);

    const mammothStandard = await mammoth.convertToHtml({ buffer: filledDocxBuffer });
    console.log(`Generated HTML Preview length: ${mammothStandard.value.length} chars.`);

    // 4. Stress Testing (Special Chars, C++, C#, ₹, 50%, Long Text)
    console.log('\n--- 4. STRESS TESTING WITH COMPLEX DATA ---');
    const stressDoc = new Docxtemplater(new PizZip(procResult.processedBuffer), {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
      nullGetter: () => '',
    });

    stressDoc.render(STRESS_TEST_DATA);
    const stressDocxBuffer = stressDoc.getZip().generate({ type: 'nodebuffer' });
    const stressXml = new PizZip(stressDocxBuffer).file('word/document.xml')?.asText() || '';

    const stressChecks = [
      "Aashish Rajput O'Reilly",
      'C++',
      'C#',
      'Node.js',
      'React.js',
      '50%',
      '₹',
      'AI/ML',
      "O'Reilly",
    ];

    let stressPassed = true;
    for (const sStr of stressChecks) {
      const regexStr = sStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "(?:'|&apos;|&#39;)");
      const count = (stressXml.match(new RegExp(regexStr, 'g')) || []).length;
      console.log(`  • Stress token '${sStr}' found in XML: ${count} time(s)`);
      if (count === 0) stressPassed = false;
    }

    const stressUnresolved = stressXml.match(/\{\{[^}]+\}\}/g);
    console.log(`Stress test unresolved placeholders: ${stressUnresolved ? stressUnresolved.length : 0}`);

    const mammothStress = await mammoth.convertToHtml({ buffer: stressDocxBuffer });
    console.log(`Stress HTML Preview generated cleanly (${mammothStress.value.length} chars).`);

    auditSummary.push({
      template: tInfo.name,
      valid: valResult.valid,
      placeholdersDetected: valResult.summary.total,
      sectionsDetected: procResult.milestone2Result.sections.length,
      allProjectCounts1: allProjectCountsExact1,
      unresolvedCount: unresolvedMatches ? unresolvedMatches.length : 0,
      stressTestPassed: stressPassed && (!stressUnresolved || stressUnresolved.length === 0),
    });
  }

  console.log('\n========================================================================');
  console.log('FINAL AUDIT SUMMARY MATRIX');
  console.log('========================================================================');
  console.table(auditSummary);
}

validateTemplates().catch(console.error);
