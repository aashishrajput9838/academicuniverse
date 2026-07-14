(async () => {
  // Runtime-only debug script for one Improve request
  process.env.GEMINI_FORCE_FAIL = process.env.GEMINI_FORCE_FAIL || '1';
  process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'gem_test_key';

  const { AIProviderFactory } = require('../core/ai/ai.factory');
  const { ResearchService } = require('../modules/research/research.service');

  // Minimal stub for ResearchRepository used only to construct ResearchService
  class DummyRepo {
    async create() { return 'dummy'; }
    async update() {}
    async findByUserId() { return []; }
    async findById() { return null; }
    async delete() {}
  }

  const provider = AIProviderFactory.getInstance().getDefaultProvider();
  const repo = new DummyRepo();
  const service = new ResearchService(provider, repo);

  const originalText = 'Artificial intelligence is transforming healthcare through improved diagnostics, treatment personalization, and evidence-based clinical decision support.';
  console.log('\n=== ORIGINAL INPUT TEXT ===\n');
  console.log(originalText);

  // Build the same prompt ResearchService uses
  const dto = { text: originalText };
  const prompt = `Rewrite the paragraph below into a stronger academic version.\n\nRequirements:\n1. Rewrite rather than copy the original wording.\n2. Improve grammar, sentence structure, vocabulary, and scholarly tone.\n3. Remove repetition and filler.\n4. Preserve the original technical meaning and intent.\n5. Return exactly one polished paragraph.\n6. Output ONLY the improved paragraph with no explanation, preface, headings, or notes.\n\nOriginal text: "${dto.text}"`;

  // Call provider.generateJSON directly to capture the raw returned object
  console.log('\n== Calling provider.generateJSON() to capture raw object ==\n');
  let result: any = undefined;
  try {
    result = await provider.generateJSON(prompt, { temperature: 0.35, maxTokens: 300, systemInstruction: 'You are an academic writing editor. Rewrite the paragraph into a stronger scholarly version while preserving meaning. Return only one paragraph, with no commentary or wrappers.'});
    console.log('Raw object returned by AIProvider.generateJSON():');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error from provider.generateJSON():', (err as any)?.message ?? err);
    process.exit(2);
  }

  // Log requested intermediate values
  const improvedText = result?.improvedText;
  console.log('\nresult:', JSON.stringify(result));
  console.log('\nresult.improvedText:', JSON.stringify(improvedText));

  // Access private normalization and comparison helpers via any cast
  const normalize = (service as any).normalizeImprovedText?.bind(service);
  const looksLike = (service as any).looksLikeOriginalCopy?.bind(service);

  const normalizedImprovedText = normalize ? normalize(improvedText) : ('' + (improvedText || '')).trim();
  const looksLikeOriginalCopy = looksLike ? looksLike(normalizedImprovedText, dto.text) : (normalizedImprovedText.replace(/\s+/g,' ').toLowerCase() === dto.text.replace(/\s+/g,' ').toLowerCase());

  console.log('\nnormalizedImprovedText:', JSON.stringify(normalizedImprovedText));
  console.log('\nlooksLikeOriginalCopy:', looksLikeOriginalCopy);
  console.log('\ntypeof result:', typeof result);

  // If looksLikeOriginalCopy true -> compute similarity details
  if (looksLikeOriginalCopy) {
    // The service uses strict normalized equality. We'll show that and also compute Levenshtein distance for context.
    const normalizedCandidate = (normalizedImprovedText || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const normalizedOriginal = dto.text.replace(/\s+/g, ' ').trim().toLowerCase();

    const equal = normalizedCandidate === normalizedOriginal;

    function levenshtein(a: string, b: string) {
      const dp: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
      for (let i = 0; i <= a.length; i++) dp[i][0] = i;
      for (let j = 0; j <= b.length; j++) dp[0][j] = j;
      for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
      }
      return dp[a.length][b.length];
    }

    const lev = levenshtein(normalizedCandidate, normalizedOriginal);
    const maxLen = Math.max(normalizedCandidate.length, normalizedOriginal.length) || 1;
    const similarityScore = 1 - lev / maxLen;

    console.log('\n--- looksLikeOriginalCopy diagnostics ---');
    console.log('comparison algorithm: strict normalized string equality (case-insensitive, whitespace collapsed)');
    console.log('threshold: exact equality (no tolerance)');
    console.log('normalizedCandidate:', JSON.stringify(normalizedCandidate));
    console.log('normalizedOriginal:', JSON.stringify(normalizedOriginal));
    console.log('equal (normalizedCandidate === normalizedOriginal):', equal);
    console.log('levenshtein distance:', lev);
    console.log('similarity score (1 - lev/maxLen):', similarityScore);
    console.log('exact reason: normalized strings are identical => looksLikeOriginalCopy === true');
  }

  // If normalizedImprovedText is empty, explain why based on normalization steps
  if (!normalizedImprovedText) {
    console.log('\n--- normalizedImprovedText is empty: diagnosing normalization removals ---');
    const raw = improvedText || result || '';
    const s = String(raw);
    console.log('raw improvedText value (before normalize):', JSON.stringify(s));

    // Check patterns used by normalization in ResearchService
    const checks: { name: string; matched: boolean }[] = [];
    checks.push({ name: 'startsWith ```json', matched: /^```json/i.test(s) });
    checks.push({ name: 'startsWith ```', matched: /^```/i.test(s) });
    checks.push({ name: 'contains "improvedText" key', matched: /"improvedText"\s*:\s*"/i.test(s) });
    checks.push({ name: 'contains "text" key', matched: /"text"\s*:\s*"/i.test(s) });
    checks.push({ name: 'is plain empty or whitespace', matched: s.trim().length === 0 });
    console.log('diagnosis checks:', checks);
  }
})();
