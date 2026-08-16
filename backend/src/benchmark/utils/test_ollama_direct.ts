import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

async function testOllamaDirect() {
  const imgPath = path.resolve(__dirname, '../../../../ADBG/AU_DIC_Benchmark_v1.0/images/clean/png/student_ids/DOC-00DFAED9_clean.png');
  const imgBase64 = fs.readFileSync(imgPath).toString('base64');

  console.log('Sending request to Ollama minicpm-v...');
  try {
    const res = await axios.post('http://localhost:11434/api/chat', {
      model: 'minicpm-v',
      messages: [
        {
          role: 'user',
          content: 'Extract student details from this image as JSON.',
          images: [imgBase64]
        }
      ],
      stream: false
    }, { timeout: 120000 });

    console.log('Ollama Response Content:\n', res.data?.message?.content);
  } catch (err: any) {
    console.error('Ollama Direct Error:', err.response?.data || err.message);
  }
}

testOllamaDirect();
