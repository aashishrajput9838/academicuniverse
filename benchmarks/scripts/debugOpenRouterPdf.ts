import '../config/envLoader';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

async function testSingleDoc() {
  const filePath = path.join(__dirname, '..', 'dataset', 'Category_1_Marksheets', 'MS_PILOT_001.png');
  console.log('Testing file:', filePath, 'Exists:', fs.existsSync(filePath));
  if (!fs.existsSync(filePath)) return;

  const buf = fs.readFileSync(filePath);
  console.log('File size:', buf.length, 'bytes');
  console.log('Header text:', buf.slice(0, 50).toString('utf-8'));

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract student name.' },
              { type: 'image_url', image_url: { url: dataUrl } }
            ]
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Success:', response.status, response.data);
  } catch (err: unknown) {
    const e = err as { response?: { status: number; data: unknown } };
    console.error('OpenRouter 400 details:', e.response?.status, JSON.stringify(e.response?.data));
  }
}

testSingleDoc();
