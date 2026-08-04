import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const { GroqAIProvider } = require('../../core/ai/groq.provider');

async function testGroq() {
  console.log('Testing GROQ_API_KEY:', process.env.GROQ_API_KEY ? 'FOUND' : 'MISSING');
  const provider = new GroqAIProvider();

  try {
    const res = await provider.generateJSON('Analyze simple test document: Student Name: Trisha Das, Roll: 2021IT000150', {
      systemInstruction: 'Return valid JSON with {"documentCategory": "CERTIFICATE", "confidenceScore": 0.99, "summary": "Groq Llama 3.3 Test", "extractedEntities": {"candidateName": "Trisha Das"}}',
      temperature: 0.1,
    });
    console.log('LIVE GROQ LLAMA 3.3 RESPONSE SUCCESSFUL:');
    console.log(JSON.stringify(res, null, 2));
  } catch (err: any) {
    console.error('LIVE GROQ ERROR:', err.response?.data || err.message);
  }
}

testGroq();
