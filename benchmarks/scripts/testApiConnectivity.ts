/**
 * API Connectivity Test
 * Validates that both Gemini and OpenRouter keys work before running benchmarks.
 * Run: npx ts-node benchmarks/scripts/testApiConnectivity.ts
 */

import '../config/envLoader';
import axios from 'axios';

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';

async function testGemini(): Promise<void> {
  if (!GEMINI_KEY) {
    console.error('❌ GEMINI_API_KEY not set');
    return;
  }
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${GEMINI_KEY}`;
    const response = await axios.post(
      url,
      { contents: [{ parts: [{ text: 'Reply with exactly: CONNECTIVITY_OK' }] }] },
      { timeout: 20000 }
    );
    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    console.log(`✅ Gemini API: HTTP ${response.status} | Response: "${text}"`);
  } catch (err: unknown) {
    const e = err as { response?: { status: number; data: unknown }; message?: string };
    console.error(`❌ Gemini API FAIL: HTTP ${e.response?.status ?? 'N/A'} | ${JSON.stringify(e.response?.data ?? e.message)}`);
  }
}

async function testOpenRouter(): Promise<void> {
  if (!OPENROUTER_KEY) {
    console.error('❌ OPENROUTER_API_KEY not set');
    return;
  }
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: 'Reply with exactly: CONNECTIVITY_OK' }],
        max_tokens: 10
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://academicuniverse.com',
          'X-Title': 'Academic Universe Benchmark'
        },
        timeout: 20000
      }
    );
    const text = response.data?.choices?.[0]?.message?.content?.trim();
    console.log(`✅ OpenRouter API: HTTP ${response.status} | Response: "${text}"`);
  } catch (err: unknown) {
    const e = err as { response?: { status: number; data: unknown }; message?: string };
    console.error(`❌ OpenRouter API FAIL: HTTP ${e.response?.status ?? 'N/A'} | ${JSON.stringify(e.response?.data ?? e.message)}`);
  }
}

async function main(): Promise<void> {
  console.log('\n🔍 Academic Universe — API Connectivity Test');
  console.log('='.repeat(50));
  console.log(`  GEMINI_API_KEY:     ${GEMINI_KEY ? GEMINI_KEY.slice(0, 10) + '...' : '(not set)'}`);
  console.log(`  OPENROUTER_API_KEY: ${OPENROUTER_KEY ? OPENROUTER_KEY.slice(0, 12) + '...' : '(not set)'}`);
  console.log('='.repeat(50));

  await testGemini();
  await testOpenRouter();

  console.log('\nConnectivity test complete.\n');
}

main();
