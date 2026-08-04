import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('No GEMINI_API_KEY found');
    return;
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    console.log('Listing available Gemini models...');
    const response = await ai.models.list();
    console.log('Models response:', JSON.stringify(response, null, 2));
  } catch (err: any) {
    console.error('List models error:', err.message || err);
  }
}

listModels();
