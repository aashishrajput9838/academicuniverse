# SPRINT-018: Live Verification Investigation Report

## Issue
Sprint-018 Academic Schedule UI renders without errors, but timetable events are not displayed in the weekly grid. Today Schedule and Next Class Widget also render as empty states.

Observed behavior:
- Weekly grid renders with time-slot rows but no class cards in cells
- Today Schedule shows empty state
- Next Class Widget shows empty state

## Investigation Scope
- Examined: `app/dashboard/student/schedule/page.tsx`
- Examined: `components/WeeklyTimetable.tsx`
- Examined: `components/TimetableGrid.tsx`
- Examined: `components/TodaySchedule.tsx`
- Examined: `components/NextClassWidget.tsx`
- Examined: `lib/utils/timetable.ts`
- Examined: backend API controller and model for `/api/academic-schedule/me`

---

## 1. Actual API Response

**Endpoint:** `GET /api/academic-schedule/me`
**Controller:** `backend/src/controllers/academicScheduleController.ts`
**Model:** `backend/src/models/AcademicSchedule.ts`

Confirmed response shape:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Schedule retrieved",
  "data": {
    "_id": "ObjectId",
    "organizationId": "ObjectId",
    "personId": "ObjectId",
    "sourceProcessingId": "string",
    "rawConfidence": 0.95,
    "schedule": [
      {
        "date": "2026-07-20",
        "events": [
          {
            "timeSlot": "09:00 - 10:00",
            "courseCode": "CSE101",
            "courseName": "Data Structures",
            "room": "Lab 3",
            "instructor": "Dr. Smith",
            "type": "Lecture"
          }
        ]
      }
    ],
    "approvedBy": "string",
    "approvedAt": "ISO date string",
    "createdAt": "ISO date string",
    "updatedAt": "ISO date string"
  }
}
```

The `schedule` array contains `ScheduleDay` objects with `date` (ISO string `YYYY-MM-DD`) and `events` array.

---

## 2. Expected TypeScript Interface

**Frontend interface** (`app/dashboard/student/schedule/page.tsx`):
```typescript
interface AcademicSchedule {
  _id: string;
  organizationId: string;
  personId: string;
  sourceProcessingId: string;
  rawConfidence: number;
  schedule: ScheduleDay[];
  approvedBy: string;
  approvedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface ScheduleDay {
  date: string;
  events: ScheduleEvent[];
}

interface ScheduleEvent {
  timeSlot: string;
  courseCode: string;
  courseName: string;
  room: string;
  instructor: string;
  type?: string;
}
```

**Backend model** (`backend/src/models/AcademicSchedule.ts`):
```typescript
export interface IScheduleEvent {
  timeSlot: string;
  courseCode: string;
  courseName: string;
  room: string;
  instructor: string;
  type?: string;
}

export interface IScheduleDay {
  date: string;
  events: IScheduleEvent[];
}
```

**Verdict:** Frontend and backend interfaces are structurally identical. No type mismatch.

---

## 3. Data Flow Trace

### 3.1 page.tsx
```typescript
const days = schedule?.schedule ?? [];
const todayEvents = getTodayEvents(days);
const nextClass = getNextEvent(days);
// ...
<WeeklyTimetable schedule={days} />
```

### 3.2 WeeklyTimetable
```typescript
const weekDates = getCurrentWeekDates(); // Returns 6 dates: current Mon-Sat

const visibleDays = weekDates
  .map((wd) => ({
    ...wd,
    days: schedule.filter((d) => d.date === wd.date) // Exact date match against current week
  }))
  .filter((wd) => wd.days.length > 0);

const allTimeSlots = new Set<string>();
for (const day of schedule) {
  for (const event of day.events) {
    allTimeSlots.add(event.timeSlot.trim()); // Collect ALL time slots from ALL days
  }
}

const sortedTimeSlots = Array.from(allTimeSlots).sort(...);

// Mobile: renders visibleDays grouped by day
// Desktop: passes FULL schedule to TimetableGrid
<TimetableGrid days={schedule} timeSlots={sortedTimeSlots} />
```

### 3.3 TimetableGrid
```typescript
const dayIndexToDate = new Map<number, ScheduleDay[]>();
for (const day of days) {
  const dayIndex = getDayOfWeek(day.date); // 0=Sun, 1=Mon, ..., 6=Sat
  if (dayIndex >= 0) {
    const existing = dayIndexToDate.get(dayIndex) ?? [];
    existing.push(day);
    dayIndexToDate.set(dayIndex, existing);
  }
}

const visibleDays: DayHeader[] = [];
for (let d = 1; d <= 6; d++) { // ONLY Mon-Sat, excludes Sunday
  const daysForIndex = dayIndexToDate.get(d);
  if (daysForIndex && daysForIndex.length > 0) {
    visibleDays.push({ dayIndex: d, date: daysForIndex[0].date });
  }
}

const getEventsForCell = (dayIndex: number, timeSlot: string) => {
  const daysForIndex = dayIndexToDate.get(dayIndex);
  if (!daysForIndex) return null;
  for (const day of daysForIndex) {
    const match = day.events.find((e) => e.timeSlot === timeSlot); // EXACT string match
    if (match) return { event: match, day };
  }
  return null;
};
```

---

## 4. Where Events Disappear

### Step 1: API → page.tsx
- `setSchedule(data.data)` stores the full schedule object
- `days = schedule?.schedule ?? []` correctly extracts the schedule array
- **No data loss here**

### Step 2: page.tsx → TodaySchedule / NextClassWidget
- `getTodayEvents(days)` filters by exact `date === todayStr`
- `getNextEvent(days)` scans forward from today
- If today's date doesn't match any schedule date, empty arrays are returned
- **This explains why Today/Next Class show empty states**

### Step 3: page.tsx → WeeklyTimetable
- `getCurrentWeekDates()` returns 6 dates for the CURRENT calendar week (Mon-Sat)
- `visibleDays` filters `schedule` to only dates matching the CURRENT week
- `allTimeSlots` collects time slots from ALL schedule days regardless of date
- **If schedule contains dates outside the current week, `visibleDays` becomes empty**
- **But `sortedTimeSlots` still contains time slots from ALL days**

### Step 4: WeeklyTimetable → TimetableGrid (DESKTOP)
- `TimetableGrid` receives the FULL `schedule` array, not just current-week days
- It groups ALL days by `getDayOfWeek(day.date)`
- **This is where the disconnect occurs:**
  - `WeeklyTimetable` computes `visibleDays` based on CURRENT week dates
  - `TimetableGrid` groups days by day-of-week from ALL dates
  - If schedule dates are from a different week, `TimetableGrid` still has the data

### Step 5: TimetableGrid cell lookup
- `getEventsForCell` does **exact string match** on `timeSlot`
- If `timeSlot` in `sortedTimeSlots` differs even slightly from `event.timeSlot`, the cell is empty
- **Potential mismatch sources:**
  - Leading/trailing whitespace (mitigated by `.trim()` in `allTimeSlots`)
  - Different formatting like `09:00:00 - 09:50:00` vs `09:00 - 09:50`
  - Case differences

---

## 5. Root Cause Analysis

### Primary Root Cause: Data Source Isolation

The `/api/academic-schedule/me` endpoint reads from the **`AcademicSchedule`** MongoDB collection. This collection is populated exclusively by the **Document AI / Review pipeline** (`backend/src/shared/application/routingEngine.ts` → `AcademicScheduleAdapter`).

The **Ezone scraper** stores timetable data in a **different collection** (`EzoneSemesterData`) via `EzoneRepository`. There is **no code path** that transfers Ezone-extracted timetable data into the `AcademicSchedule` collection.

**Evidence:**
- `backend/src/modules/ezone/routes/ezone.routes.ts` only exposes `/send-otp`, `/verify-otp`, `/profile`
- `backend/src/modules/ezone/services/ezoneSyncService.ts` uses `EzoneRepository`, not `AcademicSchedule`
- `backend/src/shared/application/routingEngine.ts` line 259 writes to `AcademicSchedule` but only via the review/approval flow

**Conclusion:** If timetable data originates from Ezone sync, the AcademicSchedule page will always show empty because it queries a completely different database collection.

### Secondary Root Cause: Date/Week Filtering (if AcademicSchedule is populated)

If the `AcademicSchedule` collection IS populated with valid dates, the `TimetableGrid` would still only show events for days whose ISO date matches the **current calendar week** returned by `getCurrentWeekDates()`. A schedule captured for "2026-07-20 to 2026-07-26" would render correctly only during that specific week. Outside that week, `visibleDays` becomes empty and the grid shows no classes.

### Tertiary Root Cause: Exact Time Slot Matching (minor)

`TimetableGrid` uses exact string equality for `timeSlot` matching. If the stored `timeSlot` format differs even slightly between days (e.g., some have seconds, some don't), the grid would show empty cells despite having matching day and time logic.

---

## 6. Why TodaySchedule and NextClassWidget Also Appear Empty

Both components use `getTodayEvents` and `getNextEvent`, which filter by exact date match against today's date. If:
1. The `AcademicSchedule` collection is empty (primary cause), OR
2. The schedule dates don't include today's date

...both widgets correctly render their empty states.

---

## 7. Recommended Fix Strategy

### Option A: Connect Ezone Sync to AcademicSchedule (Recommended)
Modify the Ezone sync flow to also populate the `AcademicSchedule` collection with the extracted timetable. This aligns the data source with the UI.

**Files to modify:**
- `backend/src/modules/ezone/services/ezoneSyncService.ts` — after successful sync, upsert into `AcademicSchedule`
- Or create a shared service that both pipelines can use

### Option B: Create a Dedicated Ezone Timetable API
Create a new endpoint `/api/ezone/timetable` that reads from `EzoneSemesterData` and returns the same shape as `/api/academic-schedule/me`.

**Files to modify:**
- `backend/src/modules/ezone/routes/ezone.routes.ts` — add new route
- New controller/service for Ezone timetable retrieval

### Option C: Fix Frontend to Show All Dates (Not Recommended)
Change `WeeklyTimetable` to show all schedule days regardless of current week. This would fix the display if data were present, but doesn't solve the data source issue.

### Option D: Add Debug Logging
Add client-side logging to confirm:
1. API response shape and content
2. `schedule.schedule` array length
3. `todayEvents` and `nextClass` values
4. `visibleDays` and `sortedTimeSlots` in `WeeklyTimetable`

This would definitively prove whether the issue is data absence or rendering logic.

---

## 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Data source mismatch | **Critical** | Verify which collection is populated in your environment |
| Week-bound display | Medium | Decide whether weekly view should show current week only or all dates |
| Time slot format drift | Low | Normalize time slots before comparison |
| Sunday exclusion | Low | Add Sunday column if needed |

---

## 9. Recommended Immediate Actions

1. **Verify data source:** Check MongoDB `AcademicSchedule` collection to confirm whether it contains timetable documents.
2. **If empty:** Determine whether Ezone sync or Document AI review is the intended source for the Academic Schedule page.
3. **If populated:** Add console logs to `WeeklyTimetable` to inspect `schedule.schedule.length`, `visibleDays.length`, and `sortedTimeSlots.length`.
4. **Do not modify code** until the data source is confirmed.

---

## 10. Files That Will Require Modification

Depending on the chosen fix:

- **Option A:** `backend/src/modules/ezone/services/ezoneSyncService.ts`
- **Option B:** `backend/src/modules/ezone/routes/ezone.routes.ts`, new controller
- **Option C:** `components/WeeklyTimetable.tsx`, `components/TimetableGrid.tsx`
- **Option D:** `app/dashboard/student/schedule/page.tsx`, `components/WeeklyTimetable.tsx`

No frontend component architecture changes are required. The issue is data availability, not UI rendering logic.
