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
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  VerticalAlign,
} = docx;

// Helper for section headings with bottom accent border
function createHeading(titleText, color = '1E3A8A', borderColor = '2563EB', fontSize = 24) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 260, after: 120 },
    border: borderColor ? {
      bottom: {
        color: borderColor,
        space: 4,
        style: BorderStyle.SINGLE,
        size: 12,
      },
    } : undefined,
    children: [
      new TextRun({
        text: titleText,
        bold: true,
        size: fontSize,
        color: color,
        font: 'Calibri',
      }),
    ],
  });
}

// ----------------------------------------------------
// TEMPLATE 1: Modern ATS Professional (Single Column)
// ----------------------------------------------------
async function buildTemplate1() {
  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } } },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 120 },
          children: [new TextRun({ text: '{{full_name}}', bold: true, size: 44, color: '0F172A', font: 'Calibri' })],
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

        createHeading('PROFESSIONAL SUMMARY', '1E3A8A', '2563EB'),
        new Paragraph({
          spacing: { after: 180 },
          children: [new TextRun({ text: '{{professional_summary}}', size: 21, color: '334155', font: 'Calibri' })],
        }),

        createHeading('TECHNICAL SKILLS', '1E3A8A', '2563EB'),
        new Paragraph({
          spacing: { after: 180 },
          children: [new TextRun({ text: '{{skills}}', size: 21, color: '334155', font: 'Calibri' })],
        }),

        createHeading('WORK EXPERIENCE', '1E3A8A', '2563EB'),
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

        createHeading('EDUCATION', '1E3A8A', '2563EB'),
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

        createHeading('PROJECTS', '1E3A8A', '2563EB'),
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

        createHeading('CERTIFICATIONS', '1E3A8A', '2563EB'),
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

        createHeading('ADDITIONAL INFORMATION', '1E3A8A', '2563EB'),
        new Paragraph({
          spacing: { after: 180 },
          children: [new TextRun({ text: '{{additional_information}}', size: 21, color: '334155', font: 'Calibri' })],
        }),
      ],
    }],
  });
  return Packer.toBuffer(doc);
}

// ----------------------------------------------------
// TEMPLATE 2: Modern Two-Column Layout (Word Table)
// ----------------------------------------------------
async function buildTemplate2() {
  const leftCellChildren = [
    new Paragraph({
      spacing: { before: 100, after: 100 },
      children: [new TextRun({ text: 'CONTACT', bold: true, size: 22, color: '0F172A', font: 'Arial' })],
    }),
    new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Phone:', bold: true, size: 18, color: '334155' }), new TextRun({ text: ' {{phone}}', size: 18 })] }),
    new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Email:', bold: true, size: 18, color: '334155' }), new TextRun({ text: ' {{email}}', size: 18 })] }),
    new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Location:', bold: true, size: 18, color: '334155' }), new TextRun({ text: ' {{location}}', size: 18 })] }),
    new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'GitHub:', bold: true, size: 18, color: '334155' }), new TextRun({ text: ' {{github}}', size: 18 })] }),
    new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'LinkedIn:', bold: true, size: 18, color: '334155' }), new TextRun({ text: ' {{linkedin}}', size: 18 })] }),
    new Paragraph({ spacing: { after: 140 }, children: [new TextRun({ text: 'Website:', bold: true, size: 18, color: '334155' }), new TextRun({ text: ' {{website}}', size: 18 })] }),

    new Paragraph({
      spacing: { before: 140, after: 100 },
      children: [new TextRun({ text: 'TECHNICAL SKILLS', bold: true, size: 22, color: '0F172A', font: 'Arial' })],
    }),
    new Paragraph({ spacing: { after: 140 }, children: [new TextRun({ text: '{{skills}}', size: 18, color: '334155' })] }),

    new Paragraph({
      spacing: { before: 140, after: 100 },
      children: [new TextRun({ text: 'CERTIFICATIONS', bold: true, size: 22, color: '0F172A', font: 'Arial' })],
    }),
    new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: 'Certification Name:', bold: true, size: 18 }), new TextRun({ text: ' {{certification_name}}', size: 18 })] }),
    new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: 'Issuer:', bold: true, size: 18 }), new TextRun({ text: ' {{certification_issuer}}', size: 18 })] }),
    new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: 'Issue Date:', bold: true, size: 18 }), new TextRun({ text: ' {{certification_issue_date}}', size: 18 }), new TextRun({ text: ' | Expiry:', bold: true, size: 18 }), new TextRun({ text: ' {{certification_expiry_date}}', size: 18 })] }),
    new Paragraph({ spacing: { after: 140 }, children: [new TextRun({ text: 'Details:', bold: true, size: 18 }), new TextRun({ text: ' {{certification_details}}', size: 18 })] }),

    new Paragraph({
      spacing: { before: 140, after: 100 },
      children: [new TextRun({ text: 'ADDITIONAL INFO', bold: true, size: 22, color: '0F172A', font: 'Arial' })],
    }),
    new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: '{{additional_information}}', size: 18, color: '334155' })] }),
  ];

  const rightCellChildren = [
    new Paragraph({
      spacing: { before: 100, after: 80 },
      children: [new TextRun({ text: '{{full_name}}', bold: true, size: 40, color: '0F172A', font: 'Arial' })],
    }),

    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 180, after: 80 },
      border: { bottom: { color: '475569', space: 2, style: BorderStyle.SINGLE, size: 8 } },
      children: [new TextRun({ text: 'PROFESSIONAL SUMMARY', bold: true, size: 22, color: '1E293B' })],
    }),
    new Paragraph({ spacing: { after: 140 }, children: [new TextRun({ text: '{{professional_summary}}', size: 20, color: '334155' })] }),

    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 180, after: 80 },
      border: { bottom: { color: '475569', space: 2, style: BorderStyle.SINGLE, size: 8 } },
      children: [new TextRun({ text: 'WORK EXPERIENCE', bold: true, size: 22, color: '1E293B' })],
    }),
    new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: 'Company:', bold: true, size: 20 }), new TextRun({ text: ' {{experience_company}} | ', size: 20 }), new TextRun({ text: 'Role:', bold: true, size: 20 }), new TextRun({ text: ' {{experience_role}}', size: 20 })] }),
    new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: 'Duration:', bold: true, size: 19 }), new TextRun({ text: ' {{experience_start_date}} - {{experience_end_date}} | ', size: 19 }), new TextRun({ text: 'Tech:', bold: true, size: 19 }), new TextRun({ text: ' {{experience_technologies}}', size: 19 })] }),
    new Paragraph({ spacing: { after: 140 }, children: [new TextRun({ text: 'Description:', bold: true, size: 20 }), new TextRun({ text: ' {{experience_description}}', size: 20 })] }),

    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 180, after: 80 },
      border: { bottom: { color: '475569', space: 2, style: BorderStyle.SINGLE, size: 8 } },
      children: [new TextRun({ text: 'EDUCATION', bold: true, size: 22, color: '1E293B' })],
    }),
    new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: 'Degree:', bold: true, size: 20 }), new TextRun({ text: ' {{education_degree}} | ', size: 20 }), new TextRun({ text: 'Institution:', bold: true, size: 20 }), new TextRun({ text: ' {{education_institution}}', size: 20 })] }),
    new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: 'Duration:', bold: true, size: 19 }), new TextRun({ text: ' {{education_start_year}} - {{education_end_year}} | ', size: 19 }), new TextRun({ text: 'CGPA:', bold: true, size: 19 }), new TextRun({ text: ' {{education_cgpa}}', size: 19 })] }),
    new Paragraph({ spacing: { after: 140 }, children: [new TextRun({ text: 'Details:', bold: true, size: 20 }), new TextRun({ text: ' {{education_details}}', size: 20 })] }),

    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 180, after: 80 },
      border: { bottom: { color: '475569', space: 2, style: BorderStyle.SINGLE, size: 8 } },
      children: [new TextRun({ text: 'PROJECTS', bold: true, size: 22, color: '1E293B' })],
    }),
    new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: 'Project Name:', bold: true, size: 20 }), new TextRun({ text: ' {{project_name}}', size: 20 })] }),
    new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: 'Description:', bold: true, size: 20 }), new TextRun({ text: ' {{project_description}}', size: 20 })] }),
    new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: 'Technologies Used:', bold: true, size: 19 }), new TextRun({ text: ' {{project_technologies}}', size: 19 })] }),
    new Paragraph({ spacing: { after: 140 }, children: [new TextRun({ text: 'Project URL:', bold: true, size: 19 }), new TextRun({ text: ' {{project_url}}', size: 19 })] }),
  ];

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 32, type: WidthType.PERCENTAGE },
            shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 140, right: 140 },
            children: leftCellChildren,
          }),
          new TableCell({
            width: { size: 68, type: WidthType.PERCENTAGE },
            margins: { top: 120, bottom: 120, left: 200, right: 140 },
            children: rightCellChildren,
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
      children: [table],
    }],
  });

  return Packer.toBuffer(doc);
}

// ----------------------------------------------------
// TEMPLATE 3: Corporate Executive Resume (Blue/Navy Theme)
// ----------------------------------------------------
async function buildTemplate3() {
  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } } },
      children: [
        // Executive Top Banner Table / Shaded Box
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.SINGLE, size: 12, color: '0F4C81' },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  shading: { fill: '0F4C81', type: ShadingType.CLEAR },
                  margins: { top: 240, bottom: 240, left: 240, right: 240 },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: '{{full_name}}', bold: true, size: 48, color: 'FFFFFF', font: 'Georgia' })],
                    }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 80 },
                      children: [
                        new TextRun({ text: 'Phone: {{phone}}  |  Email: {{email}}  |  Location: {{location}}', size: 19, color: 'E2E8F0', font: 'Calibri' }),
                      ],
                    }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 40 },
                      children: [
                        new TextRun({ text: 'GitHub: {{github}}  |  LinkedIn: {{linkedin}}  |  Website: {{website}}', size: 19, color: 'E2E8F0', font: 'Calibri' }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),

        createHeading('EXECUTIVE SUMMARY', '0F4C81', '0F4C81', 26),
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: '{{professional_summary}}', size: 22, color: '1E293B', font: 'Calibri' })],
        }),

        createHeading('TECHNICAL & LEADERSHIP SKILLS', '0F4C81', '0F4C81', 26),
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: '{{skills}}', size: 22, color: '1E293B', font: 'Calibri' })],
        }),

        createHeading('PROFESSIONAL EXPERIENCE', '0F4C81', '0F4C81', 26),
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: 'Company: ', bold: true, size: 22, color: '0F4C81', font: 'Georgia' }),
            new TextRun({ text: '{{experience_company}}', bold: true, size: 22, color: '0F4C81', font: 'Georgia' }),
            new TextRun({ text: '    — Role: ', bold: true, size: 22, color: '1E293B', font: 'Calibri' }),
            new TextRun({ text: '{{experience_role}}', size: 22, color: '1E293B', font: 'Calibri' }),
          ],
        }),
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: 'Duration: ', bold: true, size: 20, color: '475569', font: 'Calibri' }),
            new TextRun({ text: '{{experience_start_date}} to {{experience_end_date}}   |   Core Tech: ', size: 20, color: '475569', font: 'Calibri' }),
            new TextRun({ text: '{{experience_technologies}}', size: 20, color: '475569', font: 'Calibri' }),
          ],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({ text: 'Key Achievements & Responsibilities: ', bold: true, size: 21, color: '334155', font: 'Calibri' }),
            new TextRun({ text: '{{experience_description}}', size: 21, color: '334155', font: 'Calibri' }),
          ],
        }),

        createHeading('EDUCATION', '0F4C81', '0F4C81', 26),
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: 'Degree: ', bold: true, size: 22, color: '0F4C81', font: 'Georgia' }),
            new TextRun({ text: '{{education_degree}}', bold: true, size: 22, color: '0F4C81', font: 'Georgia' }),
            new TextRun({ text: '    — Institution: ', bold: true, size: 22, color: '1E293B', font: 'Calibri' }),
            new TextRun({ text: '{{education_institution}}', size: 22, color: '1E293B', font: 'Calibri' }),
          ],
        }),
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: 'Graduation Timeline: ', bold: true, size: 20, color: '475569', font: 'Calibri' }),
            new TextRun({ text: '{{education_start_year}} - {{education_end_year}}   |   CGPA: ', size: 20, color: '475569', font: 'Calibri' }),
            new TextRun({ text: '{{education_cgpa}}', size: 20, color: '475569', font: 'Calibri' }),
          ],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({ text: 'Specialization & Highlights: ', bold: true, size: 21, color: '334155', font: 'Calibri' }),
            new TextRun({ text: '{{education_details}}', size: 21, color: '334155', font: 'Calibri' }),
          ],
        }),

        createHeading('KEY PROJECTS', '0F4C81', '0F4C81', 26),
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: 'Project Name: ', bold: true, size: 22, color: '0F4C81', font: 'Georgia' }),
            new TextRun({ text: '{{project_name}}', bold: true, size: 22, color: '0F4C81', font: 'Georgia' }),
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
          spacing: { after: 200 },
          children: [
            new TextRun({ text: 'Project URL: ', bold: true, size: 20, color: '0F4C81', font: 'Calibri' }),
            new TextRun({ text: '{{project_url}}', size: 20, color: '0F4C81', font: 'Calibri' }),
          ],
        }),

        createHeading('EXECUTIVE CERTIFICATIONS', '0F4C81', '0F4C81', 26),
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: 'Certification Name: ', bold: true, size: 22, color: '0F4C81', font: 'Georgia' }),
            new TextRun({ text: '{{certification_name}}', bold: true, size: 22, color: '0F4C81', font: 'Georgia' }),
          ],
        }),
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: 'Issuer: ', bold: true, size: 20, color: '475569', font: 'Calibri' }),
            new TextRun({ text: '{{certification_issuer}}   |   Issue Date: ', size: 20, color: '475569', font: 'Calibri' }),
            new TextRun({ text: '{{certification_issue_date}}   |   Expiry Date: ', size: 20, color: '475569', font: 'Calibri' }),
            new TextRun({ text: '{{certification_expiry_date}}', size: 20, color: '475569', font: 'Calibri' }),
          ],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({ text: 'Details: ', bold: true, size: 21, color: '334155', font: 'Calibri' }),
            new TextRun({ text: '{{certification_details}}', size: 21, color: '334155', font: 'Calibri' }),
          ],
        }),

        createHeading('ADDITIONAL INFORMATION', '0F4C81', '0F4C81', 26),
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: '{{additional_information}}', size: 21, color: '334155', font: 'Calibri' })],
        }),
      ],
    }],
  });
  return Packer.toBuffer(doc);
}

// ----------------------------------------------------
// TEMPLATE 4: Minimal Elegant Resume (Light & Clean)
// ----------------------------------------------------
async function buildTemplate4() {
  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 1200, bottom: 1200, left: 1200, right: 1200 } } },
      children: [
        new Paragraph({
          spacing: { before: 0, after: 80 },
          children: [new TextRun({ text: '{{full_name}}', size: 40, color: '18181B', font: 'Calibri' })],
        }),
        new Paragraph({
          spacing: { after: 240 },
          border: { bottom: { color: 'E2E8F0', space: 6, style: BorderStyle.SINGLE, size: 6 } },
          children: [
            new TextRun({ text: 'Phone: {{phone}}   •   Email: {{email}}   •   Location: {{location}}\n', size: 19, color: '64748B', font: 'Calibri' }),
            new TextRun({ text: 'GitHub: {{github}}   •   LinkedIn: {{linkedin}}   •   Website: {{website}}', size: 19, color: '64748B', font: 'Calibri' }),
          ],
        }),

        new Paragraph({
          spacing: { before: 240, after: 80 },
          children: [new TextRun({ text: 'SUMMARY', size: 20, color: '64748B', font: 'Calibri', bold: true })],
        }),
        new Paragraph({
          spacing: { after: 240 },
          children: [new TextRun({ text: '{{professional_summary}}', size: 21, color: '334155', font: 'Calibri' })],
        }),

        new Paragraph({
          spacing: { before: 240, after: 80 },
          children: [new TextRun({ text: 'SKILLS', size: 20, color: '64748B', font: 'Calibri', bold: true })],
        }),
        new Paragraph({
          spacing: { after: 240 },
          children: [new TextRun({ text: '{{skills}}', size: 21, color: '334155', font: 'Calibri' })],
        }),

        new Paragraph({
          spacing: { before: 240, after: 80 },
          children: [new TextRun({ text: 'EXPERIENCE', size: 20, color: '64748B', font: 'Calibri', bold: true })],
        }),
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: 'Company: ', bold: true, size: 21, color: '18181B' }),
            new TextRun({ text: '{{experience_company}}   |   Role: ', size: 21, color: '18181B' }),
            new TextRun({ text: '{{experience_role}}', size: 21, color: '18181B' }),
          ],
        }),
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: 'Duration: {{experience_start_date}} - {{experience_end_date}}   •   Tech: {{experience_technologies}}', size: 19, color: '64748B' }),
          ],
        }),
        new Paragraph({
          spacing: { after: 240 },
          children: [
            new TextRun({ text: 'Description: ', bold: true, size: 20, color: '334155' }),
            new TextRun({ text: '{{experience_description}}', size: 20, color: '334155' }),
          ],
        }),

        new Paragraph({
          spacing: { before: 240, after: 80 },
          children: [new TextRun({ text: 'EDUCATION', size: 20, color: '64748B', font: 'Calibri', bold: true })],
        }),
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: 'Degree: ', bold: true, size: 21, color: '18181B' }),
            new TextRun({ text: '{{education_degree}}   |   Institution: ', size: 21, color: '18181B' }),
            new TextRun({ text: '{{education_institution}}', size: 21, color: '18181B' }),
          ],
        }),
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: 'Duration: {{education_start_year}} - {{education_end_year}}   •   CGPA: {{education_cgpa}}', size: 19, color: '64748B' }),
          ],
        }),
        new Paragraph({
          spacing: { after: 240 },
          children: [
            new TextRun({ text: 'Details: ', bold: true, size: 20, color: '334155' }),
            new TextRun({ text: '{{education_details}}', size: 20, color: '334155' }),
          ],
        }),

        new Paragraph({
          spacing: { before: 240, after: 80 },
          children: [new TextRun({ text: 'PROJECTS', size: 20, color: '64748B', font: 'Calibri', bold: true })],
        }),
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: 'Project Name: ', bold: true, size: 21, color: '18181B' }),
            new TextRun({ text: '{{project_name}}', size: 21, color: '18181B' }),
          ],
        }),
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: 'Description: ', bold: true, size: 20, color: '334155' }),
            new TextRun({ text: '{{project_description}}', size: 20, color: '334155' }),
          ],
        }),
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: 'Technologies Used: ', bold: true, size: 19, color: '64748B' }),
            new TextRun({ text: '{{project_technologies}}', size: 19, color: '64748B' }),
          ],
        }),
        new Paragraph({
          spacing: { after: 240 },
          children: [
            new TextRun({ text: 'Project URL: ', bold: true, size: 19, color: '2563EB' }),
            new TextRun({ text: '{{project_url}}', size: 19, color: '2563EB' }),
          ],
        }),

        new Paragraph({
          spacing: { before: 240, after: 80 },
          children: [new TextRun({ text: 'CERTIFICATIONS', size: 20, color: '64748B', font: 'Calibri', bold: true })],
        }),
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: 'Certification Name: ', bold: true, size: 21, color: '18181B' }),
            new TextRun({ text: '{{certification_name}}', size: 21, color: '18181B' }),
          ],
        }),
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: 'Issuer: {{certification_issuer}}   •   Issue Date: {{certification_issue_date}}   •   Expiry: {{certification_expiry_date}}', size: 19, color: '64748B' }),
          ],
        }),
        new Paragraph({
          spacing: { after: 240 },
          children: [
            new TextRun({ text: 'Details: ', bold: true, size: 20, color: '334155' }),
            new TextRun({ text: '{{certification_details}}', size: 20, color: '334155' }),
          ],
        }),

        new Paragraph({
          spacing: { before: 240, after: 80 },
          children: [new TextRun({ text: 'ADDITIONAL INFORMATION', size: 20, color: '64748B', font: 'Calibri', bold: true })],
        }),
        new Paragraph({
          spacing: { after: 240 },
          children: [new TextRun({ text: '{{additional_information}}', size: 21, color: '334155', font: 'Calibri' })],
        }),
      ],
    }],
  });
  return Packer.toBuffer(doc);
}

async function buildAllTemplates() {
  const dir = path.join(__dirname, '..', 'input data');

  const buf1 = await buildTemplate1();
  fs.writeFileSync(path.join(dir, 'template1_modern_ats_professional.docx'), buf1);
  console.log('Successfully created Template 1 (Modern ATS Professional)');

  const buf2 = await buildTemplate2();
  fs.writeFileSync(path.join(dir, 'template2_modern_two_column.docx'), buf2);
  console.log('Successfully created Template 2 (Modern Two-Column Resume)');

  const buf3 = await buildTemplate3();
  fs.writeFileSync(path.join(dir, 'template3_corporate_executive.docx'), buf3);
  console.log('Successfully created Template 3 (Corporate Executive Resume)');

  const buf4 = await buildTemplate4();
  fs.writeFileSync(path.join(dir, 'template4_minimal_elegant.docx'), buf4);
  console.log('Successfully created Template 4 (Minimal Elegant Resume)');
}

buildAllTemplates().catch(console.error);
