import dotenv from 'dotenv';
import path from 'path';
const envPath = process.env.NODE_ENV === 'development' ? '.env.development' : '.env';
dotenv.config({ path: path.resolve(__dirname, envPath) });

import { ResumeService } from './src/services/resumeService';

const templateUrl = 'https://res.cloudinary.com/demkeuigf/raw/upload/v1784825391/academicuniverse/templates/6a58b59aa8c379340d290b31/template_1784825389070_processed_1784825389069_template.docx';

async function main() {
  const service = new ResumeService();
  console.log('Calling processResumeTemplate with real Cloudinary URL...');
  try {
    const result = await service.processResumeTemplate(templateUrl, { name: 'Debug User' }, 'none', []);
    console.log('SUCCESS');
    console.log('DOCX size:', result.docxBuffer.length);
    console.log('HTML preview length:', result.htmlPreview.length);
  } catch (err) {
    console.error('FAILED:', err);
  }
}

main();
