const fetch = global.fetch || require('node-fetch');
const token = process.env.FIREBASE_ID_TOKEN;
if (!token) {
  console.error('FIREBASE_ID_TOKEN env var required');
  process.exit(1);
}
const baseUrl = 'http://localhost:10000/api/gmail';

const api = async (path, opts = {}) => {
  const res = await fetch(`${baseUrl}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const payload = await res.text();
  let body;
  try { body = JSON.parse(payload); } catch { body = payload; }
  return { status: res.status, body };
};

(async () => {
  try {
    console.log('Gmail status...');
    const status = await api('/status');
    console.log('status', status);

    console.log('Gmail stats...');
    const stats = await api('/stats');
    console.log('stats', stats);

    console.log('Listing messages...');
    const list = await api('/messages?maxResults=5');
    console.log('list', JSON.stringify(list, null, 2));

    const messageId = list.body?.data?.messages?.[0]?.id;
    if (messageId) {
      console.log('Fetching message detail', messageId);
      const detail = await api(`/messages/${messageId}`);
      console.log('detail', JSON.stringify(detail, null, 2));
    } else {
      console.log('No messages returned to fetch detail');
    }
  } catch (err) {
    console.error('Error during API test:', err);
  }
})();
