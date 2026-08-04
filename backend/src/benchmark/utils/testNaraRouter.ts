import axios from 'axios';

async function testNara() {
  const apiKey = 'sk-nry-gsTSRbZjL7xunLNmYHUSUdNYwL9acO0oFU3x5hcwrp8';
  const url = 'https://router.bynara.id/v1/chat/completions';

  try {
    const res = await axios.post(
      url,
      {
        model: 'mistral-medium-3-5',
        messages: [
          { role: 'system', content: 'Return valid JSON.' },
          { role: 'user', content: 'Return a JSON with {"status": "ok", "message": "Nara Router Connected!"}' },
        ],
        temperature: 0.1,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    console.log('Nara Router Test Success!');
    console.log('Response:', JSON.stringify(res.data, null, 2));
  } catch (err: any) {
    console.error('Nara OpenAI Endpoint failed:', err.response?.data || err.message);

    // Try Anthropic format endpoint
    try {
      console.log('Trying Anthropic endpoint https://router.bynara.id/v1/messages...');
      const anthropicRes = await axios.post(
        'https://router.bynara.id/v1/messages',
        {
          model: 'mistral-medium-3-5',
          max_tokens: 1000,
          messages: [{ role: 'user', content: 'Return a JSON with {"status": "ok"}' }],
        },
        {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );
      console.log('Nara Anthropic Endpoint Success!');
      console.log('Response:', JSON.stringify(anthropicRes.data, null, 2));
    } catch (aErr: any) {
      console.error('Nara Anthropic Endpoint failed:', aErr.response?.data || aErr.message);
    }
  }
}

testNara();
