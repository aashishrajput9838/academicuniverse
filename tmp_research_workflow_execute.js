const fetch = globalThis.fetch || require('node-fetch');
const baseUrl = 'http://localhost:10000';

async function post(path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (err) {
    json = text;
  }
  return { status: res.status, statusText: res.statusText, headers: Object.fromEntries(res.headers.entries()), body: json, rawBody: text };
}

async function run() {
  console.log('STEP: generateTopics');
  const topicsResp = await post('/api/research/topics', { domain: 'academic resilience runtime validation test' });
  console.log(JSON.stringify({ step: 'topics', request: { domain: 'academic resilience runtime validation test' }, response: topicsResp }, null, 2));
  if (topicsResp.status !== 200) {
    process.exit(1);
  }
  const topics = topicsResp.body?.topics;
  if (!Array.isArray(topics) || topics.length === 0) {
    console.error('No topics returned');
    process.exit(1);
  }

  const topic = topics[0];
  console.log('STEP: generateOutline');
  const outlineResp = await post('/api/research/outline', { topic });
  console.log(JSON.stringify({ step: 'outline', request: { topic }, response: outlineResp }, null, 2));
  if (outlineResp.status !== 200) {
    process.exit(1);
  }
  const outline = outlineResp.body?.outline;
  if (!Array.isArray(outline) || outline.length === 0) {
    console.error('No outline returned');
    process.exit(1);
  }

  const draftText = `Research topic: ${topic}. Outline: ${JSON.stringify(outline)}.`;
  console.log('STEP: improveContent');
  const improveResp = await post('/api/research/improve', { text: draftText });
  console.log(JSON.stringify({ step: 'improve', request: { text: draftText }, response: improveResp }, null, 2));
  if (improveResp.status !== 200) {
    process.exit(1);
  }
  const improvedText = improveResp.body?.improvedText;
  if (!improvedText) {
    console.error('No improvedText returned');
    process.exit(1);
  }

  console.log('STEP: generateAbstract');
  const abstractResp = await post('/api/research/abstract', { content: improvedText });
  console.log(JSON.stringify({ step: 'abstract', request: { contentPreview: improvedText.slice(0, 200) }, response: abstractResp }, null, 2));
  if (abstractResp.status !== 200) {
    process.exit(1);
  }
  const abstract = abstractResp.body?.abstract;
  if (!abstract) {
    console.error('No abstract returned');
    process.exit(1);
  }

  console.log('STEP: generateCitations');
  const citationsResp = await post('/api/research/citations', { details: `Title: ${topic}. Summary: ${abstract.slice(0, 120)}.` });
  console.log(JSON.stringify({ step: 'citations', request: { details: `Title: ${topic}. Summary: ${abstract.slice(0, 120)}.` }, response: citationsResp }, null, 2));
  if (citationsResp.status !== 200) {
    process.exit(1);
  }
  const citations = citationsResp.body?.citations;
  if (!citations) {
    console.error('No citations returned');
    process.exit(1);
  }

  console.log('STEP: finalPaper');
  const finalPaper = {
    topic,
    outline,
    improvedText,
    abstract,
    citations,
  };
  console.log(JSON.stringify({ step: 'finalPaper', finalPaper }, null, 2));
}

run().catch((err) => {
  console.error('UNCAUGHT_ERROR', err);
  process.exit(1);
});
