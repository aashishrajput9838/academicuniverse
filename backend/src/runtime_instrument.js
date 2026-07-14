// Runtime instrumentation loader (required at node startup with -r)
(function(){
  try {
    const uuid = () => 'req-' + Math.random().toString(36).slice(2,10);

    // Delay instrumentation until modules load by hooking into require
    const Module = require('module');
    const origLoad = Module._load;

    Module._load = function(request, parent, isMain) {
      const exported = origLoad.apply(this, arguments);

      try {
        if (request && request.endsWith('/modules/research/research.service') || request.endsWith('\\modules\\research\\research.service') ) {
          const ResearchService = exported && (exported.ResearchService || exported);
          if (ResearchService && ResearchService.prototype && !ResearchService.prototype.__instrumented) {
            const orig = ResearchService.prototype.improveContent;
            ResearchService.prototype.improveContent = async function(dto) {
              const requestId = uuid();
              console.log(`[INSTRUMENT] controller_entry requestId=${requestId} originalText=${dto && dto.text ? dto.text.substring(0,200) : '<none>'}`);

              // Wrap provider.generateJSON to capture raw provider object
              const provider = this.aiProvider;
              let rawProviderObj = undefined;
              let providerName = provider && (provider.getProviderName ? provider.getProviderName() : String(provider));

              if (provider && !provider.__gen_instrumented) {
                const originalGen = provider.generateJSON.bind(provider);
                provider.generateJSON = async function(prompt, config) {
                  const res = await originalGen(prompt, config);
                  try { rawProviderObj = res; } catch (e) { rawProviderObj = res; }
                  return res;
                };
                provider.__gen_instrumented = true;
              }

              try {
                const result = await orig.call(this, dto);

                // compute normalized and looksLike using service helpers
                const normalize = this.normalizeImprovedText ? this.normalizeImprovedText.bind(this) : (x=>x);
                const looksLike = this.looksLikeOriginalCopy ? this.looksLikeOriginalCopy.bind(this) : ((a,b)=>a===b);

                const improvedText = rawProviderObj && rawProviderObj.improvedText;
                const normalizedImprovedText = normalize(improvedText);
                const looksLikeOriginalCopy = looksLike(normalizedImprovedText, dto.text);

                console.log('[INSTRUMENT] provider_name=', providerName);
                console.log('[INSTRUMENT] raw_provider_response=', JSON.stringify(rawProviderObj));
                console.log('[INSTRUMENT] result_improvedText=', JSON.stringify(improvedText));
                console.log('[INSTRUMENT] normalizedImprovedText=', JSON.stringify(normalizedImprovedText));
                console.log('[INSTRUMENT] looksLikeOriginalCopy=', looksLikeOriginalCopy);
                console.log('[INSTRUMENT] controller_response_status=200');
                console.log('[INSTRUMENT] controller_response_body=', JSON.stringify(result));

                return result;
              } catch (err) {
                // capture rawProviderObj if available
                try {
                  console.log('[INSTRUMENT] provider_name=', providerName);
                  console.log('[INSTRUMENT] raw_provider_response=', JSON.stringify(rawProviderObj));
                } catch (e) {}

                // Attempt to compute normalizedImprovedText if possible
                try {
                  const normalize = this.normalizeImprovedText ? this.normalizeImprovedText.bind(this) : (x=>x);
                  const improvedText = rawProviderObj && rawProviderObj.improvedText;
                  const normalizedImprovedText = normalize(improvedText);
                  const looksLikeOriginalCopy = this.looksLikeOriginalCopy ? this.looksLikeOriginalCopy(normalizedImprovedText, dto.text) : false;
                  console.log('[INSTRUMENT] result_improvedText=', JSON.stringify(improvedText));
                  console.log('[INSTRUMENT] normalizedImprovedText=', JSON.stringify(normalizedImprovedText));
                  console.log('[INSTRUMENT] looksLikeOriginalCopy=', looksLikeOriginalCopy);
                } catch (e) {}

                console.log('[INSTRUMENT] controller_response_status=500');
                console.log('[INSTRUMENT] controller_error_stack=', err && err.stack ? err.stack : String(err));
                throw err;
              }
            };

            ResearchService.prototype.__instrumented = true;
            console.log('[INSTRUMENT] ResearchService.improveContent patched');
          }
        }
      } catch (e) {
        // ignore
      }

      return exported;
    };

    console.log('[INSTRUMENT] runtime_instrument loader installed');
  } catch (e) {
    console.error('Failed to install runtime_instrument:', e && e.stack ? e.stack : e);
  }
})();
