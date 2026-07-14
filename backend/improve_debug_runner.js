// Runtime debug runner (plain Node) - uses ts-node to load TS modules
process.env.GEMINI_FORCE_FAIL = process.env.GEMINI_FORCE_FAIL || '1';
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'gem_test_key';

require('ts-node').register({ transpileOnly: true });

(async () => {
  try {
    const { AIProviderFactory } = require('./src/core/ai/ai.factory');
    const { ResearchService } = require('./src/modules/research/research.service');

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

    const dto = { text: originalText };
    const prompt = `Rewrite the paragraph below into a stronger academic version.\n\nRequirements:\n1. Rewrite rather than copy the original wording.\n2. Improve grammar, sentence structure, vocabulary, and scholarly tone.\n3. Remove repetition and filler.\n4. Preserve the original technical meaning and intent.\n5. Return exactly one polished paragraph.\n6. Output ONLY the improved paragraph with no explanation, preface, headings, or notes.\n\nOriginal text: "${dto.text}"`;

    console.log('\n== Calling provider.generateJSON() to capture raw object ==\n');
    let result = undefined;
    try {
      result = await provider.generateJSON(prompt, { temperature: 0.35, maxTokens: 300, systemInstruction: 'You are an academic writing editor. Rewrite the paragraph into a stronger scholarly version while preserving meaning. Return only one paragraph, with no commentary or wrappers.'});
      console.log('Raw object returned by AIProvider.generateJSON():');
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error('Error from provider.generateJSON():', err && err.message ? err.message : err);
      process.exit(2);
    }

    const improvedText = result && result.improvedText;
    console.log('\nresult:', JSON.stringify(result));
    console.log('\nresult.improvedText:', JSON.stringify(improvedText));

    const normalize = service['normalizeImprovedText'] ? service['normalizeImprovedText'].bind(service) : null;
    const looksLike = service['looksLikeOriginalCopy'] ? service['looksLikeOriginalCopy'].bind(service) : null;

    const normalizedImprovedText = normalize ? normalize(improvedText) : ('' + (improvedText || '')).trim();
    const looksLikeOriginalCopy = looksLike ? looksLike(normalizedImprovedText, dto.text) : (normalizedImprovedText.replace(/\s+/g,' ').toLowerCase() === dto.text.replace(/\s+/g,' ').toLowerCase());

    console.log('\n--- VALUES IMMEDIATELY BEFORE CONDITION (normalizedImprovedText && !looksLikeOriginalCopy) ---');
    console.log('normalizedImprovedText:', JSON.stringify(normalizedImprovedText));
    console.log('looksLikeOriginalCopy:', looksLikeOriginalCopy);
    console.log('typeof result:', typeof result);

    if (looksLikeOriginalCopy) {
      const normalizedCandidate = (normalizedImprovedText || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const normalizedOriginal = dto.text.replace(/\s+/g, ' ').trim().toLowerCase();
      const equal = normalizedCandidate === normalizedOriginal;
      function levenshtein(a, b) {
        const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
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

    if (!normalizedImprovedText) {
      console.log('\n--- normalizedImprovedText is empty: diagnosing normalization removals ---');
      const raw = improvedText || result || '';
      const s = String(raw);
      console.log('raw improvedText value (before normalize):', JSON.stringify(s));
      const trimmed = s.trim();
      const checks = [];
      checks.push({ name: 'startsWith ```json', matched: trimmed.toLowerCase().startsWith('```json') });
      checks.push({ name: 'startsWith ```', matched: trimmed.startsWith('```') });
      checks.push({ name: 'contains "improvedText"', matched: trimmed.indexOf('"improvedText"') !== -1 });
      checks.push({ name: 'contains "text"', matched: trimmed.indexOf('"text"') !== -1 });
      checks.push({ name: 'is plain empty or whitespace', matched: trimmed.length === 0 });
      console.log('normalization checks:', JSON.stringify(checks, null, 2));
      console.log('explanation: normalization strips code fences, JSON wrappers like {"improvedText":"..."}, and trims; if those patterns were the only content, result becomes empty.');
    }

    // Evaluate the condition and explain which value would cause HTTP 500
    const condition = Boolean(normalizedImprovedText) && !looksLikeOriginalCopy;
    console.log('\n--- CONDITION EVALUATION ---');
    console.log('condition (normalizedImprovedText && !looksLikeOriginalCopy):', condition);

    if (condition) {
      console.log('Outcome: condition passed → ResearchService would return HTTP 200 with the improved text.');
    } else {
      if (!normalizedImprovedText) {
        console.log('Outcome: normalizedImprovedText is empty → ResearchService logs "AI provider returned no usable improved text" and returns HTTP 500.');
      } else if (looksLikeOriginalCopy) {
        console.log('Outcome: improved text looks like original copy → ResearchService logs "AI provider returned an unusable rewrite that is a copy of the original text" and returns HTTP 500.');
      } else {
        console.log('Outcome: Unknown—both values present; service would have returned success.');
      }
    }

    process.exit(0);
  } catch (e) {
    console.error('Unexpected error in runner:', e && e.stack ? e.stack : e);
    process.exit(3);
  }
})();
