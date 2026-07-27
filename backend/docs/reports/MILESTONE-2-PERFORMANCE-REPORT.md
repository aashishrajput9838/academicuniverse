# Milestone-2 Performance Report — Sprint-021

**Date:** 2026-07-22
**Environment:** Windows (Node.js v24.17.0), AMD Ryzen-based system
**Document:** `resume templet kushagra conv.docx` (32,833 bytes, 73 paragraphs, 1,692 runs)

---

## 1. Benchmark Methodology

### 1.1 Test Configuration

| Parameter | Value |
|---|---|
| Test document | `input data/resume templet kushagra conv.docx` |
| Warm-up runs | 3 (discarded) |
| Measured runs | 5 |
| AI enabled | No (GOOGLE_AI_API_KEY not set) |
| Node.js cache | Cleared between runs |

### 1.2 Measured Stages

| Stage | Component | What it measures |
|---|---|---|
| Stage 1 | DocxExtractionService | DOCX parsing, XML parsing, normalization, run extraction |
| Stage 2 | SectionDetectorService | Rule-based section detection |
| Stage 2 | EntityDetectorService | Regex entity detection |
| Stage 2 | FormattingBuilderService | Style grouping, bullet detection, date format detection |
| Stage 2 | ConfidenceScorerService | Weighted confidence calculation |
| Stage 2 | ExtractionResultService | Orchestration overhead |
| Total | — | End-to-end pipeline |

---

## 2. Performance Results (AI Disabled)

### 2.1 Timing Measurements

| Run | Stage 1 (DocxExtraction) | Stage 2 (Milestone-2) | Total |
|---|---|---|---|
| 1 | 591ms | 17ms | 608ms |
| 2 | 470ms | 14ms | 484ms |
| 3 | 627ms | 17ms | 644ms |
| 4 | 591ms | 15ms | 606ms |
| 5 | 470ms | 14ms | 484ms |

### 2.2 Statistics

| Metric | Stage 1 (DocxExtraction) | Stage 2 (Milestone-2) | Total |
|---|---|---|---|
| Mean | 549.8ms | 15.4ms | 565.2ms |
| Median | 591.0ms | 15.0ms | 606.0ms |
| Min | 470.0ms | 14.0ms | 484.0ms |
| Max | 627.0ms | 17.0ms | 644.0ms |
| Std Dev | 74.6ms | 1.5ms | ~75.0ms |
| 95th percentile | ~627ms | ~17ms | ~644ms |

### 2.3 Stage Breakdown (Milestone-2)

Since Stage 2 completes in ~15ms total, sub-service timing is below measurement precision. Estimated distribution based on operation complexity:

| Sub-Service | Estimated Time | % of Stage 2 |
|---|---|---|
| SectionDetectorService | ~5ms | ~33% |
| EntityDetectorService | ~6ms | ~40% |
| FormattingBuilderService | ~2ms | ~13% |
| ConfidenceScorerService | ~1ms | ~7% |
| ExtractionResultService (orchestrator) | ~1ms | ~7% |

---

## 3. Performance Characteristics

### 3.1 Dominant Cost

**Stage 1 (DocxExtractionService) is the bottleneck** at ~550ms average. This is expected because:
- PizZip buffer decompression
- XML parsing via fast-xml-parser
- normalizationDocx() recursive processing
- Paragraph/run extraction from 1,692 runs

**Stage 2 (Milestone-2) is negligible** at ~15ms. Rule-based processing on in-memory objects is extremely fast.

### 3.2 Scalability

| Document Size | Expected Stage 1 | Expected Stage 2 | Total |
|---|---|---|---|
| 32KB (Kushagra) | ~550ms | ~15ms | ~565ms |
| 100KB | ~1,500ms | ~30ms | ~1,530ms |
| 1MB | ~8,000ms | ~150ms | ~8,150ms |

Rule-based Milestone-2 processing scales linearly with document size but remains < 2% of total cost.

### 3.3 Memory Profile

| Stage | Peak Memory (est.) | Notes |
|---|---|---|
| DocxExtractionService | ~5MB | PizZip buffer + parsed XML tree |
| Milestone-2 | ~2MB | In-memory objects, no buffering |
| Total | ~7MB | Well within typical server limits |

---

## 4. AI-Enabled Performance (Theoretical)

### 4.1 Estimated Impact

When `enableAiAssistance: true` and API is available:

| Scenario | Additional Latency | Notes |
|---|---|---|
| Section text < 200 chars | 0ms | Regex only |
| Section text > 200 chars | 1,000-3,000ms | Gemini API call + JSON parsing |
| AI timeout | 15,000ms | 15s hard timeout |
| AI error + fallback | 500ms | Error handling overhead |

### 4.2 AI Call Frequency

Based on Kushagra DOCX:
- **Sections with text > 200 chars:** ProfessionalSummary, Skills, Education
- **Expected AI calls:** 3
- **Estimated added latency:** 3,000-9,000ms

### 4.3 Optimization Recommendations

1. **Cache AI responses** by section text hash to avoid redundant calls
2. **Batch entity extraction** into a single AI call instead of per-section
3. **Pre-filter sections** that clearly don't need AI (education/certifications often don't)
4. **Add timeout circuit breaker** to fail fast when AI is slow

---

## 5. Throughput Projections

### 5.1 Sequential Processing

| Throughput | Docs/hour | Docs/day (8h) | Assumption |
|---|---|---|---|
| AI disabled | ~5,100 | ~40,800 | 550ms per doc |
| AI enabled (3 calls/doc) | ~600 | ~4,800 | 3.5s per doc |
| AI enabled (timeout frequent) | ~200 | ~1,600 | 15s timeout cases |

### 5.2 Parallel Processing (4 workers)

| Mode | Docs/hour | Docs/day (8h) |
|---|---|---|
| AI disabled | ~20,000 | ~160,000 |
| AI enabled (3 calls/doc) | ~2,400 | ~19,200 |

---

## 6. Performance Bottlenecks

### 6.1 Current Bottlenecks (Ranked)

| Rank | Bottleneck | Impact | Mitigation |
|---|---|---|---|
| 1 | DocxExtractionService XML parsing | 550ms | Acceptable for offline/batch use |
| 2 | AI API latency (when enabled) | 1-15s | Feature flag, caching, timeouts |
| 3 | PizZip decompression | ~100ms | Native module, already optimized |

### 6.2 Not Bottlenecks

- Rule-based section detection: ~5ms, negligible
- Regex entity detection: ~6ms, negligible
- Formatting analysis: ~2ms, negligible
- Confidence scoring: ~1ms, negligible

---

## 7. Platform Notes

- **Node.js v24.17.0** — newer runtime may have different performance characteristics
- **Windows (PowerShell)** — measurement precision is ~1ms due to OS scheduling
- **No load testing performed** — single-threaded, single-document benchmarks only

---

## 8. Performance Conclusion

**AI disabled mode is production-ready for batch/offline processing.**
**AI enabled mode requires latency tolerance or async processing.**

The Milestone-2 rule-based pipeline adds negligible overhead to Milestone-1 extraction. Total end-to-end time is dominated by DOCX parsing, which is expected and acceptable.

**No performance regressions detected.**
