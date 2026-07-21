# SPRINT-019: Ezone → AcademicSchedule Integration Report

## Summary
Implemented a canonical schedule synchronization layer that transforms Ezone-extracted timetable data into the `AcademicSchedule` schema and upserts it into MongoDB after every successful Ezone sync. The Academic Schedule UI now receives schedule data from the same collection it queries.

## Architecture

```
Ezone Scraper
     │
     ▼
EzoneSyncService.verifyAndSync()
     │
     ├──► EzoneRepository.upsertProfile() ──► EzoneAcademicProfile
     │
     └──► EzoneAcademicScheduleSyncService.syncTimetable()
               │
               ├──► PersonResolver.resolve() ──► personId
               │
               ├──► transformTimetable()
               │         ├── extractDate() ── normalize day → YYYY-MM-DD
               │         ├── map event fields
               │         └── group by date + sort by time
               │
               └──► AcademicSchedule.findOneAndUpdate(upsert)
```

## Files Modified

| File | Change |
|------|--------|
| `backend/src/modules/ezone/services/ezoneAcademicScheduleSync.service.ts` | **New** — Dedicated sync service with transformation logic |
| `backend/src/modules/ezone/services/ezoneSyncService.ts` | Added import, instantiated sync service, extended `verifyAndSync` params, added post-upsert sync call |
| `backend/src/modules/ezone/controllers/ezone.controller.ts` | Pass `email` and `name` from JWT to `verifyAndSync` |

## Data Transformation

### Source: EzoneAcademicProfile.timetable
```typescript
{
  day: string,      // "Monday" or "Mon, July 20, 2026"
  time: string,     // "09:00 - 10:00"
  subject: string,  // "Machine Learning"
  courseCode?: string, // "CSE473"
  faculty: string,  // "Mr Gouri Shankar Mishra"
  room: string      // "Room No 207 Block 1"
}
```

### Target: AcademicSchedule.schedule[]
```typescript
{
  date: string,     // "2026-07-20"
  events: [
    {
      timeSlot: string,   // "09:00 - 10:00"
      courseCode: string, // "CSE473"
      courseName: string, // "Machine Learning"
      room: string,       // "Room No 207 Block 1"
      instructor: string, // "Mr Gouri Shankar Mishra"
      type?: string       // omitted
    }
  ]
}
```

### Mapping Rules
- `day` → `date` via `extractDate()`:
  - ISO format `YYYY-MM-DD` → pass-through
  - Full date strings like `"Mon, July 20, 2026"` → parse to ISO
  - Day names like `"Monday"` → map to current week's Monday-Saturday
- `time` → `timeSlot` (direct mapping)
- `subject` → `courseName` (direct mapping)
- `courseCode` → `courseCode` (optional, omits if empty)
- `faculty` → `instructor` (direct mapping)
- `room` → `room` (direct mapping)
- If `subject` empty: `courseName` falls back to `courseCode` or `"Unknown Course"`

## Synchronization Flow

1. Ezone sync completes and saves to `EzoneAcademicProfile`
2. `EzoneAcademicScheduleSyncService.syncTimetable()` is called
3. `PersonResolver` resolves `personId` from `userId` + optional `email`/`name`
4. Timetable is transformed to `AcademicSchedule` schema with current week dates
5. `AcademicSchedule.findOneAndUpdate()` upserts by `organizationId` + `personId`
6. Result is logged: `[ACADEMIC_SCHEDULE_SYNC] updated schedule for user X: Y days, Z events`

## Key Design Decisions

1. **Dedicated sync service**: Keeps transformation logic isolated from the main sync pipeline and reusable.
2. **Non-blocking sync**: AcademicSchedule sync runs in a `try/catch` after Ezone profile persistence. If it fails, the Ezone sync still succeeds and returns the profile.
3. **Current week date mapping**: Ezone timetable is a repeating weekly schedule. Dates are computed from the current Monday-Saturday so the frontend's `getCurrentWeekDates()` matches.
4. **No duplicate business logic**: Date utilities are reimplemented locally rather than importing frontend code.

## Diagnostics

```
[ACADEMIC_SCHEDULE_SYNC] updated schedule for user 507...: 6 days, 12 events
[ACADEMIC_SCHEDULE_SYNC] No timetable data to sync to AcademicSchedule
[ACADEMIC_SCHEDULE_SYNC] Timetable transformed to empty schedule, skipping AcademicSchedule sync
```

## Regression Risk

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| PersonResolver fails for new users | Low | Falls back to email+name; creates placeholder Person if needed |
| Date mapping mismatch | Low | Handles ISO, full date strings, and day names |
| AcademicSchedule schema change | Low | Uses strict field mapping; unknown fields ignored |
| Sync overhead | Negligible | Single upsert per Ezone sync; bounded timetable size |

## Verification Checklist

- [x] TypeScript compilation: no new errors in `src/modules/ezone/`
- [x] Unit tests pass: 11/11 ezone regression tests
- [ ] Live verification: perform Ezone sync and confirm `/api/academic-schedule/me` returns populated timetable
- [ ] Live verification: confirm Academic Schedule page renders classes in weekly grid
- [ ] Live verification: confirm Today Schedule and Next Class Widget populate
- [ ] Live verification: confirm consecutive syncs update rather than duplicate records

## Constraints Honored

- No frontend changes
- No Academic Schedule UI changes
- No API contract changes
- No Mongo schema changes
- No changes to authentication, attendance, subjects, timetable extraction, CA marks, or academic profile modules
