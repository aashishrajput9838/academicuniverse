const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../backend/.env.development') });

console.log("GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.slice(0, 10) + '...' : 'NONE');
console.log("OPENROUTER_API_KEY:", process.env.OPENROUTER_API_KEY ? process.env.OPENROUTER_API_KEY.slice(0, 10) + '...' : 'NONE');
console.log("GROQ_API_KEY:", process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.slice(0, 10) + '...' : 'NONE');

// Test Gemini provider
const { GeminiAIProvider } = require('../backend/dist/src/core/ai/gemini.provider');
const gemini = new GeminiAIProvider();
console.log("Gemini isAvailable:", gemini.isAvailable());

// Test calling Gemini API directly
async function testGemini() {
  try {
    const res = await gemini.generateContent("Hello, respond with JSON {\"status\": \"ok\"}", { responseFormat: 'json' });
    console.log("Gemini direct test SUCCESS:", res.text.slice(0, 100));
  } catch (err) {
    console.error("Gemini direct test ERROR:", err.message);
  }
}

testGemini();
