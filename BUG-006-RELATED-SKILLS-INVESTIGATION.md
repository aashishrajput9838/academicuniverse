# BUG-006 Investigation: Empty "Related Skills" Section

**Date:** 2026-07-21T01:48:00+05:30  
**Status:** Investigation complete — no code changes  
**Related:** BUG-004, BUG-005, Explainability UI  

---

## 1. Current Behavior

### Location
`app/dashboard/student/skills/components/SkillDetailPanel.tsx:72-78`

### Implementation
```typescript
const getRelatedSkills = () => {
  if (!skill.aliases || skill.aliases.length === 0) return [];
  return skill.aliases.map(alias => ({
    name: alias,
    relationship: 'Known alias / related skill',
  }));
};
```

### Rendered Output
When `skill.aliases` is empty, `RelatedSkillsPanel` displays:
> "Related skills will appear here as ontology relationships are populated.  
> This feature is coming soon."

**This is the only state ever observed in production.**

---

## 2. Why It Always Shows Empty

### Root Cause 1: Aliases are rarely populated

| Evidence Source | Aliases Value | Source |
|-----------------|---------------|--------|
| **GitHub (repo)** | `repo.topics \|\| []` | `skillsEventListener.ts:170` |
| **GitHub (language fallback)** | `[]` | `skillsEventListener.ts:200` |
| **Academic** | `[subjectCode]` | `skillsEventListener.ts:75` |
| **Certificate** | `[issuer]` | `skillsEventListener.ts:123` |
| **Research** | `[]` | `skillsEventListener.ts:245` |

**GitHub is the primary evidence source.** For GitHub repos:
- `repo.topics` is optional and rarely set by users
- Most repositories have empty topics arrays
- Therefore `aliases` is almost always `[]`

### Root Cause 2: No ontology relationship system exists

The codebase has:
- `CanonicalSkill` — flat skill catalog (no parent/child/subskill fields)
- `SkillAlias` — maps aliases to canonical skills (e.g., "CSE101" → "computer-science")
- `SkillRecord` — user's skill with `aliases` array

**Missing:** Any model or service that defines:
- Parent → child skill relationships
- Skill → technology mappings
- Technology → framework mappings
- Framework → library mappings
- Library → tool mappings

The "ontology" referenced in comments (`skillsByOntology` index, `ontologyResolutionEnabled` flag) is limited to **canonical skill resolution** — mapping raw skill IDs to canonical IDs. It does not define hierarchical or related-skill relationships.

### Root Cause 3: Frontend has no backend API for related skills

`getRelatedSkills()` is purely a frontend transformation of `skill.aliases`. There is:
- No `/api/skills/{id}/related` endpoint
- No backend service for related skill lookup
- No caching or precomputation of relationships

---

## 3. GitHub Payload Technology Information

### What GitHub API Currently Provides

From `GitHubRepository` interface (`githubService.ts:9-20`):
```typescript
{
  name: string;
  full_name: string;
  private: boolean;
  fork: boolean;
  topics: string[];
  html_url: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  pushed_at: string;
}
```

From `analyticsService.ts:13-29` (more complete):
```typescript
{
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  fork: boolean;
  html_url: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  size: number;
  language: string | null;
  forks_count: number;
  stargazers_count: number;
  watchers_count: number;
  topics: string[];
}
```

### What Is Actually Used for Skills

From `skillsEventListener.ts:148-214` (`handleGithubUpdated`):
- `repo.language` → creates `LANGUAGE-{language}` skill
- `repo.topics` → stored as `aliases` on evidence
- `repo.size` → stored as `bytesOfCode` in payload
- `repo.created_at` → `firstCommitDate`
- `repo.pushed_at` → `lastCommitDate`
- `repo.html_url` → `repositoryUrl`
- `repo.owner?.login` → `owner`

### What Is NOT Used

| Data Point | Available | Used for Skills |
|------------|-----------|-----------------|
| `language` | ✅ | ✅ (creates LANGUAGE skill) |
| `topics` | ✅ | ✅ (stored as aliases, rarely populated) |
| `description` | ✅ | ❌ |
| `size` (KB) | ✅ | ✅ (stored as bytesOfCode) |
| `stargazers_count` | ✅ | ❌ |
| `forks_count` | ✅ | ❌ |
| `watchers_count` | ✅ | ❌ |
| `private` | ✅ | ✅ (stored as repositoryVisibility) |
| `fork` | ✅ | ✅ (filtered out) |

### What GitHub API Does NOT Provide (without extra calls)

- **Frameworks** — not in repo metadata
- **Libraries** — not in repo metadata
- **Dependencies** — requires fetching `package.json`, `requirements.txt`, etc. via Contents API
- **Tech stack** — not directly available

---

## 4. Package File Parsing Feasibility

### Current State
**No package file parsing exists anywhere in the codebase.**

Searches for `package.json`, `requirements.txt`, `pom.xml`, `Cargo.toml`, `pubspec.yaml`, `go.mod` returned zero matches in backend source code.

### Feasibility Assessment

| File | Language/Framework | Parse Complexity | GitHub API Access |
|------|-------------------|------------------|-------------------|
| `package.json` | JavaScript/TypeScript | Low (JSON) | Contents API |
| `requirements.txt` | Python | Low (text) | Contents API |
| `pom.xml` | Java/Maven | Medium (XML) | Contents API |
| `Cargo.toml` | Rust | Low (TOML) | Contents API |
| `pubspec.yaml` | Dart/Flutter | Medium (YAML) | Contents API |
| `go.mod` | Go | Low (text) | Contents API |

### Challenges

1. **GitHub API rate limits** — fetching file contents for every repo is expensive
   - `/repos/{owner}/{repo}/contents/{path}` requires one API call per file
   - With 100 repos × 3 file types = 300+ API calls per sync
   - Unauthenticated: 60/hr; Authenticated: 5,000/hr
   - Current sync already hits rate limits

2. **File detection** — no standard way to discover which manifest files exist without trying to fetch them

3. **Dependency normalization** — `react`, `@types/react`, `react-dom` are all related to React but are distinct packages

4. **Version parsing** — semantic versioning, ranges, git URLs add complexity

5. **Transitive dependencies** — `package.json` only lists direct dependencies, not the full tech stack

### Verdict
Package file parsing is **feasible but expensive**. It should be:
- Optional/background processing
- Rate-limit aware
- Cached aggressively
- Limited to top N repos by relevance (stars, size, recency)

---

## 5. Proposed Architecture

### Current State
```
Skill
  └── aliases: string[]  (flat list, rarely populated)
```

### Proposed Hierarchy

```
Skill (canonical)
  ├── Sub-skills
  │     ├── Technology
  │     │     ├── Framework
  │     │     │     ├── Library
  │     │     │     └── Tool
  │     │     └── Library
  │     │           └── Tool
  │     └── Technology
  │           └── ...
  └── Related Skills (sibling, peer, prerequisite)
```

### Data Model Changes Required

#### 1. Extend `CanonicalSkill`
```typescript
interface ICanonicalSkill {
  canonicalId: string;
  canonicalName: string;
  canonicalCategory: SkillCategory;
  canonicalSubcategory?: string;
  
  // New hierarchy fields
  parentId?: string;          // Parent skill (e.g., "Web Development" → "CSS")
  skillType?: 'SKILL' | 'TECHNOLOGY' | 'FRAMEWORK' | 'LIBRARY' | 'TOOL';
  relatedIds?: string[];      // Peer/related skills
  
  source: string;
  description?: string;
  status: SkillStatus;
}
```

#### 2. New `SkillRelationship` Model
```typescript
interface ISkillRelationship {
  sourceCanonicalId: string;  // e.g., "javascript"
  targetCanonicalId: string;  // e.g., "react"
  relationshipType: 'SUB_SKILL' | 'USES_TECHNOLOGY' | 'USES_FRAMEWORK' | 
                     'USES_LIBRARY' | 'USES_TOOL' | 'PREREQUISITE' | 'RELATED';
  confidence: number;
  source: string;             // 'ONTOLOGY', 'GITHUB', 'AI_INFERENCE'
  extractedBy: string;
  status: string;
}
```

#### 3. Extend `SkillEvidence` Payload
```typescript
// For GitHub evidence
payload: {
  language: string;
  repositoryId: string;
  repositoryName: string;
  repositoryUrl: string;
  bytesOfCode: number;
  topics: string[];
  
  // New: detected technologies
  technologies: Array<{
    name: string;        // e.g., "React"
    type: 'FRAMEWORK' | 'LIBRARY' | 'TOOL';
    source: 'PACKAGE_JSON' | 'TOPICS' | 'AI_INFERENCE';
    confidence: number;
  }>;
}
```

#### 4. Backend Services

**New: `TechnologyExtractionService`**
```typescript
class TechnologyExtractionService {
  async extractFromPackageJson(repo: GitHubRepository): Promise<TechStack>
  async extractFromReadme(repo: GitHubRepository): Promise<TechStack>
  async extractFromTopics(topics: string[]): Promise<TechStack>
  async normalize(technologies: string[]): Promise<CanonicalTechnology[]>
}
```

**New: `SkillRelationshipService`**
```typescript
class SkillRelationshipService {
  async getRelatedSkills(canonicalId: string): Promise<RelatedSkill[]>
  async getTechnologies(skillId: string): Promise<Technology[]>
  async getSubSkills(skillId: string): Promise<SubSkill[]>
  async buildRelationships(evidence: ISkillEvidence[]): Promise<void>
}
```

#### 5. API Endpoints

```
GET /api/skills/{skillId}/related
  → Related skills from ontology

GET /api/skills/{skillId}/technologies
  → Technologies detected in user's projects for this skill

GET /api/skills/{skillId}/hierarchy
  → Full hierarchy: sub-skills, technologies, frameworks, libraries, tools
```

#### 6. Frontend Updates

**`RelatedSkillsPanel` becomes a tabbed interface:**
```tsx
<Tabs>
  <Tab label="Related Skills">   {/* Ontology-based */} </Tab>
  <Tab label="Technologies">     {/* Detected in projects */} </Tab>
  <Tab label="Frameworks">       {/* From package files */} </Tab>
  <Tab label="Libraries">        {/* From package files */} </Tab>
</Tabs>
```

---

## 6. Three Implementation Strategies

### Strategy A: Ontology-Only (Recommended Short-Term)

**Source:** `CanonicalSkill.relatedIds` + `SkillAlias` mappings

**Pros:**
- Fast to implement (data already exists)
- Curated/accurate relationships
- No API rate limit concerns

**Cons:**
- Requires manual curation of relationships
- Doesn't reflect user's actual experience
- Static — doesn't update with new evidence

**Best for:** Showing conceptual relationships (e.g., "CSS is related to HTML, Sass, Bootstrap")

### Strategy B: Detected Technologies (Recommended Long-Term)

**Source:** GitHub `topics`, `language`, `description`, plus optional package file parsing

**Pros:**
- Reflects user's actual experience
- Auto-updates with new repositories
- Personalized to user's projects

**Cons:**
- Depends on GitHub API data quality
- Package parsing is rate-limit sensitive
- Requires normalization of technology names

**Best for:** Showing "Technologies used in your projects" (e.g., "React, Node.js, TypeScript")

### Strategy C: Hybrid (Recommended Final State)

**Combine both:**
1. **Ontology tab:** Curated related skills from canonical skill graph
2. **Technologies tab:** Detected from user's GitHub repos
3. **Frameworks/Libraries tab:** Extracted from package files (optional)

**Priority:**
1. Show detected technologies first (most relevant to user)
2. Show ontology relationships second (broader context)
3. Show package-extracted frameworks/libraries third (deep dive)

---

## 7. Architecture Impact

### Current Architecture Gaps

| Gap | Severity | Impact |
|-----|----------|--------|
| No skill hierarchy model | High | Cannot represent sub-skills or technology stacks |
| No relationship model | High | Cannot show related skills |
| No technology extraction | Medium | Missed opportunity to leverage GitHub data |
| No package parsing | Medium | Cannot detect frameworks/libraries |
| Frontend-only related skills | Low | Limited to aliases, which are rarely populated |

### Data Flow Changes Required

**Current:**
```
GitHub API → SkillsEventListener → SkillEvidence (aliases = topics)
                                              ↓
                                        SkillRecord (aliases)
                                              ↓
                                        RelatedSkillsPanel (shows aliases)
                                              ↓
                                        Empty (topics are usually empty)
```

**Proposed:**
```
GitHub API → TechnologyExtractionService
              ├── topics → normalize → CanonicalTechnology
              ├── description → AI extraction → technologies
              └── package files (optional) → dependencies

CanonicalSkill → SkillRelationshipService
                   ├── relatedIds → ontology relationships
                   └── getRelatedSkills(canonicalId)

SkillEvidence → payload.technologies → detected technologies

API → GET /skills/{id}/related
        ├── ontology relationships
        └── detected technologies

RelatedSkillsPanel → renders hybrid view
```

---

## 8. Recommendation

### Immediate (No Code Changes)

1. **Keep current empty state messaging** — "Related skills will appear here as ontology relationships are populated. This feature is coming soon."
2. **Do not show aliases as related skills** — aliases are technical identifiers (e.g., "CSE101", issuer names), not meaningful related skills
3. **Document the gap** — add a comment explaining that related skills require ontology/hierarchy implementation

### Short-Term (1-2 Sprints)

1. **Implement Strategy A (Ontology-Only)**
   - Add `parentId`, `skillType`, `relatedIds` to `CanonicalSkill`
   - Add `SkillRelationship` model
   - Create seed data for top 100 skills with relationships
   - Expose `GET /api/skills/{id}/related` endpoint
   - Update `RelatedSkillsPanel` to fetch from backend

2. **Populate `aliases` meaningfully**
   - For GitHub: use `topics` + AI-extracted keywords from `description`
   - For Academic: use course name synonyms
   - For Certificate: use skill area keywords

### Medium-Term (3-4 Sprints)

1. **Implement Strategy B (Detected Technologies)**
   - Build `TechnologyExtractionService`
   - Parse GitHub topics and descriptions
   - Normalize to canonical technology list
   - Store in `SkillEvidence.payload.technologies`
   - Expose `GET /api/skills/{id}/technologies`

2. **Implement Strategy C (Hybrid)**
   - Combine ontology + detected technologies in UI
   - Add filtering, search, and expansion

### Long-Term (Future)

1. **Package file parsing**
   - Background job to fetch and parse `package.json`, `requirements.txt`, etc.
   - Rate-limit aware, cached, incremental
   - Only for user's top N repos by relevance

2. **AI-enhanced extraction**
   - Use LLM to extract technologies from README files
   - Infer frameworks from code patterns
   - Build technology graph from cross-repo analysis

---

## 9. Why NOT Package Parsing First

| Factor | Assessment |
|--------|------------|
| **Value** | Medium — frameworks/libraries are useful but not critical for MVP |
| **Cost** | High — GitHub API rate limits, parsing logic, normalization |
| **Risk** | Medium — incomplete data, false positives, maintenance burden |
| **Dependency** | Low — can be added later without breaking existing UX |

**Recommendation:** Defer package parsing until ontology relationships are stable and GitHub topic/description extraction is proven.

---

## 10. Future Roadmap

| Phase | Scope | Timeline | Dependencies |
|-------|-------|----------|--------------|
| **Phase 1** | Fix aliases, add ontology relationships for top 50 skills | Sprint 1-2 | Product team approves relationship definitions |
| **Phase 2** | Backend `/related` endpoint, frontend fetch | Sprint 2-3 | Phase 1 complete |
| **Phase 3** | GitHub topic/description extraction | Sprint 3-4 | Phase 2 complete |
| **Phase 4** | Hybrid UI (ontology + detected) | Sprint 4-5 | Phase 3 complete |
| **Phase 5** | Package file parsing (optional) | Sprint 6+ | Phase 4 stable, rate limit budget approved |
| **Phase 6** | AI-enhanced extraction | Future | LLM integration mature |

---

## 11. Conclusion

The "Related Skills" section is empty because:

1. **`skill.aliases` is rarely populated** — GitHub topics are optional and usually empty
2. **No ontology relationship system exists** — the codebase has flat skills, no hierarchy
3. **No backend API for related skills** — frontend only transforms aliases

**This is not a bug — it's a missing feature.** The infrastructure (CanonicalSkill, SkillAlias, SkillRecord) exists but lacks the relationship/hierarchy layer.

**Recommended path:**
1. Short-term: Implement ontology-based relationships (Strategy A)
2. Medium-term: Add detected technologies from GitHub (Strategy B)
3. Long-term: Hybrid UI with package parsing and AI extraction (Strategy C)

**Package file parsing is feasible but should be deferred** until the ontology layer is stable and GitHub topic extraction is proven. The rate-limit and normalization challenges make it a poor first choice.
