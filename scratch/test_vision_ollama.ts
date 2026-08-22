import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

const workspace = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(workspace, '.env.local') });

import { OllamaAIProvider } from '../backend/src/core/ai/ollama.provider';

async function main() {
  console.log("Testing Ollama Vision API on a real benchmark image...");
  const provider = new OllamaAIProvider();
  console.log("Ollama Available:", provider.isAvailable());

  const sampleImagePath = path.join(workspace, 'ADBG', 'AU_DIC_Benchmark_v1.0', 'images', 'clean', 'png', 'certificates', 'DOC-05582167_clean.png');
  
  if (!fs.existsSync(sampleImagePath)) {
    console.error("Image not found at:", sampleImagePath);
    return;
  }

  const imageBase64 = fs.readFileSync(sampleImagePath).toString('base64');
  console.log(`Loaded image (size: ${imageBase64.length} chars). Sending to Ollama minicpm-v...`);

  const start = Date.now();
  try {
    const res = await provider.generateVisionJSON(
      "Extract all text fields from this certificate image into JSON format.",
      imageBase64,
      'image/png',
      {
        model: 'minicpm-v',
        systemInstruction: 'You are a document intelligence engine. Return JSON with extractedEntities object.'
      }
    );
    console.log(`SUCCESS (${((Date.now() - start)/1000).toFixed(1)}s):`);
    console.log(JSON.stringify(res, null, 2).slice(0, 1000));
  } catch (err: any) {
    console.error("ERROR:", err.message || err);
  }
}

main();
