# Placeholder Injection Runtime Proof Report

**Date:** 2026-07-23  
**Component:** `PlaceholderInjector` (`backend/src/services/placeholderInjector.service.ts`)  
**Debug Mode:** Activated via `PLACEHOLDER_INJECTOR_DEBUG=true` environment variable  
**Status:** Debug instrumentation added. Runtime proof pending user-triggered template processing.

---

## 1. Debug Instrumentation Added

### 1.1 New Debug API on `PlaceholderInjector`

```typescript
enableDebug()   // Sets debugMode = true, clears previous log
disableDebug()  // Sets debugMode = false
getDebugLog()   // Returns copy of accumulated debug log
```

### 1.2 Trigger Mechanism

Debug mode is activated in `TemplateProcessingOrchestrator.process()` when:

```
process.env.PLACEHOLDER_INJECTOR_DEBUG === 'true'
```

When enabled, the orchestrator calls `placeholderInjector.enableDebug()` before processing and logs the debug output after successful injection.

---

## 2. What Debug Mode Captures

### 2.1 Per-Injection Logging

For **every** placeholder injected, the following is logged:

```
[INJECT] paragraph run[0] textNode[0]
  BEFORE: "{{na"
  AFTER:  "{{name}}"
  Full run text: "{{na"
  WARNING: Unmatched braces in run!
```

**Fields captured:**
- `paragraph` index in the DOCX body
- `run` index within the paragraph
- `textNode` index within the run
- Original text content BEFORE replacement
- New placeholder text AFTER replacement
- Full concatenated text of the entire run
- Brace count within the run (open/close)
- Warnings for unmatched or multiple brace pairs

### 2.2 Post-Injection Paragraph Logging

For **every** paragraph that had placeholders injected:

```
[PARA] p[5] run[0] BEFORE:
<w:r>...</w:r>
[PARA] p[5] run[0] AFTER:
<w:r>...</w:r>
  WARNING: Paragraph 5 has unmatched braces after injection! Open=3, Close=2
```

**Fields captured:**
- Full XML serialization of the paragraph BEFORE replacement
- Full XML serialization of the paragraph AFTER replacement
- Brace balance check on the modified paragraph XML

### 2.3 Post-Injection Summary Report

After all sections are processed, the following summary is written to:

**`C:/Users/elitebook840g89319/AppData/Local/Temp/kilo/placeholder-injection-debug.log`**

And the following files are saved:

| File | Content |
|---|---|
| `placeholder-injection-debug.log` | Full debug log with all injection events and warnings |
| `placeholder-injection-original.xml` | Complete `word/document.xml` BEFORE injection |
| `placeholder-injection-modified.xml` | Complete `word/document.xml` AFTER injection |
| `debug-xml-output.xml` | Same as modified XML (existing debug artifact) |

**Summary report includes:**
- Original XML length vs modified XML length
- Total placeholders injected count
- Every injected placeholder mapping: `raw -> unique`
- **Brace Balance Check:**
  - Count of `{{` open braces in modified XML
  - Count of `}}` close braces in modified XML
  - Expected pairs vs actual count
  - `WARNING: Brace mismatch!` if counts differ
  - `WARNING: Extra braces detected!` if count exceeds expected
- **XML Diff Summary:**
  - Count of original brace tokens (e.g., `{{name}}`)
  - Count of modified brace tokens
  - List of NEW tokens injected
  - List of REMOVED tokens

### 2.4 Backend Log Output

When debug mode is active and injection succeeds:

```
[INFO] Placeholder injection debug log: [
  '=== PLACEHOLDER INJECTION DEBUG REPORT ===',
  'Original XML length: 12345 chars',
  'Modified XML length: 12360 chars',
  'Total placeholders injected: 6',
  ...
  'WARNING: Paragraph 5 has unmatched braces after injection! Open=3, Close=2'
]
```

---

## 3. How to Trigger Debug Mode

### Option A: Environment Variable (Recommended for CLI)

```bash
cd backend
PLACEHOLDER_INJECTOR_DEBUG=true npm run dev
```

### Option B: Process Environment

```powershell
$env:PLACEHOLDER_INJECTOR_DEBUG = "true"
npm run dev
```

### Option C: Frontend Request

Process a template via the normal `POST /api/resume/templates/:id/process` endpoint while debug mode is active in the backend.

---

## 4. What Evidence Will Prove the Root Cause

### Evidence That Will Confirm PlaceholderInjector Creates Malformed XML

| Evidence | Where It Appears | What It Proves |
|---|---|---|
| `WARNING: Unmatched braces in run!` | Per-injection log | A single run contains `{{` without matching `}}`, or vice versa |
| `WARNING: Multiple brace pairs in run!` | Per-injection log | A single run contains more than one `{{` or `}}`, indicating split fragments |
| `WARNING: Paragraph X has unmatched braces after injection!` | Post-injection paragraph log | After replacement, the paragraph XML has mismatched braces |
| `WARNING: Brace mismatch! Open=N, Close=M` | Summary report | Overall modified XML has unequal open/close counts |
| `WARNING: Extra braces detected!` | Summary report | More braces than expected, indicating duplicates |
| `New tokens injected: [...], Removed tokens: [...]` | XML diff summary | Shows exactly which tokens were changed |
| Difference between `original.xml` and `modified.xml` | File comparison | Visual proof of corruption introduced by injection |

### Evidence That Would Refute the Hypothesis

| Evidence | Where It Appears | What It Proves |
|---|---|---|
| Zero warnings in debug log | All sections | Injection produced well-formed XML |
| Brace counts match expected pairs | Summary report | No duplicate or fragmented placeholders |
| Original and modified XML are structurally identical except for intended placeholders | File comparison | Injection is clean |

---

## 5. Expected Runtime Proof Sequence

### Step 1: User enables debug mode and processes a template

```bash
PLACEHOLDER_INJECTOR_DEBUG=true npm run dev
```

Then triggers template processing from the frontend.

### Step 2: Backend writes debug files

After processing, the following files exist:
```
C:/Users/elitebook840g89319/AppData/Local/Temp/kilo/
  placeholder-injection-debug.log
  placeholder-injection-original.xml
  placeholder-injection-modified.xml
  debug-xml-output.xml
```

### Step 3: User inspects debug log

The log shows:
1. Every placeholder that was injected
2. Every warning about unmatched/multiple braces
3. A summary with brace counts

### Step 4: User compares original vs modified XML

By diffing `placeholder-injection-original.xml` against `placeholder-injection-modified.xml`, the user can see:
- Where placeholders were injected
- Whether any `{{` or `}}` fragments were left behind
- Whether any runs contain partial placeholder text

### Step 5: Docxtemplater render test

The user can copy the modified XML and test it directly in the existing `scripts/debug-docx-render.ts` script:

```typescript
const zip = new PizZip(injectionResult.buffer);
const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
doc.setData({ name: 'Test' });
doc.render(); // Will throw if XML is malformed
```

If `doc.render()` throws `TemplateError: Duplicate open/close tag`, the debug files will show the exact XML that caused it.

---

## 6. What This Will NOT Prove

| Question | Why Not |
|---|---|
| **Which specific DOCX template caused the failure?** | Debug mode runs on the template being processed. If multiple templates exist, each must be processed individually with debug mode active. |
| **The exact Docxtemplater error message?** | Docxtemplater throws during `doc.render()`, which happens in a different service (`resumeService.ts`). The PlaceholderInjector debug only captures the XML state after injection. To get the Docxtemplater error, the generated DOCX must be fed back into Docxtemplater. |
| **The exact line number in `docx/document.xml`?** | The debug log shows paragraph and run indices, which map to specific XML locations. The user must cross-reference with the actual XML file. |

---

## 7. Minimal Next Steps After Debug Capture

Once the debug files are captured:

1. **Open `placeholder-injection-modified.xml`** and search for `{{` and `}}`.
2. **Look for patterns like:**
   - `{{name}}` followed by `}}` in a different run
   - `{{` in one run and `name}}` in another
   - Multiple `{{` or `}}` within the same `<w:t>` node
3. **Compare original vs modified** to see what the injector left behind.
4. **Run the modified DOCX through Docxtemplater** to reproduce the exact error.

This will provide **definitive proof** that:
- The original DOCX is valid
- The injector creates malformed XML
- The exact location and nature of the corruption

---

## 8. Current Status

| Item | Status |
|---|---|
| Debug mode added to `PlaceholderInjector` | ✅ Complete |
| Debug mode enabled via `PLACEHOLDER_INJECTOR_DEBUG` | ✅ Complete |
| Per-injection logging (run, textNode, before/after) | ✅ Complete |
| Paragraph-level before/after XML logging | ✅ Complete |
| Brace balance checking | ✅ Complete |
| Debug file output (log, original XML, modified XML) | ✅ Complete |
| Runtime proof captured | ⏳ **Pending user action** — user must enable debug mode and process a template |
| Root cause definitively proven | ⏳ **Pending debug output** |

---

## 9. Important Notes

1. **This is temporary instrumentation.** All debug code should be removed after the investigation is complete.
2. **Debug mode writes to disk.** The `C:/Users/elitebook840g89319/AppData/Local/Temp/kilo/` directory must be writable.
3. **Debug mode should NOT be enabled in production.** It adds I/O overhead and writes sensitive XML content to disk.
4. **To disable debug mode after investigation:**
   - Remove the `enableDebug()` / `disableDebug()` methods
   - Remove the `debugMode` checks from `inject()` and `replaceRunTextWithPlaceholder()`
   - Remove the `PLACEHOLDER_INJECTOR_DEBUG` check from `TemplateProcessingOrchestrator`
   - Delete the debug file output blocks
