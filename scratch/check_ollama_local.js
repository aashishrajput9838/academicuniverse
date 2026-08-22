const http = require('http');

http.get('http://localhost:11434/api/tags', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log("Ollama Local Status: ACTIVE (HTTP", res.statusCode, ")");
    try {
      const parsed = JSON.parse(data);
      console.log("Installed Local Ollama Models:");
      if (parsed.models) {
        parsed.models.forEach(m => console.log(" -", m.name));
      }
    } catch (e) {
      console.log("Raw output:", data);
    }
  });
}).on('error', (err) => {
  console.log("Ollama Local Status: NOT RUNNING (", err.message, ")");
});
