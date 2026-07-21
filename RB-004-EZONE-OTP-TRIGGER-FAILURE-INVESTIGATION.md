# RB-004 — Ezone OTP Trigger Failure: Investigation Report

**Date:** 2026-07-21  
**Status:** Investigation Complete — No Implementation  
**Scope:** Playwright selector `#send_stu_otp_phone` failure in Ezone OTP flow  
**Constraint:** No code changes. No business logic modifications.

---

## 1. Current Page URL

```
https://student.sharda.ac.in/admin
```

---

## 2. Old Selector

```css
#send_stu_otp_phone
```

**Location in code:** `backend/src/modules/ezone/providers/ezone-session.provider.ts:120`

---

## 3. HTML Around the OTP Button (Live Page)

Fetched directly from `https://student.sharda.ac.in/admin` on 2026-07-21:

```html
<li id="otp-send">
    <label>System ID</label>
    <input type="text" class="form-control" name="system_id" id="system_id" 
           onkeyup="this.value=this.value.replace(/[^\d]/,'')" maxlength='10' autocomplete=OFF>
    
    <!--<a href="javascript:void(0);" id="send_stu_otp_phone" data-mode="2" style="background: #ed027b!important">
        <i class="fa fa-phone" aria-hidden="true"></i> OTP
    </a>--> 
    
    <a href="javascript:void(0);" id="send_stu_otp_email" data-mode="1">
        <i class="fa fa-envelope" aria-hidden="true"></i> OTP
    </a>  
    
    <p id="systemIdErr" style="color:red;display:none">This field is required*</p>
</li>
```

---

## 4. Correct Selector

```css
#send_stu_otp_email
```

---

## 5. Root Cause

The Ezone portal has been updated. The **phone OTP button** (`#send_stu_otp_phone`) has been **removed from the DOM and replaced with an email OTP button** (`#send_stu_otp_email`).

Evidence:

1. **`#send_stu_otp_phone` is wrapped in an HTML comment** in the live page:
   ```html
   <!--<a href="javascript:void(0);" id="send_stu_otp_phone" ...>...</a>-->
   ```
   HTML comments are not part of the DOM. Playwright's `page.locator()` and `page.waitForSelector()` cannot find elements inside comments.

2. **`#send_stu_otp_email` is the active element** and is directly in the DOM:
   ```html
   <a href="javascript:void(0);" id="send_stu_otp_email" data-mode="1">...</a>
   ```

3. **The JavaScript event handler supports both** (for backward compatibility during transition):
   ```javascript
   $('#send_stu_otp_email, #send_stu_otp_phone').click(function () {
       // AJAX call to send OTP
   });
   ```

4. **No iframe, modal, or shadow DOM** — the button is a direct child of the login form in the main document.

5. **No AJAX loading required** — the button is present immediately after page load. The `data-mode` attribute differs:
   - Old: `data-mode="2"` (phone)
   - New: `data-mode="1"` (email)

---

## 6. Why Playwright Fails

| Check | Result |
|-------|--------|
| Selector exists in DOM? | NO — wrapped in HTML comment |
| Selector is visible? | N/A — element not in DOM |
| Inside iframe? | NO |
| Inside modal? | NO |
| Inside shadow DOM? | NO |
| Appears after AJAX? | NO — present in initial HTML |
| Hidden via CSS? | NO — element doesn't exist |

Playwright throws: `Verified OTP trigger button (#send_stu_otp_phone) not found or not visible.`

This is expected behavior because the selector targets a non-existent element.

---

## 7. Impact Analysis

| Area | Impact |
|------|--------|
| `triggerOtp` flow | BROKEN — cannot find OTP button |
| `verifyOtp` flow | UNKNOWN — depends on whether OTP was sent via email |
| Student Ezone sync | BLOCKED — entire sync pipeline depends on OTP trigger |
| Faculty/Admin flows | UNAFFECTED — only student OTP trigger uses this selector |

---

## 8. Additional Findings

1. **The portal still accepts phone OTP via AJAX** — the endpoint `https://student.sharda.ac.in/studentlogin/sendotp` accepts `mode` parameter (`1` = email, `2` = phone). The backend logic supports both modes.

2. **`data-mode="1"`** on the new button indicates email mode. If the system needs phone OTP (`mode="2"`), the backend endpoint may still support it, but the UI no longer exposes the phone option.

3. **No screenshot available** — this investigation was performed via live HTML fetch. Screenshot capture would require running Playwright against the live portal, which is outside the scope of static code investigation.

---

## 9. Recommended Fix Direction (For Approval)

The minimal fix is to update the selector in `ezone-session.provider.ts`:

```typescript
// Before
const otpTriggerSelector = '#send_stu_otp_phone';

// After
const otpTriggerSelector = '#send_stu_otp_email';
```

No other changes are required because:
- The AJAX endpoint and `data-mode` handling remain the same
- The event handler jQuery selector already includes both buttons
- The OTP input field (`#otp`) and submit flow remain unchanged

---

## 10. Next Steps

1. **Awaiting approval** to implement the selector update.
2. Do not implement until RB-004 is approved.
3. Implementation should be limited to `backend/src/modules/ezone/providers/ezone-session.provider.ts` line 120.
4. Verify by running the OTP trigger flow against the live portal.

---

*Investigation complete. No implementation performed.*
