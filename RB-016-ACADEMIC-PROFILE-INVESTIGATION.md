# RB-016: Academic Profile Investigation Report

## Issue
Dashboard authentication succeeds and most profile fields are extracted correctly, but:
- `program` = `N/A`
- `cgpa` = `N/A`

## Investigation Scope
- Examined: `backend/backend/tmp/ezone-diagnostic-1784649676713/dashboard.html`
- Examined: `backend/backend/tmp/ezone-diagnostic-1784649676713/report.json`
- Scope: Academic profile extraction ONLY (Program and CGPA fields)
- No code modifications were made.

---

## 1. Evidence From Diagnostic Capture

**Report error (line 7):**
```
page.evaluate: TypeError: Cannot read properties of null (reading 'textContent')
    at findLabelValue (eval at evaluate (:303:30), <anonymous>:15:68)
```

The dashboard `page.evaluate` threw a `TypeError`. This means the captured DOM represents the portal's rendered state, but the extraction pipeline failed before `mergedData.profile` was returned for this specific capture. However, the HTML itself contains the data.

---

## 2. DOM Analysis

### 2.1 Dashboard Header Profile Snippet (lines 1643–1657)
The visible dashboard header shows limited profile info:
```html
<p>
    <strong>Aashish Rajput</strong>
    <small><input type="hidden" name="system_id" value="2023329421"></small>
    2023329421 <span class="badge badge-success">Active</span>
</p>
<p>Computer Science and Engineering - (SUSET)</p>
...
<div class="arrowprofile" data-toggle="modal" data-target="#exampleModal">
    <i class="fa fa-angle-double-down" aria-hidden="true"></i>
</div>
```

Observed: Name, System ID, Department, and School are directly visible. Program and CGPA are **not** present in the header.

### 2.2 Profile Modal (lines 2205–2248)
Detailed profile data is inside a hidden Bootstrap modal:
```html
<div class="profilepopup modal fade bd-example-modal-lg" id="exampleModal" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-body">
        <ul>
            <li><strong>Name</strong> Aashish Rajput</li>
            <li><strong>System ID </strong> 2023329421</li>
            <li><strong>Department </strong> Computer Science and Engineering</li>
            <li><strong>School </strong> SUSET</li>
            <li><i class="fa fa-check" aria-hidden="true"></i><strong>Program [G]</strong> Bachelor of Technology (Computer Science & Engineering)</li>
            <li><strong>Programme Status </strong> MATR</li>
            <li><strong>Semester </strong> S7</li>
            <li><strong>Term </strong> 2601</li>
            <!-- ... -->
        </ul>
    </div>
</div>
```

Observed: The modal contains `Program [G]` with value `Bachelor of Technology (Computer Science & Engineering)`. The modal is `aria-hidden="true"` with class `modal fade`, meaning it is hidden by CSS until triggered.

### 2.3 CGPA Widget (lines 2829–2915)
CGPA is rendered as an ApexCharts radial bar chart:
```html
<div class="col-md-3">
    <div class="studentbg">
        <ul class="nav nav-tabs">
            <li class="nav-item"><a class="nav-link active" href="#home">CGPA</a></li>
            <li class="nav-item"><a class="nav-link" href="#profile">SGPA</a></li>
        </ul>
        <div class="tab-content">
            <div class="tab-pane fade show active" id="home">
                <div id="chartcgpa" style="min-height: 275px;">
                    <svg ... width="0" height="275" ...>
                        <!-- Empty SVG structure -->
                    </svg>
                </div>
                <script>
                    var cgpa = 0; // Your CGPA value
                    var maxCgpa = 10; // Maximum CGPA
                    var percentage = (cgpa / maxCgpa) * 100;
                    series: [percentage],
                    value: { formatter: function(val) { return cgpa.toFixed(2); } }
                </script>
            </div>
        </div>
    </div>
</div>
```

Observed:
- `var cgpa = 0;` is a **placeholder**, not the student's actual CGPA.
- The ApexCharts SVG has `width="0"`, indicating the chart was **not rendered** during capture.
- The `data:value` attribute on SVG paths is absent because ApexCharts did not populate the SVG.
- No window-level variable (`window.cgpa`) is set.

---

## 3. Current Extraction Path

### 3.1 Program
```typescript
// EzoneScraper.extractPageData → findLabelValue
program: findLabelValue('Program') || findLabelValue('Program [G]') || findLabelValue('Course'),
```

`findLabelValue` searches `td, th, span, div, p, strong, b, label` for exact text match.

**Why it returns N/A:**
1. `findLabelValue('Program')` performs an exact match. No element contains exactly `Program` (the modal contains `Program [G]`, and `Programme Status` is a different label).
2. `findLabelValue('Program [G]')` would match the `<strong>Program [G]</strong>` inside the modal, **if** the element is present in the DOM when `page.evaluate` runs.
3. The diagnostic capture shows the modal is server-rendered inside `#exampleModal`, but the capture's dashboard extraction failed. The failure could be due to the modal being unrendered or dynamically loaded in the live portal.
4. If the portal loads `#exampleModal` content via AJAX after a profile click (not confirmed in the captured scripts), the initial `page.evaluate` would not find it.

### 3.2 CGPA
```typescript
// EzoneScraper.extractCgpa
// Strategy 1: runtime evaluation of window/script variables
//   - Matches var cgpa = 0; in script tag → returns "0"
//   - Code then rejects "0" because runtimeCgpa !== '0' is FALSE
// Strategy 2: SVG data attribute fallback
//   - SVG has width="0", no data:value attributes → returns null
// Final fallback: "N/A"
```

**Why it returns N/A:**
1. The portal serves a **placeholder** value `cgpa = 0` in the static HTML.
2. The code explicitly rejects `0`: `if (runtimeCgpa !== null && runtimeCgpa !== undefined && runtimeCgpa !== '0')`.
3. The ApexCharts chart is not rendered (`width="0"`), so SVG `data:value` attributes do not exist.
4. There is no `window.cgpa` or other global variable containing the real value.
5. No AJAX endpoint is shown in the captured scripts that fetches CGPA data separately.

---

## 4. Root Cause

### Program
**Root Cause: Exact-match label fragility with dynamic modal loading.**

The portal embeds program details inside a hidden Bootstrap modal (`#exampleModal`) using the label `Program [G]` rather than `Program`. The current scraper requires exact text matches and does not scope searches to the profile modal. If the live portal loads the modal content dynamically after page load (even though the captured HTML shows it server-rendered), the initial `page.evaluate` never sees the data.

### CGPA
**Root Cause: Placeholder value + unrendered chart.**

The portal serves `var cgpa = 0;` as a static placeholder in the HTML. The ApexCharts chart that should display the real CGPA is not rendered in the captured state (`width="0"`). The current extraction logic correctly identifies the placeholder but rejects `0` as a valid CGPA, then falls back to SVG attributes that do not exist, returning `N/A`.

---

## 5. Recommended Implementation Strategy

### Program
1. **Scope extraction to the profile modal.** Query `#exampleModal` directly and search for `Program [G]` within that subtree.
2. **Add fallback parsing.** If the modal is not present, look for program info in the visible profile header or window variables.
3. **Relax exact-match requirement.** Use `includes('Program')` or `startsWith('Program')` for stronger match candidates within the profile modal only, to avoid collision with `Programme Status`.

Pseudocode:
```typescript
const profileModal = document.querySelector('#exampleModal');
const programEl = profileModal?.querySelector('strong') || Array.from(profileModal?.querySelectorAll('*') || []).find(el => 
    (el.textContent?.trim() || '').toUpperCase() === 'PROGRAM [G]'
);
if (programEl) {
    const parent = programEl.parentElement;
    program = clean(parent.textContent?.replace(programEl.textContent || '', '').trim() || '');
}
```

### CGPA
1. **Wait for chart rendering.** After page load, wait for `#chartcgpa` SVG to have non-zero width or for `apexcharts-svg` to contain rendered paths.
2. **Extract from rendered SVG.** Read `data:value` attributes from the rendered ApexCharts path elements.
3. **Compute from series value.** If the chart is rendered, read the `series[0]` value from the chart options or compute from `(cgpa / maxCgpa) * 100`.
4. **Persist JavaScript variable.** Inject a script to expose the resolved CGPA on `window.__EZONE_DATA__` for reliable extraction.

Pseudocode:
```typescript
await page.waitForFunction(() => {
    const svg = document.querySelector('#chartcgpa svg');
    return svg && svg.getAttribute('width') !== '0';
}, { timeout: 10000 });

const cgpaPath = document.querySelector('[seriesName="CGPA"] path');
if (cgpaPath) {
    const value = cgpaPath.getAttribute('data:value');
    if (value) return value;
}

// Fallback: read from script tag only if cgpa !== 0
const scripts = Array.from(document.querySelectorAll('script'));
const cgpaScript = scripts.find(s => /var\s+cgpa\s*=/.test(s.textContent || ''));
if (cgpaScript) {
    const match = cgpaScript.textContent.match(/var\s+cgpa\s*=\s*([\d.]+)/);
    if (match && match[1] !== '0') return match[1];
}
```

---

## 6. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Profile modal loaded dynamically via AJAX | High | Wait for modal content or click profile trigger before extraction |
| CGPA placeholder `0` is the actual value for some students | Low | Only reject `0` if chart is unrendered; accept `0` if chart shows valid state |
| ApexCharts `data:value` attribute format changes | Medium | Parse SVG path text or use chart instance API as fallback |
| Multiple profile modals on page | Low | Target `#exampleModal` specifically |
| Portal updates modal ID or label text | Medium | Use multiple fallback selectors |

---

## 7. Files Requiring Modification (Pending Approval)

- `backend/src/modules/ezone/scrapers/ezone.scraper.ts`
  - `extractPageData()`: modify `findLabelValue` usage for profile fields to scope to `#exampleModal`
  - `extractCgpa()`: replace stale placeholder-only logic with chart-rendered-state detection and SVG extraction

No changes to authentication, navigation, attendance, subjects, timetable, CA marks, MongoDB, or API contracts.
