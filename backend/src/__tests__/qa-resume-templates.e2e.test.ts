import { DocxTemplateFiller } from '../services/docxTemplateFiller.service';
import { DetectedSection } from '../services/milestone2.types';
import * as fs from 'fs';
import * as path from 'path';

describe('END TO END: Resume Template Validation', () => {
  const filler = new DocxTemplateFiller();

  const templates = [
    'input data/Academic_Universe_Resume_Template_v1.docx',
    'input data/Academic_Universe_Official_Resume_Template_v1_0.docx',
    'input data/Academic_Universe_Official_Resume_Template_v2_0.docx',
    'input data/Academic_Universe_Official_Resume_Template_v3_0.docx',
    'input data/Academic_Universe_Official_Resume_Template_v4_0.docx',
  ];

  const schema: DetectedSection[] = [
    {
      id: 'personal',
      title: 'Personal',
      order: 0,
      repeatable: false,
      fields: [
        { key: 'name', label: 'Name', type: 'text', required: true, aiEnhanceable: true },
        { key: 'email', label: 'Email', type: 'email', required: true, aiEnhanceable: true },
        { key: 'phone', label: 'Phone', type: 'phone', required: true, aiEnhanceable: true },
        { key: 'url', label: 'URL', type: 'url', required: false, aiEnhanceable: true },
        { key: 'text', label: 'Text', type: 'textarea', required: false, aiEnhanceable: true },
        { key: 'category', label: 'Category', type: 'text', required: false, aiEnhanceable: true },
        { key: 'items', label: 'Items', type: 'list', required: false, aiEnhanceable: true },
        { key: 'company', label: 'Company', type: 'text', required: false, aiEnhanceable: true },
        { key: 'role', label: 'Role', type: 'text', required: false, aiEnhanceable: true },
        { key: 'duration', label: 'Duration', type: 'text', required: false, aiEnhanceable: true },
        { key: 'degree', label: 'Degree', type: 'text', required: false, aiEnhanceable: true },
        { key: 'institution', label: 'Institution', type: 'text', required: false, aiEnhanceable: true },
        { key: 'year', label: 'Year', type: 'text', required: false, aiEnhanceable: true },
        { key: 'project_name', label: 'Project Name', type: 'text', required: false, aiEnhanceable: true },
        { key: 'description', label: 'Description', type: 'textarea', required: false, aiEnhanceable: true },
        { key: 'tech_stack', label: 'Tech Stack', type: 'text', required: false, aiEnhanceable: true },
        { key: 'certification_name', label: 'Certification', type: 'text', required: false, aiEnhanceable: true },
        { key: 'issuer', label: 'Issuer', type: 'text', required: false, aiEnhanceable: true },
        { key: 'cert_date', label: 'Cert Date', type: 'date', required: false, aiEnhanceable: true },
      ],
    },
  ];

  const data = {
    name: 'Test User',
    email: 'test@example.com',
    phone: '1234567890',
    url: 'https://example.com',
    text: 'Sample text',
    category: 'Software',
    items: 'Item 1, Item 2',
    company: 'TestCorp',
    role: 'Engineer',
    duration: '2020-2023',
    degree: 'B.Tech',
    institution: 'Test University',
    year: '2023',
    project_name: 'Test Project',
    description: 'Test description',
    tech_stack: 'JavaScript, Python',
    certification_name: 'AWS Certified',
    issuer: 'Amazon',
    cert_date: '2023-01-01',
  };

  for (const file of templates) {
    it(`renders ${path.basename(file)}`, async () => {
      const buf = fs.readFileSync(file);
      const result = await filler.fill(buf, data, schema);
      expect(result.success).toBe(true);
      expect(result.docxBuffer.length).toBeGreaterThan(0);
      expect(result.issues).toHaveLength(0);
    });
  }
});
