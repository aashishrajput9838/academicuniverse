const fs = require('fs');
const path = require('path');
const docx = require('docx');

const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} = docx;

function createSectionHeading(titleText) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 280, after: 120 },
    border: {
      bottom: {
        color: '2563EB', // Royal Blue accent line
        space: 4,
        style: BorderStyle.SINGLE,
        size: 12,
      },
    },
    children: [
      new TextRun({
        text: titleText,
        bold: true,
        size: 24, // 12pt
        color: '1E3A8A', // Deep Navy
        font: 'Calibri',
      }),
    ],
  });
}

async function buildPolishedTemplate() {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1080, // 0.75 inch
              bottom: 1080,
              left: 1080,
              right: 1080,
            },
          },
        },
        children: [
          // ── HEADER (Personal Information) ──
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 120 },
            children: [
              new TextRun({
                text: '{{full_name}}',
                bold: true,
                size: 44, // 22pt
                color: '0F172A',
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'Phone: ', bold: true, size: 20, color: '334155', font: 'Calibri' }),
              new TextRun({ text: '{{phone}}   |   ', size: 20, color: '334155', font: 'Calibri' }),
              new TextRun({ text: 'Email: ', bold: true, size: 20, color: '334155', font: 'Calibri' }),
              new TextRun({ text: '{{email}}   |   ', size: 20, color: '334155', font: 'Calibri' }),
              new TextRun({ text: 'Location: ', bold: true, size: 20, color: '334155', font: 'Calibri' }),
              new TextRun({ text: '{{location}}', size: 20, color: '334155', font: 'Calibri' }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({ text: 'GitHub: ', bold: true, size: 20, color: '334155', font: 'Calibri' }),
              new TextRun({ text: '{{github}}   |   ', size: 20, color: '334155', font: 'Calibri' }),
              new TextRun({ text: 'LinkedIn: ', bold: true, size: 20, color: '334155', font: 'Calibri' }),
              new TextRun({ text: '{{linkedin}}   |   ', size: 20, color: '334155', font: 'Calibri' }),
              new TextRun({ text: 'Website: ', bold: true, size: 20, color: '334155', font: 'Calibri' }),
              new TextRun({ text: '{{website}}', size: 20, color: '334155', font: 'Calibri' }),
            ],
          }),

          // ── SECTION 1: PROFESSIONAL SUMMARY ──
          createSectionHeading('PROFESSIONAL SUMMARY'),
          new Paragraph({
            spacing: { after: 180 },
            children: [
              new TextRun({
                text: '{{professional_summary}}',
                size: 21, // 10.5pt
                color: '334155',
                font: 'Calibri',
              }),
            ],
          }),

          // ── SECTION 2: TECHNICAL SKILLS ──
          createSectionHeading('TECHNICAL SKILLS'),
          new Paragraph({
            spacing: { after: 180 },
            children: [
              new TextRun({
                text: '{{skills}}',
                size: 21,
                color: '334155',
                font: 'Calibri',
              }),
            ],
          }),

          // ── SECTION 3: WORK EXPERIENCE ──
          createSectionHeading('WORK EXPERIENCE'),
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({ text: 'Company: ', bold: true, size: 21, color: '1E293B', font: 'Calibri' }),
              new TextRun({ text: '{{experience_company}}', bold: true, size: 21, color: '1E293B', font: 'Calibri' }),
              new TextRun({ text: '   |   Role: ', bold: true, size: 21, color: '1E293B', font: 'Calibri' }),
              new TextRun({ text: '{{experience_role}}', size: 21, color: '1E293B', font: 'Calibri' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'Duration: ', bold: true, size: 20, color: '475569', font: 'Calibri' }),
              new TextRun({ text: '{{experience_start_date}} - {{experience_end_date}}', size: 20, color: '475569', font: 'Calibri' }),
              new TextRun({ text: '   |   Technologies: ', bold: true, size: 20, color: '475569', font: 'Calibri' }),
              new TextRun({ text: '{{experience_technologies}}', size: 20, color: '475569', font: 'Calibri' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 180 },
            children: [
              new TextRun({ text: 'Description: ', bold: true, size: 21, color: '334155', font: 'Calibri' }),
              new TextRun({ text: '{{experience_description}}', size: 21, color: '334155', font: 'Calibri' }),
            ],
          }),

          // ── SECTION 4: EDUCATION ──
          createSectionHeading('EDUCATION'),
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({ text: 'Degree: ', bold: true, size: 21, color: '1E293B', font: 'Calibri' }),
              new TextRun({ text: '{{education_degree}}', bold: true, size: 21, color: '1E293B', font: 'Calibri' }),
              new TextRun({ text: '   |   Institution: ', bold: true, size: 21, color: '1E293B', font: 'Calibri' }),
              new TextRun({ text: '{{education_institution}}', size: 21, color: '1E293B', font: 'Calibri' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'Duration: ', bold: true, size: 20, color: '475569', font: 'Calibri' }),
              new TextRun({ text: '{{education_start_year}} - {{education_end_year}}', size: 20, color: '475569', font: 'Calibri' }),
              new TextRun({ text: '   |   CGPA: ', bold: true, size: 20, color: '475569', font: 'Calibri' }),
              new TextRun({ text: '{{education_cgpa}}', size: 20, color: '475569', font: 'Calibri' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 180 },
            children: [
              new TextRun({ text: 'Details: ', bold: true, size: 21, color: '334155', font: 'Calibri' }),
              new TextRun({ text: '{{education_details}}', size: 21, color: '334155', font: 'Calibri' }),
            ],
          }),

          // ── SECTION 5: PROJECTS ──
          createSectionHeading('PROJECTS'),
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({ text: 'Project Name: ', bold: true, size: 21, color: '1E293B', font: 'Calibri' }),
              new TextRun({ text: '{{project_name}}', bold: true, size: 21, color: '1E293B', font: 'Calibri' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({ text: 'Description: ', bold: true, size: 21, color: '334155', font: 'Calibri' }),
              new TextRun({ text: '{{project_description}}', size: 21, color: '334155', font: 'Calibri' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({ text: 'Technologies Used: ', bold: true, size: 20, color: '475569', font: 'Calibri' }),
              new TextRun({ text: '{{project_technologies}}', size: 20, color: '475569', font: 'Calibri' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 180 },
            children: [
              new TextRun({ text: 'Project URL: ', bold: true, size: 20, color: '2563EB', font: 'Calibri' }),
              new TextRun({ text: '{{project_url}}', size: 20, color: '2563EB', font: 'Calibri' }),
            ],
          }),

          // ── SECTION 6: CERTIFICATIONS ──
          createSectionHeading('CERTIFICATIONS'),
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({ text: 'Certification Name: ', bold: true, size: 21, color: '1E293B', font: 'Calibri' }),
              new TextRun({ text: '{{certification_name}}', bold: true, size: 21, color: '1E293B', font: 'Calibri' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'Issuer: ', bold: true, size: 20, color: '475569', font: 'Calibri' }),
              new TextRun({ text: '{{certification_issuer}}', size: 20, color: '475569', font: 'Calibri' }),
              new TextRun({ text: '   |   Issue Date: ', bold: true, size: 20, color: '475569', font: 'Calibri' }),
              new TextRun({ text: '{{certification_issue_date}}', size: 20, color: '475569', font: 'Calibri' }),
              new TextRun({ text: '   |   Expiry Date: ', bold: true, size: 20, color: '475569', font: 'Calibri' }),
              new TextRun({ text: '{{certification_expiry_date}}', size: 20, color: '475569', font: 'Calibri' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 180 },
            children: [
              new TextRun({ text: 'Details: ', bold: true, size: 21, color: '334155', font: 'Calibri' }),
              new TextRun({ text: '{{certification_details}}', size: 21, color: '334155', font: 'Calibri' }),
            ],
          }),

          // ── SECTION 7: ADDITIONAL INFORMATION ──
          createSectionHeading('ADDITIONAL INFORMATION'),
          new Paragraph({
            spacing: { after: 180 },
            children: [
              new TextRun({
                text: '{{additional_information}}',
                size: 21,
                color: '334155',
                font: 'Calibri',
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  
  const polishedPath = path.join(__dirname, '..', 'input data', 'Academic_Universe_Semantic_Resume_Template_v2_polished.docx');
  fs.writeFileSync(polishedPath, buffer);
  console.log('Successfully written polished template to:', polishedPath);

  const targets = [
    'Academic_Universe_Semantic_Resume_Template_v2.docx',
    'Academic_Universe_Resume_Template_v1.docx',
    'Academic_Universe_Official_Resume_Template_v1_0.docx',
    'Academic_Universe_Official_Resume_Template_v2_0.docx',
    'Academic_Universe_Official_Resume_Template_v3_0.docx',
    'Academic_Universe_Official_Resume_Template_v4_0.docx',
  ];

  for (const t of targets) {
    const p = path.join(__dirname, '..', 'input data', t);
    try {
      fs.writeFileSync(p, buffer);
      console.log('Successfully updated:', t);
    } catch (e) {
      console.warn('Could not write to', t, ':', e.message);
    }
  }
}

buildPolishedTemplate().catch(console.error);
