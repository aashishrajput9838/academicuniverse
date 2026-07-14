const { MockAIProvider } = require('./src/core/ai/mock.provider');
(async () => {
  const provider = new MockAIProvider();
  const prompt = `Rewrite the paragraph below into a stronger academic version.

Requirements:
1. Rewrite rather than copy the original wording.
2. Improve grammar, sentence structure, vocabulary, and scholarly tone.
3. Remove repetition and filler.
4. Preserve the original technical meaning and intent.
5. Return exactly one polished paragraph.
6. Output ONLY the improved paragraph with no explanation, preface, headings, or notes.

Original text: "Artificial intelligence is transforming healthcare through improved diagnostics, treatment personalization, and evidence-based clinical decision support."`;
  try {
    const result = await provider.generateJSON(prompt);
    console.log('RESULT', JSON.stringify(result));
  } catch (err) {
    console.log('ERROR', err.message);
    process.exitCode = 1;
  }
})();
