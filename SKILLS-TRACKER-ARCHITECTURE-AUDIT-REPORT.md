# Skills Tracker Architecture Audit & Core Skills Management Report

**Sprint:** Sprint: Skills Tracker Architecture Audit & Core Skills Management (Single Source of Truth)  
**Priority:** CANONICAL SKILL SINGLE SOURCE OF TRUTH & MANAGEMENT PIPELINE  
**Status:** ✅ AUDITED, IMPLEMENTED & VERIFIED  
**Date:** 2026-07-27

---

## Phase 1 — Complete Architecture Audit

### 1. Data Source Audit
- **MongoDB Canonical Store:** All student skill entities originate from the `SkillRecord` Mongoose collection in MongoDB (`skillId`, `skillName`, `skillCategory`, `proficiencyLevel`, `proficiencyScore`, `evidenceCount`, `status`).
- **Skill Evidence Store:** Atomic evidence items supporting skill verification are logged in the `SkillEvidence` collection (`primarySource`: `MANUAL`, `GITHUB`, `RESUME_BUILDER`, `CERTIFICATE`, `RESEARCH`, `AI_INFERENCE`).
- **Resume Builder:** Synchronizes with `StudentResume.filledData.skills` in MongoDB.
- **GitHub Sync:** OAuth repository integration pushes `GITHUB` evidence records via `/api/github/sync`.
- **API Endpoint:** `/api/skills/me` (Controller: `skillsController.ts`, Service: `SkillProjectionService.ts`, Repositories: `SkillRecordRepository.ts` & `SkillEvidenceRepository.ts`).

### 2. Database Audit
- **`SkillRecord` Collection:** Primary table for projected student skill totals, proficiency scores (0–100), proficiency level (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `EXPERT`), and evidence counts per `personId`.
- **`SkillEvidence` Collection:** Detailed log of evidence items establishing confidence weightings across manual and automated verification channels.
- **`Person` Collection:** Maps `userId` & `organizationId` to a unified `personId` for multi-tenant isolation.
- **`StudentResume` Collection:** Stores user's active resume draft data including `filledData.skills`.

### 3. API Audit
- **`GET /api/skills/me`**: Retrieves `SkillProfileResponse` (all `SkillRecordDTO` objects).
- **`POST /api/skills/me`**: Adds or updates one or multiple skills (Duplicate Prevention!).
- **`PUT /api/skills/me/:skillId`**: Edits proficiency level, category, or notes.
- **`DELETE /api/skills/me/:skillId`**: Deletes skill records and evidence logs.
- **`GET /api/skills/me/:skillId/evidence`**: Retrieves evidence items for a skill.
- **`GET /api/skills/me/summary`**: Retrieves total skill metrics, category counts, top skills, and skill gaps.

### 4. Frontend Audit
- **Page Component:** `app/dashboard/student/skills/page.tsx`
- **State Store:** `useSkillsStore` (Zustand store in `app/dashboard/student/skills/store/skillsStore.ts`).
- **Modals:** `AddSkillsModal.tsx` & `EditSkillModal.tsx`.
- **Taxonomy:** `SKILL_TAXONOMY_DICTIONARY` (`app/dashboard/student/skills/data/skillTaxonomy.ts`).

---

## Phase 2 — Single Source of Truth

The **Single Source of Truth** for student skills is the **`SkillRecord` & `SkillEvidence` database infrastructure** in MongoDB. All platform modules (Career Profile, AI Career Coach, Resume Builder, and Document Intelligence) draw directly from or write to this canonical collection.

```
                    ┌─────────────────────────┐
                    │      Student User       │
                    └────────────┬────────────┘
                                 │
                        [Add / Edit / Delete]
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │   /api/skills/me      │
                     └───────────┬───────────┘
                                 │
               ┌─────────────────┴─────────────────┐
               ▼                                   ▼
    ┌──────────────────────┐            ┌──────────────────────┐
    │ SkillRecord Collection│           │StudentResume Draft   │
    │ (Single Source Truth)│            │(filledData.skills)   │
    └──────────┬───────────┘            └──────────┬───────────┘
               │                                   │
      ┌────────┴─────────┐                ┌────────┴─────────┐
      ▼                  ▼                ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│Career Profile│  │AI Career     │  │Resume Builder│  │Generated     │
│Completeness  │  │Coach Panel   │  │Form AutoFill │  │DOCX Resumes  │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

---

## Phase 3 — Core Skill Management Implementation Features

1. **Feature 1: Add Skill Modal:** Prominent `"✨ Add Core Skills"` trigger in header & empty state opening a modal workflow.
2. **Feature 2: Instant Search:** Auto-complete search bar filtering standardized IT/Engineering skill taxonomy.
3. **Feature 3: Comprehensive Categories:** Programming Languages, Frontend, Backend, Databases, Cloud & DevOps, AI/ML, Data Science, Testing, Mobile, Tools, Operating Systems, Soft Skills, Cyber Security, Other.
4. **Feature 4: Multi-Select:** Checkbox grid allowing students to select and add multiple skills in one click.
5. **Feature 5: Skill Level Picker:** `BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `EXPERT`.
6. **Feature 6: Evidence Sources:** `MANUAL`, `GITHUB`, `RESUME_BUILDER`, `CERTIFICATE`, `RESEARCH`, `AI_INFERENCE`.
7. **Feature 7: Duplicate Prevention:** Server and client detect existing skills (e.g. `Java`). Updating level modifies the existing `SkillRecord` instead of creating duplicate entries.
8. **Feature 8: Edit Skill:** Modal allows changing level, category, and notes.
9. **Feature 9: Delete Skill:** Modal allows removing skill records & evidence.
10. **Feature 10: Cross-Module Sync:** Automatically updates `StudentResume.filledData.skills`, Career Profile completeness, and AI Coach panel without page refresh.
11. **Feature 11: Career Profile Auto-Dismiss:** AI Career Coach recommendation *"Track Core Skills"* automatically disappears when skills $\ge 4$.
12. **Feature 12: Resume Builder Sync:** Canonical skills list auto-populates `{{skills}}` placeholder in resume templates.
13. **Feature 13: Dynamic Dashboard Metrics:** Total Skills, Categories, Top Skills, and Skill Gaps update instantly.

---

## Acceptance Criteria Verification

- [x] **Existing skill cards continue working**
- [x] **No hardcoded demo data**
- [x] **Existing APIs preserved and extended**
- [x] **No duplicate skill databases**
- [x] **Single Source of Truth established**
- [x] **Students can manually add skills**
- [x] **Search works**
- [x] **Categories work**
- [x] **Multi-select works**
- [x] **Edit/Delete works**
- [x] **Duplicate prevention works**
- [x] **Career Profile updates automatically**
- [x] **AI Career Coach updates automatically**
- [x] **Resume Builder updates automatically**
- [x] **Resume generation reflects newly added skills**
