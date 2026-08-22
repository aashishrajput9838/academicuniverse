import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../backend/.env.development') });

import { GeminiAIProvider } from '../backend/src/core/ai/gemini.provider';

async function testGemini() {
  console.log("Testing Gemini API directly with ts-node...");
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("GEMINI_API_KEY:", apiKey ? apiKey.slice(0, 10) + '...' : 'NONE');

  const gemini = new GeminiAIProvider();
  console.log("Gemini isAvailable:", gemini.isAvailable());

  try {
    const res = await gemini.generateContent("Hello! Please respond with JSON: {\"status\": \"ok\"}", { responseFormat: 'json' });
    console.log("Gemini SUCCESS:", res.text);
  } catch (err: any) {
    console.error("Gemini ERROR:", err.message || err);
    if (err.response) {
      console.error("HTTP Status:", err.response.status);
      console.error("Response data:", err.response.data);
    }
  }
}

testGemini();
