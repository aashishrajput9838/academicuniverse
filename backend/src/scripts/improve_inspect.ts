(async () => {
  // Test-run script: inspect provider outputs for Improve with AI
  process.env.GEMINI_FORCE_FAIL = process.env.GEMINI_FORCE_FAIL || '1';
  // Provide a dummy Gemini API key so the Gemini provider initializes (test hook depends on initialized provider)
  process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'gem_test_key';

  // Import after env setup
  const { AIProviderFactory } = require('../core/ai/ai.factory');

  const provider = AIProviderFactory.getInstance().getDefaultProvider();

  const prompt = `Rewrite the paragraph below into a stronger academic version.\n\nRequirements:\n1. Rewrite rather than copy the original wording.\n2. Improve grammar, sentence structure, vocabulary, and scholarly tone.\n3. Remove repetition and filler.\n4. Preserve the original technical meaning and intent.\n5. Return exactly one polished paragraph.\n6. Output ONLY the improved paragraph with no explanation, preface, headings, or notes.\n\nOriginal text: "Artificial intelligence is transforming healthcare through improved diagnostics, treatment personalization, and evidence-based clinical decision support."`;

  console.log('== Provider instance ==');
  console.log(provider.getProviderName ? provider.getProviderName() : String(provider));

  try {
    console.log('\n== Calling generateContent() to get raw AIResponse ==');
    const raw = await provider.generateContent(prompt, {
      temperature: 0.35,
      maxTokens: 300,
      systemInstruction: 'You are an academic writing editor. Rewrite the paragraph into a stronger scholarly version while preserving meaning. Return only one paragraph, with no commentary or wrappers.'
    });
    console.log(JSON.stringify({ rawResponse: raw }, null, 2));
  } catch (err) {
    console.error('Error from generateContent():', (err as any)?.message ?? err);
  }

  try {
    console.log('\n== Calling generateJSON() to get parsed object ==');
    const parsed = await provider.generateJSON('{"improvedText":"dummy"}');
    console.log(JSON.stringify({ parsedDirectCall: parsed }, null, 2));
  } catch (err) {
    console.error('Error from generateJSON(direct JSON):', (err as any)?.message ?? err);
  }

  try {
    console.log('\n== Calling generateJSON() with Improve prompt (what ResearchService receives) ==');
    const parsed2 = await provider.generateJSON(prompt, {
      temperature: 0.35,
      maxTokens: 300,
      systemInstruction: 'You are an academic writing editor. Rewrite the paragraph into a stronger scholarly version while preserving meaning. Return only one paragraph, with no commentary or wrappers.'
    });
    console.log(JSON.stringify({ parsedImprove: parsed2 }, null, 2));
    console.log('\n== Finished ==');
  } catch (err) {
    console.error('Error from generateJSON(improve prompt):', (err as any)?.message ?? err);
  }

  process.exit(0);
})();
