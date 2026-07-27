# Sprint-003A Architecture Plan
**Sprint:** 003A — Skills Tracker V2 (Skill Intelligence Dashboard)  
**Date:** 2026-07-19  
**Status:** COMPLETE  

---

## 1. Executive Summary

Sprint-003A transforms the static Skills Tracker page into an intelligent, evidence-driven Skills Intelligence Dashboard. The implementation is entirely frontend-focused, reusing existing backend APIs without any schema changes, migrations, or backend modifications.

**Architecture Principles:**
- Frontend-first: All intelligence is derived from existing backend endpoints
- Zero backend changes: No new APIs, no schema modifications
- Component-driven: Reusable, composable UI components
- Type-safe: Full TypeScript coverage for all data contracts
- Responsive: Mobile-first design with dark theme support

---

## 2. System Context

### 2.1 Existing Backend APIs (Reused)

| Endpoint | Method | Response | Purpose |
|----------|--------|----------|---------|
| `/api/skills/me` | GET | `SkillProfileResponse` | Fetch all skill records for authenticated user |
| `/api/skills/me/:skillId/evidence` | GET | `SkillDetailDTO` | Fetch evidence for a specific skill |
| `/api/skills/me/summary` | GET | `SkillSummaryResponse` | Fetch skill summary with top skills and gaps |

### 2.2 Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌───────────────────┐
│  Student opens  │────▶│  Skills Store    │────▶│  Backend APIs     │
│  Skills Page    │     │  (Zustand)       │     │  (/api/skills/*)  │
└─────────────────┘     └──────────────────┘     └───────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐     ┌───────────────────┐
                       │  UI Components   │◀────│  JSON Responses   │
                       │  (React/TSX)     │     └───────────────────┘
                       └──────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  Student sees    │
                       │  Rich Dashboard  │
                       └──────────────────┘
```

---

## 3. Frontend Architecture

### 3.1 Directory Structure

```
app/dashboard/student/skills/
├── page.tsx                          # Main dashboard page
├── skillsApi.ts                      # API client functions
├── types/
│   └── skills.ts                     # TypeScript interfaces
├── store/
│   └── skillsStore.ts                # Zustand state management
└── components/
    ├── SkillCard.tsx                 # Expandable skill card
    ├── SkillDetailPanel.tsx          # Full skill detail modal
    ├── EvidenceExplorer.tsx          # Evidence source list
    ├── SkillTimeline.tsx             # Skill evolution timeline
    ├── SourceContributionChart.tsx   # Source breakdown chart
    ├── ConfidenceExplanation.tsx     # Confidence rationale
    ├── MissingEvidencePanel.tsx      # Missing evidence suggestions
    ├── RelatedSkillsPanel.tsx        # Related skills (placeholder)
    ├── SkillGrowthTracker.tsx        # Historical progression
    ├── ResumeReadinessBadge.tsx      # Resume readiness indicator
    ├── EmptyState.tsx                # No skills empty state
    └── ErrorState.tsx                # Error state with retry
```

### 3.2 State Management

**Technology:** Zustand with Immer middleware

**State Shape:**
```typescript
{
  profile: SkillProfileResponse | null;
  summary: SkillSummaryResponse | null;
  selectedSkill: SkillRecordDTO | null;
  selectedSkillDetail: SkillDetailDTO | null;
  loading: boolean;
  detailLoading: boolean;
  error: string | null;
  lastFetchedAt: Date | null;
}
```

**Actions:**
- `refresh(backendToken)` — Fetches profile and summary in parallel
- `loadDetail(backendToken, skillId)` — Fetches evidence for selected skill
- `setSelectedSkill(skill)` — Updates selected skill for detail panel
- `reset()` — Clears all state

### 3.3 Component Hierarchy

```
StudentSkillsTracker (page)
├── Header (title, refresh button)
├── SummaryStats (4 stat cards)
├── LoadingState (skeleton cards)
├── ErrorState (error message + retry)
├── EmptyState (CTA actions)
├── Filters (category, level dropdowns)
├── SkillsGrid
│   └── SkillCard[] (expandable cards)
│       └── ExpandedDetails (aliases, view details button)
└── SkillDetailPanel (modal)
    ├── Tabs (Overview, Evidence, Timeline, Growth)
    ├── OverviewTab
    │   ├── SkillDetailsGrid
    │   ├── ResumeReadinessBadge
    │   ├── ConfidenceExplanation
    │   ├── SourceContributionChart
    │   ├── MissingEvidencePanel
    │   └── RelatedSkillsPanel
    ├── EvidenceTab
    │   └── EvidenceExplorer
    ├── TimelineTab
    │   └── SkillTimeline
    └── GrowthTab
        └── SkillGrowthTracker
```

---

## 4. API Consumption Plan

### 4.1 Request Flow

```typescript
// 1. Page mounts → refresh() called
// 2. Parallel API calls:
const [profile, summary] = await Promise.all([
  fetchSkillProfile(backendToken),   // GET /api/skills/me
  fetchSkillSummary(backendToken),   // GET /api/skills/me/summary
]);

// 3. User clicks skill → loadDetail() called
const detail = await fetchSkillEvidence(backendToken, skillId); // GET /api/skills/me/:skillId/evidence
```

### 4.2 Error Handling

- 401 → AuthContext handles redirect to login
- 404 → Empty state with "no skills" message
- 500 → Error state with retry button
- Network → Error state with retry button

### 4.3 Caching Strategy

- Profile data cached in Zustand store
- Detail data cached per skill in Zustand store
- No server-side caching (data is user-specific and fresh)
- `useModuleRefresh` hook triggers refresh on module updates

---

## 5. UI/UX Design System

### 5.1 Design Tokens

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS v3.4
- **Dark Theme:** CSS variables with `dark` class selector
- **Icons:** Lucide React
- **Animations:** Tailwind CSS Animate
- **Components:** Shadcn/ui patterns (Card, Button, Select)

### 5.2 Color Palette

| Element | Color |
|---------|-------|
| Primary | Emerald (`text-emerald-400`) |
| Background | Slate 900 (`bg-slate-900`) |
| Card | Slate 900/50 with backdrop blur |
| Border | Slate 700 |
| Text Primary | White |
| Text Secondary | Slate 400 |
| Success | Emerald 400 |
| Warning | Yellow 400 |
| Error | Red 400 |
| Info | Blue 400 |

### 5.3 Typography

- Headings: Bold, white, responsive sizing
- Body: Slate 400 for secondary text
- Labels: Uppercase tracking-wider for section headers
- Evidence metadata: Small (text-xs) for timestamps and confidence

### 5.4 Responsive Breakpoints

| Breakpoint | Columns |
|------------|---------|
| Mobile (< 768px) | 1 column |
| Tablet (768px+) | 2 columns |
| Desktop (1024px+) | 3 columns |

### 5.5 Animations

- Card hover: Border color transition (200ms)
- Modal open: Fade in with backdrop blur
- Skeleton: Pulse animation
- Progress bars: Width transition (500ms)
- Expand/collapse: Chevron rotation

---

## 6. Dashboard Sections Mapping

| Section | Component | Data Source | Notes |
|---------|-----------|-------------|-------|
| 1. Verified Skills | `SkillCard` | `profile.skills` | Expandable cards with filters |
| 2. Skill Details | `SkillDetailPanel` | `detail` | Tabbed modal view |
| 3. Evidence Explorer | `EvidenceExplorer` | `detail.evidence` | Clickable source cards |
| 4. Timeline | `SkillTimeline` | `detail.evidence` sorted by date | Visual vertical timeline |
| 5. Source Contribution | `SourceContributionChart` | `detail.evidence` | Horizontal bar chart |
| 6. Confidence Explanation | `ConfidenceExplanation` | `detail.evidence` | Bulleted rationale |
| 7. Missing Evidence | `MissingEvidencePanel` | Derived from evidence gaps | Static suggestions |
| 8. Related Skills | `RelatedSkillsPanel` | `skill.aliases` | Placeholder support |
| 9. Resume Readiness | `ResumeReadinessBadge` | Derived from score + count | 3-state badge |
| 10. Skill Growth | `SkillGrowthTracker` | `detail.evidence` (derived) | Vertical timeline |
| 11. Empty States | `EmptyState` | N/A | CTA actions |
| 12. Loading States | Skeleton cards | N/A | No layout shift |
| 13. Error States | `ErrorState` | N/A | Retry support |

---

## 7. Performance Considerations

### 7.1 Bundle Size

- Components are client-side only (`'use client'`)
- No heavy charting libraries (using CSS-based bar charts)
- Lucide icons tree-shaken by default
- Zustand store is lightweight (~1KB)

### 7.2 Rendering Optimization

- Skills grid uses CSS Grid (GPU-accelerated)
- Modal uses fixed positioning with overflow scroll
- Evidence lists are virtualized if > 50 items (future)
- Images lazy-loaded (future)

### 7.3 Network Optimization

- Parallel API calls for profile + summary
- Detail fetched only on demand (lazy loading)
- No polling (event-driven via `useModuleRefresh`)

---

## 8. Accessibility Review

- All interactive elements have `aria-label` attributes
- Color contrast meets WCAG AA standards
- Keyboard navigation supported for all tabs and cards
- Focus management in modal (trapped)
- Semantic HTML structure
- Loading states announced via skeleton screens

---

## 9. Backward Compatibility

- No backend changes required
- No database migrations
- No feature flags needed
- Existing `/skills` page URL preserved
- All existing routes unchanged

---

## 10. Future Integration Points

| Feature | Integration Point | Notes |
|---------|------------------|-------|
| Resume Builder | Skill card export | Skills can be exported as resume entries |
| AI Recommendations | Missing evidence panel | Suggestions can become AI-driven |
| Job Matching | Related skills | Ontology relationships enable matching |
| Career Profile | Skill growth tracker | Historical data feeds career timeline |
| Growth Hub | Source contribution | Shared evidence across modules |

---

## 11. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Backend API response shape mismatch | LOW | MEDIUM | Types defined from DTOs; compile-time safety |
| Large skill lists cause performance issues | MEDIUM | LOW | Virtualization planned for >50 items |
| Modal accessibility issues | LOW | LOW | Standard Radix patterns used |
| Dark theme contrast issues | LOW | LOW | Using existing design system tokens |

---

*Plan generated by Kilo — Sprint-003A Architecture*
