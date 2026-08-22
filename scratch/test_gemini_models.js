const https = require('https');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../backend/.env.development') });

const apiKey = process.env.GEMINI_API_KEY;
console.log("Using GEMINI_API_KEY:", apiKey ? apiKey.slice(0, 10) + '...' : 'NONE');

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log("HTTP Status:", res.statusCode);
    if (res.statusCode === 200) {
      const parsed = JSON.parse(data);
      console.log("Available Gemini Models:");
      parsed.models.forEach(m => {
        if (m.name.includes('flash') || m.name.includes('vision') || m.name.includes('2')) {
          console.log(` - ${m.name} (${m.displayName})`);
        }
      });
    } else {
      console.log("Error Response:", data);
    }
  });
}).on('error', err => {
  console.error("Network Error:", err.message);
});
