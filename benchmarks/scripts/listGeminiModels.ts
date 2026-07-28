import '../config/envLoader';
import axios from 'axios';

async function main() {
  const key = process.env.GEMINI_API_KEY;
  try {
    const res = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    console.log('Available models:');
    const models = res.data.models || [];
    models.forEach((m: { name: string; supportedGenerationMethods?: string[] }) => {
      if (m.supportedGenerationMethods?.includes('generateContent')) {
        console.log(' -', m.name);
      }
    });
  } catch (err: unknown) {
    const e = err as { response?: { status: number; data: unknown }; message?: string };
    console.error('ListModels error:', e.response?.status, JSON.stringify(e.response?.data || e.message));
  }
}

main();
