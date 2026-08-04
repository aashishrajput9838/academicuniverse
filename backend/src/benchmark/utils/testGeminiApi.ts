import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
process.env.GEMINI_DEFAULT_MODEL = 'gemini-1.5-flash';

const { aiProvider } = require('../../core/ai');

async function testGemini() {
  console.log('Testing Gemini API key:', process.env.GEMINI_API_KEY ? 'FOUND' : 'MISSING');
  try {
    const res = await aiProvider.generateJSON('Analyze simple test document: Hello World', {
      model: 'gemini-2.0-flash',
      systemInstruction: 'Return valid JSON with {"documentCategory": "CERTIFICATE", "confidenceScore": 0.99, "summary": "Test"}',
      temperature: 0.1,
    });
    console.log('LIVE GEMINI RESPONSE SUCCESSFUL:');
    console.log(JSON.stringify(res, null, 2));
  } catch (err: any) {
    console.error('LIVE GEMINI ERROR:', err.message || err);
  }
}

testGemini();
