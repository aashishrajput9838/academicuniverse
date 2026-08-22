const http = require('http');

const body = JSON.stringify({
  model: 'minicpm-v',
  messages: [
    { role: 'user', content: 'Respond in JSON with {"status": "ok", "message": "Ollama local vision model minicpm-v active"}' }
  ],
  format: 'json',
  stream: false
});

const req = http.request({
  hostname: 'localhost',
  port: 11434,
  path: '/api/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log("Ollama minicpm-v test HTTP Status:", res.statusCode);
    console.log("Response:", data);
  });
});

req.on('error', err => {
  console.error("Ollama minicpm-v Error:", err.message);
});

req.write(body);
req.end();
