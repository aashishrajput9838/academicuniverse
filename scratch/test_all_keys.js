const dotenv = require('dotenv');
const path = require('path');
const https = require('https');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../backend/.env.development') });

console.log("=== API KEY AUDIT ===");
console.log("GEMINI_API_KEY:    ", process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.slice(0, 12) + '...' : 'MISSING');
console.log("OPENROUTER_API_KEY:", process.env.OPENROUTER_API_KEY ? process.env.OPENROUTER_API_KEY.slice(0, 12) + '...' : 'MISSING');
console.log("GROQ_API_KEY:      ", process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.slice(0, 12) + '...' : 'MISSING');
console.log("OLLAMA_ENABLED:    ", process.env.OLLAMA_ENABLED);
console.log("OLLAMA_VISION_MODEL:", process.env.OLLAMA_VISION_MODEL);

// Test Gemini key
if (process.env.GEMINI_API_KEY) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
  const body = JSON.stringify({ contents: [{ parts: [{ text: "Hello" }] }] });
  
  const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      console.log("\n[Gemini gemini-1.5-flash Test] HTTP Status:", res.statusCode);
      if (res.statusCode === 200) console.log("Gemini status: VALID!");
      else console.log("Gemini error:", data.slice(0, 300));
    });
  });
  req.write(body);
  req.end();
}

// Test Groq key
if (process.env.GROQ_API_KEY) {
  const groqKey = process.env.GROQ_API_KEY;
  const url = `https://api.groq.com/openai/v1/models`;
  const req = https.request(url, { method: 'GET', headers: { 'Authorization': `Bearer ${groqKey}` } }, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      console.log("\n[Groq API Test] HTTP Status:", res.statusCode);
      if (res.statusCode === 200) console.log("Groq status: VALID!");
      else console.log("Groq error:", data.slice(0, 300));
    });
  });
  req.end();
}
