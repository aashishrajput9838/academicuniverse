const https = require('https');

const key = process.env.ANTHROPIC_API_KEY;
console.log("Testing ANTHROPIC_API_KEY:", key ? key.slice(0, 15) + '...' : 'NONE');

if (!key) process.exit(1);

const body = JSON.stringify({
  model: "claude-3-haiku-20240307",
  max_tokens: 100,
  messages: [{ role: "user", content: "Hello" }]
});

const req = https.request({
  hostname: "api.anthropic.com",
  path: "/v1/messages",
  method: "POST",
  headers: {
    "x-api-key": key,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
    "content-length": Buffer.byteLength(body)
  }
}, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log("Anthropic HTTP Status:", res.statusCode);
    console.log("Response:", data.slice(0, 300));
  });
});

req.on('error', err => console.error("Error:", err.message));
req.write(body);
req.end();
