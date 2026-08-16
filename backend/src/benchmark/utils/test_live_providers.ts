import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../.env.development') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { OpenRouterAIProvider } from '../../core/ai/openrouter.provider';
import { GeminiAIProvider } from '../../core/ai/gemini.provider';
import { AdbgGroundTruthAdapter } from '../adapters/AdbgGroundTruthAdapter';

async function testProviders() {
  const datasetDir = path.resolve(__dirname, '../../../../ADBG/AU_DIC_Benchmark_v1.0');
  const gtAdapter = new AdbgGroundTruthAdapter();
  const sample = gtAdapter.loadGroundTruth('groundtruth/DOC-00DFAED9_clean.json', datasetDir);

  const prompt = `Extract student_name, roll_number, degree_name, and subjects array from this student document image.`;
  const imageBase64 = sample.pngPath ? require('fs').readFileSync(path.resolve(datasetDir, sample.pngPath)).toString('base64') : '';

  console.log('--- TESTING OPENROUTER AI PROVIDER ---');
  if (process.env.OPENROUTER_API_KEY) {
    const openrouter = new OpenRouterAIProvider();
    const modelsToTest = ['openai/gpt-4o-mini', 'google/gemini-2.0-flash-001', 'meta-llama/llama-3.2-11b-vision-instruct:free'];
    for (const m of modelsToTest) {
      try {
        console.log(`Testing OpenRouter model: ${m}...`);
        const res = await openrouter.generateVisionJSON(prompt, imageBase64, 'image/png', {
          model: m,
          systemInstruction: 'Output valid JSON with student_name and subjects.',
          temperature: 0.1,
        });
        console.log(`✅ OpenRouter model ${m} SUCCESS! Result preview:`, JSON.stringify(res).slice(0, 200));
        return { provider: 'OpenRouter', model: m, result: res };
      } catch (err: any) {
        console.log(`❌ OpenRouter model ${m} FAILED:`, err.message || err);
      }
    }
  }

  console.log('\n--- TESTING GEMINI AI PROVIDER ---');
  if (process.env.GEMINI_API_KEY) {
    const gemini = new GeminiAIProvider();
    const modelsToTest = ['gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-2.5-flash'];
    for (const m of modelsToTest) {
      try {
        console.log(`Testing Gemini model: ${m}...`);
        const res = await gemini.generateVisionJSON(prompt, imageBase64, 'image/png', {
          model: m,
          systemInstruction: 'Output valid JSON with student_name and subjects.',
          temperature: 0.1,
        });
        console.log(`✅ Gemini model ${m} SUCCESS! Result preview:`, JSON.stringify(res).slice(0, 200));
        return { provider: 'Gemini', model: m, result: res };
      } catch (err: any) {
        console.log(`❌ Gemini model ${m} FAILED:`, err.message || err);
      }
    }
  }

  console.log('\n❌ All live vision provider attempts failed.');
}

testProviders().catch(console.error);
