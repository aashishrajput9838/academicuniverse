import http from 'http';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { ResumeService } from './src/services/resumeService';

const envPath = process.env.NODE_ENV === 'production' ? '.env' : '.env.development';
dotenv.config({ path: path.resolve(__dirname, envPath) });

const PORT = 8765;
const BACKEND_DIR = __dirname;
const TEMPLATE_FILE = 'test-rebuilt.docx';

const server = http.createServer((req, res) => {
  const filePath = path.join(BACKEND_DIR, req.url === '/' ? TEMPLATE_FILE : req.url!);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    res.end(data);
  });
});

async function main() {
  server.listen(PORT, async () => {
    console.log(`[DEBUG] HTTP server listening on port ${PORT}`);
    try {
      const service = new ResumeService();
      const templateUrl = `http://localhost:${PORT}/${TEMPLATE_FILE}`;
      console.log(`[DEBUG] Calling processResumeTemplate with ${templateUrl}`);
      const result = await service.processResumeTemplate(templateUrl, { name: 'Test User' }, 'none', []);
      console.log(`[DEBUG] DOCX buffer size: ${result.docxBuffer.length}`);
      console.log(`[DEBUG] HTML preview length: ${result.htmlPreview.length}`);
      console.log(`[DEBUG] Success!`);
    } catch (err) {
      console.error('[DEBUG] Error:', err);
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

main();
