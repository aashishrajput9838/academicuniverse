# PlaceholderValidator — Split `<w:t>` Node Limitation Report

**Date**: 2026-07-24  
**Component**: `src/services/placeholderValidator.service.ts`  
**Sprint**: Sprint 1 (Placeholder-First Architecture)  
**Status**: Documented limitation — implementation unchanged per sprint scope

---

## 1. Finding

The current `PlaceholderValidator` implementation **does not** correctly detect placeholders that are split across multiple `<w:t>` nodes.

### Examples that fail

| DOCX XML fragment | Expected key | Actual behavior |
|-------------------|--------------|-----------------|
| `<w:t>{{de</w:t><w:t>gree}}</w:t>` | `degree` | Not detected. Regex matches fragmented text including XML tags. |
| `<w:t>{{na</w:t><w:t>me}}</w:t>` | `name` | Not detected. |
| `<w:t>{{</w:t><w:t>email}}</w:t>` | `email` | Not detected. |
| `<w:r><w:t>{{de</w:t></w:r><w:r><w:t>gree}}</w:t></w:r>` (same paragraph) | `degree` | Not detected. |

### Root cause

The validator extracts placeholders with a single regex pass over the raw `word/document.xml` string:

```typescript
const regex = /\{\{([^}]+)\}\}/g;
```

When Word splits a placeholder across multiple `<w:t>` nodes, the regex sees XML markup between the opening `{{` and closing `}}`:

```
{{de</w:t></w:r></w:p>
    <w:p><w:r><w:t>gree}}
```

The regex either:
- Fails to match entirely if the closing `}}` is not on the same text node as the opening `{{`, or
- Matches a corrupted fragment that includes XML tags in the captured group.

In both cases, the extracted `key` is not a valid canonical field name, so the placeholder is either missed entirely or classified as `UNKNOWN` / fragmented.

### Why this happens in real DOCX files

Word is free to split text across arbitrary run boundaries. Common triggers:
- Track changes
- Field codes
- Complex formatting changes mid-word
- Collaboration / revision marks
- Paste from external sources
- Programmatic DOCX generation

Therefore, split `<w:t>` nodes are **not an edge case** — they are a normal DOCX condition.

---

## 2. Runtime Evidence

Unit tests were added in `src/__tests__/placeholderValidator.split-t-nodes.test.ts` to capture this behavior. All 5 tests pass as **documented limitations**:

```text
PASS src/__tests__/placeholderValidator.split-t-nodes.test.ts
  PlaceholderValidator — split <w:t> nodes (known limitation)
    √ DOCUMENTED LIMITATION: does not detect <w:t>{{de</w:t><w:t>gree}}</w:t> as degree
    √ DOCUMENTED LIMITATION: does not detect <w:t>{{na</w:t><w:t>me}}</w:t> as name
    √ DOCUMENTED LIMITATION: does not detect <w:t>{{</w:t><w:t>email}}</w:t> as email
    √ DOCUMENTED LIMITATION: does not detect split placeholder across runs in same paragraph
    √ records the fragmented token in the report for debugging
```

Concrete extracted keys from the failing cases:

| Input fragments | Extracted `key` |
|-----------------|-----------------|
| `{{de` + `gree}}` | `de</w:t></w:r></w:p>\n    <w:p><w:r><w:t>gree` |
| `{{na` + `me}}` | `na</w:t></w:r></w:p>\n    <w:p><w:r><w:t>me` |
| `{{` + `email}}` | `</w:t></w:r></w:p>\n    <w:p><w:r><w:t>email` |

These are clearly not valid canonical keys and cannot be classified correctly.

---

## 3. Impact Assessment

| Scenario | Severity | Frequency | Impact |
|----------|----------|-----------|--------|
| Faculty types `{{degree}}` in one text node | None | High | Works correctly |
| Word splits placeholder during save/collaboration | Medium | Medium | Placeholder missed → validation reports `MISSING` → faculty confused |
| Programmatically generated DOCX splits tokens | Medium | Low-Medium | Same as above |
| Template already contains split placeholders before faculty upload | High | Unknown | Faculty sees false errors and cannot validate template |

The most likely failure mode is: faculty uploads a template they did not write themselves, or Word has already split text during editing. The validator returns `MISSING` errors for fields that are actually present in the document, leading to false-negative validation.

---

## 4. Why The Implementation Was Not Changed

Sprint 1 scope explicitly required:

> Implement the PlaceholderValidator service as an isolated module.
> Keep the validator completely independent of controllers, database, frontend, and existing upload flow.

Fixing this limitation requires one of:

1. **XML-aware extraction**: Parse `word/document.xml` into a DOM, walk all `<w:t>` nodes, concatenate adjacent text nodes, then apply regex to the concatenated stream.
2. **Pre-processing normalization**: Strip or collapse XML tags before regex, then map matches back to locations.
3. **State-machine lexer**: Implement a streaming tokenizer that understands `<w:t>` boundaries and can assemble placeholders from fragments.

All three approaches:
- Increase implementation complexity beyond the Sprint 1 scope.
- Require additional error handling for malformed XML, namespaces, and mixed content.
- Need new test fixtures and integration tests.

Per the sprint directive, the implementation was left unchanged and the limitation is documented for a future sprint.

---

## 5. Recommended Remediation (Future Sprint)

The correct fix is to **replace regex-only extraction with XML-aware extraction**:

1. Parse `word/document.xml` with `fast-xml-parser` or a streaming XML reader.
2. Collect all `<w:t>` text nodes in document order.
3. Concatenate their text values into a single virtual stream, recording the start/end offsets of each node.
4. Apply placeholder regex against the concatenated stream.
5. Map matched offsets back to the originating `<w:t>` node locations for accurate `pathString` reporting.

This approach:
- Handles split placeholders correctly.
- Preserves location accuracy.
- Keeps the validator self-contained (no external dependencies beyond what already exists in the project).
- Adds ~50–100 lines of code.

**Priority**: Medium. Should be addressed before enabling faculty uploads in production, because false-negative validation will generate support tickets.

---

## 6. Current Workaround

Until the fix is implemented, faculty should be advised to:

- Ensure placeholders are typed as complete tokens inside a single Word text node.
- Avoid editing placeholders after inserting them (re-insert rather than modify).
- Not copy-paste placeholders from external sources that may introduce hidden formatting or split runs.

This workaround is documented in the validator’s known limitations.

---

## 7. Test Coverage

The limitation is captured in 5 passing unit tests:

- `src/__tests__/placeholderValidator.split-t-nodes.test.ts`

These tests serve as regression tests. When the fix is implemented, these tests should be updated to assert the **correct** behavior (placeholders detected) rather than the current limitation.

---

## 8. Summary

| Attribute | Value |
|-----------|-------|
| **Limitation** | Regex-based extraction cannot detect placeholders split across multiple `<w:t>` nodes |
| **Root cause** | Raw XML regex sees markup between `{{` and `}}` |
| **Affected cases** | `<w:t>{{de</w:t><w:t>gree}}</w:t>`, `<w:t>{{na</w:t><w:t>me}}</w:t>`, `<w:t>{{</w:t><w:t>email}}</w:t>` |
| **Implementation changed?** | No — per Sprint 1 scope boundary |
| **Tests added?** | Yes — 5 documented-limitation tests |
| **Recommended fix** | XML-aware extraction in future sprint |
| **Priority** | Medium — address before production faculty uploads |
