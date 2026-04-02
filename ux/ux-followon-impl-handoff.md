# UX Follow-On Implementation Handoff

**Role:** Architect  
**Date:** 2026-04-02  
**Prerequisite:** Whole-app token/style rollout implemented and QA-cleared  
**Status:** Ready for Developer  
**Scope:** 5 remaining UX follow-on components listed in task-board

---

## Context

The token rollout (Stages 1–7) is complete and QA-cleared. This handoff covers the five component-level UX items explicitly called out as follow-on work on the task board:

| # | Item | Priority | Risk |
|---|---|---|---|
| 1 | OTP digit auto-advance | High — customer join critical path | Low — local UI only |
| 2 | Sticky CTA bar | High — customer join flow | Low — layout only |
| 3 | Floating cart pill | High — gallery purchase flow | Low — visual only |
| 4 | Hold countdown | Medium — hold confirmation | Low — new component |
| 5 | Masonry gallery grid | Medium — gallery visual | Low — CSS only |

**All five are in scope for the next implementation slice.** None touch API contracts, payment logic, auth, or DB schema. They are safe to implement as a single coordinated pass.

---

## Current State Audit

### OTP Digit Auto-Advance
**File:** `apps/web/src/features/clone-site/customer-route-clients.tsx`  
**Current:** `JoinQueueClient` verify step uses a single `<input id="join-otp" maxLength={6}>`. No auto-advance, no digit boxes.  
**Gap:** Real OTP UX should use individual digit inputs with auto-focus-next behavior.

### Sticky CTA Bar
**File:** `apps/web/src/features/clone-site/customer-route-clients.tsx`  
**Current CSS:** `.bottomBar` class already exists in `customer-flow.module.css` (`position: sticky; bottom: 0; background: rgba(255,255,255,0.95); border-top: 1px solid var(--border); padding: 16px 24px`). Used only in `GalleryClient`.  
**Gap:** `JoinQueueClient` primary action buttons (Continue, Join Queue, Verify) are inline in the form — not in a sticky bottom bar. The pattern is defined but not applied to the join flow.

### Floating Cart Pill
**File:** `apps/web/src/features/clone-site/customer-route-clients.tsx` (`GalleryClient`)  
**Current:** `GalleryClient` uses `.bottomBar` for selection count + price + "Pay & Unlock" button. Full-width sticky bar, no pill treatment.  
**Gap:** UX brief calls for a floating pill — centered, capped width, elevated, rounded — vs a full-width flush bar. Visual upgrade only; logic is already correct.

### Hold Countdown Display
**File:** `apps/web/src/features/customer-booking/screens.tsx` (CUST-05)  
**Current:** CUST-05 slot confirmation shows a static `UIBadge` with "Hold expires in 10:00" — no live countdown.  
**Gap:** A real countdown component is needed. The live customer flow (`/s/[code]`) does not yet have a hold confirmation screen (it's queue-based); countdown is needed in the prototype now, and in the real slot-booking screen when that flow is wired.

### Masonry Gallery Grid
**File:** `apps/web/src/features/clone-site/customer-flow.module.css`  
**Current:** `.grid` uses `display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr))`. `.photoCard` has `aspect-ratio: 1` — all photos crop to squares.  
**Gap:** Masonry layout: photos should render at their natural aspect ratios in a multi-column flow.

---

## Implementation Slice

### 1. OTP Digit Auto-Advance

**Scope:** Replace the single OTP `<input>` in `JoinQueueClient` verify step with 6 individual digit inputs.

**Behavior spec:**
- 6 `<input type="text" inputMode="numeric" maxLength={1}>` elements in a flex row
- On digit entry: advance focus to next input automatically
- On `Backspace` with empty field: focus previous input
- On paste: distribute pasted digits across all 6 fields, focus after last filled
- Aggregate value of all 6 fields = `otpCode` state
- Visual: each digit box ~48px × 56px, 8px border-radius, `border: 1.5px solid #EAEAEA`, focused state `border-color: #0A0A0A; box-shadow: 0 0 0 3px rgba(0,0,0,0.08)`

**New CSS classes (in `customer-flow.module.css`):**
```
.otpInputRow   — flex row, gap 8px, justify-content center
.otpDigit      — single digit input box, centered text, font-size 24px font-weight 700
.otpDigit:focus — near-black focus ring
```

**Files changed:**
- `apps/web/src/features/clone-site/customer-route-clients.tsx` — verify step JSX
- `apps/web/src/features/clone-site/customer-flow.module.css` — new `.otpInputRow`, `.otpDigit` classes

**Preserved:** All API call logic (`/api/auth/phone/verify-otp`, `/api/queue/join`), `otpCode` state, resend/change-number buttons — unchanged.

---

### 2. Sticky CTA Bar

**Scope:** Move the primary action button in `JoinQueueClient` out of the inline form and into a sticky bottom bar matching the pattern already used in `GalleryClient`.

**Behavior spec:**
- Both the `capture` step (Continue / Join Queue button) and the `verify` step (Verify button) should render their primary `<button type="submit">` inside a `.bottomBar` container outside the `<form>`, or the form wraps a `.bottomBar` at bottom of `.sheet`.
- Secondary actions (Resend, Change number) remain in the sheet body.
- The `.sheet` section should use `padding-bottom: 80px` or similar to prevent content hiding behind the sticky bar.
- The existing `.bottomBar` CSS class is already correct — no CSS changes needed unless padding adjustment is needed.

**Files changed:**
- `apps/web/src/features/clone-site/customer-route-clients.tsx` — restructure `JoinQueueClient` render: primary button moves to sticky `.bottomBar`, secondary actions stay in sheet

**Preserved:** All form submit logic, error state, loading state, step transitions — unchanged.

---

### 3. Floating Cart Pill

**Scope:** Upgrade `GalleryClient` bottom bar from full-width flush sticky bar to floating pill treatment.

**New CSS class (in `customer-flow.module.css`):**
```css
.cartPill {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: #0A0A0A;
  color: #FFFFFF;
  border-radius: 999px;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.18);
  min-width: 280px;
  max-width: calc(100vw - 48px);
  z-index: 50;
}
.cartPillCount { font-size: 14px; font-weight: 600; opacity: 0.75; }
.cartPillPrice { font-size: 18px; font-weight: 700; flex: 1; }
.cartPillBtn   { 
  background: #FFFFFF; color: #0A0A0A; 
  border: none; border-radius: 999px;
  padding: 8px 18px; font-weight: 700; font-size: 14px; cursor: pointer;
  white-space: nowrap;
}
.cartPillBtn:disabled { opacity: 0.5; cursor: not-allowed; }
```

**Behavior:**
- Pill is `position: fixed` (not sticky) — floats over gallery grid  
- Hidden when `selected.length === 0` and not `paid`  
- When `paid`: pill shows "Purchased · Download" instead of count/price/pay  
- The existing `.bottomBar` class can be removed from `GalleryClient` JSX and replaced with `.cartPill` structure  
- Add `padding-bottom: 100px` to `.grid` or `.container` so last photo isn't hidden behind the pill

**Files changed:**
- `apps/web/src/features/clone-site/customer-flow.module.css` — add `.cartPill`, `.cartPillCount`, `.cartPillPrice`, `.cartPillBtn`
- `apps/web/src/features/clone-site/customer-route-clients.tsx` — update `GalleryClient` bottomBar → cartPill JSX

**Preserved:** `togglePhoto`, `unlockPhotos`, `selected` state, all Stripe/download logic — unchanged.

---

### 4. Hold Countdown Display

**Scope:** Build a new `HoldCountdown` UI component and wire it into CUST-05 prototype screen.

**New file:** `apps/web/src/components/ui/hold-countdown.tsx`

**Component spec:**
```tsx
interface HoldCountdownProps {
  expiresAtMs: number;   // Unix ms timestamp
  onExpired?: () => void;
}
```

**Behavior:**
- Internally uses `useEffect` with `setInterval(1000)` to count down from `expiresAtMs - Date.now()`
- Renders `MM:SS` display
- At `< 120s` remaining: applies warning treatment (amber text, amber border)
- At `<= 0`: renders "Slot expired" in danger treatment; calls `onExpired` callback
- Pure display component — no API calls

**CSS classes (in `customer-flow.module.css` or inline):**
```
.holdCountdown        — normal state: neutral badge-style display
.holdCountdownWarning — < 2 min: amber text + amber border
.holdCountdownExpired — at 0: danger text
```

**Use in `screens.tsx` (CUST-05):**
- Replace static `UIBadge` "Hold expires in 10:00" with `<HoldCountdown expiresAtMs={Date.now() + 10 * 60 * 1000} />` for prototype display
- When real slot-booking flow is wired, the hold confirmation page passes the real API-returned `hold_expires_at` timestamp

**Files changed:**
- New: `apps/web/src/components/ui/hold-countdown.tsx`
- `apps/web/src/components/ui/index.ts` — export `HoldCountdown`
- `apps/web/src/features/customer-booking/screens.tsx` — CUST-05 swap static badge for `<HoldCountdown>`

**Preserved:** No live flow changes. Prototype-only wiring in this slice. Real slot-booking hold page is future work.

---

### 5. Masonry Gallery Grid

**Scope:** Change the photo grid in `GalleryClient` from uniform square grid to a CSS-columns masonry layout.

**CSS changes (in `customer-flow.module.css`):**

```css
/* Replace .grid */
.grid {
  columns: 2;
  column-gap: 8px;
  padding: 0 12px 120px; /* extra bottom padding for cart pill */
}

/* Update .photoCard */
.photoCard {
  position: relative;
  break-inside: avoid;
  margin-bottom: 8px;
  border-radius: 0.875rem;
  overflow: hidden;
  cursor: pointer;
  background: var(--bg-secondary);
  border: 1px solid rgba(0, 0, 0, 0.06);
  /* Remove aspect-ratio: 1 */
  display: block;
  width: 100%;
}

.photoCard img {
  width: 100%;
  height: auto; /* was 100%; change to auto for natural aspect ratio */
  object-fit: cover;
  display: block;
}
```

**Behavior:**
- Photos render at natural aspect ratio (portrait, landscape, square all render correctly)
- No JS library needed — CSS `columns` is well-supported cross-browser
- `break-inside: avoid` prevents a photo being split across columns
- On desktop (> 640px): can add `columns: 3` in media query

**Files changed:**
- `apps/web/src/features/clone-site/customer-flow.module.css` — `.grid`, `.photoCard`, `.photoCard img` rules

**Preserved:** Photo selection, checkbox, watermark, lightbox, selected state — all unchanged (positional CSS still works).

**Known trade-off:** CSS columns fills left column first, then right — photos flow top-to-bottom within each column. This is not a true Pinterest-style masonry (which requires JS). For MVP this is correct behavior. If true independent-column ordering is needed later, add a JS masonry library (e.g. `masonry-layout` or CSS Grid `masonry` when browser support improves).

---

## Affected Files Summary

| File | Changes |
|---|---|
| `apps/web/src/features/clone-site/customer-route-clients.tsx` | OTP digit inputs, sticky CTA bar in join flow, floating cart pill in gallery |
| `apps/web/src/features/clone-site/customer-flow.module.css` | `.otpInputRow`, `.otpDigit`, `.cartPill`, `.cartPillCount`, `.cartPillPrice`, `.cartPillBtn`, `.holdCountdown*`, updated `.grid`, `.photoCard` |
| `apps/web/src/features/customer-booking/screens.tsx` | CUST-05: HoldCountdown swap |
| `apps/web/src/components/ui/hold-countdown.tsx` | New component |
| `apps/web/src/components/ui/index.ts` | Export HoldCountdown |

**Not changed:**
- All API route handlers (`apps/api/`)
- All authentication paths
- All payment / Stripe logic
- Photographer dashboard, session dashboard
- `tokens.ts`, `globals.css`
- `home.module.css`

---

## Acceptance Criteria

1. **OTP verify screen** shows 6 individual digit boxes; focus advances automatically on digit entry; backspace retreats; paste fills all 6; form submits correctly to `/api/auth/phone/verify-otp`
2. **Join flow CTA** ("Continue", "Join Queue", "Verify") renders in a sticky bottom bar — does not scroll away on short viewports
3. **Gallery cart** renders as a floating pill centered over the grid when ≥ 1 photo selected; not visible when 0 selected (and not paid); pill shows correct count + price + action
4. **Gallery grid** renders photos at natural aspect ratios in two columns; photos do not crop to squares
5. **CUST-05 prototype screen** shows a live countdown from ~10 minutes; turns amber warning color at < 2 min; shows "Slot expired" at 0
6. **Photographer flows untouched** — `/photographer-login.html`, `/photographer`, `/photographer/session/[id]` render identically before and after this change
7. **TypeScript typecheck clean** — `pnpm --dir apps/web typecheck` passes

---

## Validation Required

### Local Verification (Developer before QA handoff)

```
pnpm --dir apps/web dev
```

1. `/s/[code]` — customer join flow
   - Confirm: OTP verify step shows digit boxes, focus auto-advances
   - Confirm: "Continue" and "Verify" buttons are in sticky bottom bar at bottom of viewport
   - Confirm: form submit still calls API correctly (check Network tab)

2. `/g/[token]` — gallery
   - Confirm: photos render at natural aspect ratios (not square-cropped)
   - Confirm: cart pill appears after selecting a photo; shows count + price
   - Confirm: cart pill is invisible at 0 selected
   - Confirm: "Pay & Unlock" in pill still calls `unlockPhotos()` correctly
   - Confirm: post-payment pill shows "Purchased · Download"

3. `/prototype/booking/cust-05` — hold confirmation screen
   - Confirm: countdown ticks down in real time
   - Confirm: turns amber warning styling below 2 min
   - Confirm: shows "Slot expired" at 0

4. TypeScript clean: `pnpm --dir apps/web typecheck` → zero errors

### QA Regression Pass

**Must test — do not skip:**

**Flow 1: Customer join → queue**
1. Open `/s/[code]` on a real or test session code
2. Fill name + phone → Submit → Confirm OTP digit boxes appear
3. Enter digits (manually or paste) → Confirm focus advances correctly
4. Submit verify → Confirm redirect to `/q/[id]`
5. Check queue status renders correctly (unchanged)

**Flow 2: Gallery → purchase**
1. Open `/g/[token]` with a real gallery token
2. Confirm masonry grid renders (natural aspect ratios)
3. Select 1 photo → Confirm cart pill appears with count + price
4. Select 2nd photo → Confirm count + price updates
5. Deselect both → Confirm cart pill disappears
6. Select 1 photo → Click pay action → Confirm Stripe checkout initiates (or free session confirms)

**Flow 3: Prototype booking screens**
1. Load `/prototype/booking/cust-03` → Confirm single input still works (if OTP auto-advance is only in the real flow)
2. Load `/prototype/booking/cust-05` → Confirm countdown renders and ticks

**Regression: Photographer flows (must be unaffected)**
1. `/photographer-login.html` — confirm login page renders
2. `/photographer` — confirm dashboard renders  
3. `/photographer/session/[id]` — confirm session dashboard renders
4. Confirm no new console errors or CSS variable warnings

### Public/E2E Verification (via Tailscale URL)

Run Flows 1 and 2 above at `https://msi.taila8c3ab.ts.net/` after local pass.
Verify mobile at 375px viewport (Chrome DevTools acceptable).

---

## Implementation Sequencing Recommendation

```
Step A: CSS classes first (customer-flow.module.css) — no logic risk, unblocks all
Step B: OTP digit auto-advance (customer-route-clients.tsx, verify step)
Step C: Sticky CTA bar (customer-route-clients.tsx, JoinQueueClient)
Step D: Floating cart pill (customer-route-clients.tsx, GalleryClient)
Step E: HoldCountdown component (new file + index.ts export)
Step F: Wire HoldCountdown into screens.tsx CUST-05
Step G: typecheck + QA pass
```

Steps B–D can be done in a single pass on `customer-route-clients.tsx` after Step A. Steps E–F are independent and can be done in parallel.

---

## Remaining Risks

| Risk | Severity | Mitigation |
|---|---|---|
| OTP paste handler: different browsers handle `onPaste` differently on single-character inputs | Low | Test paste in Chrome + Safari. Use `onPaste` event on the first digit input and distribute characters to all 6 programmatically. |
| Cart pill `position: fixed` overlaps other UI elements (e.g. lightbox, bottom sheet) | Low | Pill has `z-index: 50`; lightbox already uses `z-index: 100`. No conflict. |
| CSS columns masonry changes photo order appearance for users expecting top-left-first ordering | Low | This is expected masonry behavior. No functional issue. |
| Hold countdown uses `Date.now()` for prototype — diverges from real API `hold_expires_at` when real flow is wired | Low/Intended | Prototype uses offset from mount time. When real slot-booking page is built, pass actual API timestamp as `expiresAtMs` prop. |
| TypeScript: `HoldCountdown` component uses `useEffect` with interval — must clean up on unmount | Low | Standard pattern: `return () => clearInterval(timer)` in useEffect. Include in implementation spec. |
| Masonry `.photoCard` `break-inside: avoid` may cause occasional large gaps in columns if a photo is very tall | Low | Acceptable for MVP. Add `max-height: 480px` to `.photoCard img` if gaps become objectionable. |
| `customer-route-clients.tsx` is already large (500+ lines) — OTP + sticky CTA + cart pill changes add density | Medium | Recommend extracting `OtpDigitInput` into `src/components/ui/otp-input.tsx` as a named component. Keeps route-client lean and makes HoldCountdown + OTP reusable patterns. |

---

## What Is Out of Scope

- Real slot-booking hold confirmation page (separate task when slot-booking flow is wired to backend)
- Dark mode treatment for new components
- Animation/transition polish beyond what's already in the token system
- Any API or backend changes
- Any photographer dashboard or session-dashboard changes
