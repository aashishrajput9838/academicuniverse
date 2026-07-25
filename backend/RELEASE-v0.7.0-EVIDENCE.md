# Release v0.7.0 Evidence

## 1. Tag Creation

```bash
git tag -a "v0.7.0" -m "Sprint 7: DIC Integration + Canonical Writes (Stage 5-6)"
```

**Tag Details:**
- Tag name: `v0.7.0`
- Type: Annotated tag
- Points to commit: `fdce91a`
- Tagger: Aashish Rajput <aashishrajput9838@gmail.com>
- Date: 2026-07-25

```bash
git tag -l "v0.7*"
# v0.7.0
```

---

## 2. PROJECT-INDEX.md Updates

### Current Tag

**Before:**
```md
**Current Tag:** `v0.6.0`
```

**After:**
```md
**Current Tag:** `v0.7.0`
```

### Sprint 7 Status

**Before:**
```md
| Sprint 7 | DIC Integration + Canonical Writes | MERGED | `—` | `60aef88` | 2026-07-25 |
```

**After:**
```md
| Sprint 7 | DIC Integration + Canonical Writes | RELEASED | `v0.7.0` | `60aef88` | 2026-07-25 |
```

### Commit History
```
fdce91a docs(resume-parser): mark Sprint 7 released with v0.7.0
0e6fa64 docs(resume-parser): update PROJECT-INDEX for Sprint 7 merge
60aef88 feat(resume-parser): Sprint 7 DIC integration and canonical writes (Stage 5-6)
5b5492b docs(sprint-6): completion report and freeze
```

---

## 3. Release Content

### Source Files Included
| File | Purpose |
|------|---------|
| `src/services/resume/dicIntegration.service.ts` | Stage 5 DIC routing |
| `src/services/resume/canonicalWrite.service.ts` | Stage 6 canonical writes |
| `src/services/resume/resumeParseEventListener.ts` | Stage 4→5 bridge |
| `src/models/ResumeParseResult.ts` | Added dicRoutedAt, canonicalWrittenAt, dicDocumentId |
| `src/events/UaipEvents.ts` | 5 new events |
| `src/shared/services/knowledgeDispatcher.service.ts` | Stage 5/6 handlers |
| `src/__tests__/dicIntegration.service.test.ts` | 8 tests |
| `src/__tests__/canonicalWrite.service.test.ts` | 8 tests |
| `src/__tests__/sprint7.integration.test.ts` | 3 tests |

### Documentation Included
| File | Purpose |
|------|---------|
| `RELEASE-v0.7.0.md` | Release notes |
| `SPRINT-7-PLAN.md` | Sprint plan |
| `SPRINT-7-PLAN-FREEZE.md` | Plan freeze |
| `SPRINT-7-IMPLEMENTATION-REPORT.md` | Implementation report |
| `SPRINT-7-CODE-REVIEW.md` | Senior code review |
| `SPRINT-7-REVIEW-FIX-REPORT.md` | Review fixes |
| `SPRINT-7-CODE-RE-REVIEW.md` | Re-review |
| `SPRINT-7-MERGE-REPORT.md` | Merge report |
| All corresponding `-EVIDENCE.md` files | Evidence documentation |

---

## 4. Test Evidence

| Suite | Tests | Pass | Fail |
|-------|-------|------|------|
| Sprint 7 new | 19 | 19 | 0 |
| Full regression | 514 | 514 | 0 |

Command: `npx jest --runInBand`

---

## 5. Architecture Compliance

- Person deduplication formula: exact match to Architecture v1.7 Section 7.4
- Event-driven stage routing: unchanged pattern
- Multi-tenant safety: organizationId scoped on all queries
- Idempotency: dicRoutedAt and canonicalWrittenAt guards
- Retry semantics: KnowledgeJobRepository retry metadata used

---

## 6. What Changed Since Merge

After code merge (commits `60aef88` and `0e6fa64`), added:
- `fdce91a` — mark Sprint 7 as RELEASED in PROJECT-INDEX.md
- `RELEASE-v0.7.0.md` — release notes (untracked artifact, not committed)
- `RELEASE-v0.7.0-EVIDENCE.md` — release evidence (untracked artifact, not committed)
