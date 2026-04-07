# Fix Plan: Manual Test Findings — 2026-04-05
**Role: Architect**
**Produced for: Developer handoff (execute in one pass)**

---

## Section A — Bug Fixes

---

### Bug 1: Email Notifications Not Working

**Root cause:**
The email path uses a worker/outbox model. Notifications are written to `notification_outbox` by the API, then dispatched by `apps/worker`. Two things can block delivery:
1. **`EMAIL_PROVIDER` env var is missing or not `"ses"`** — `app.ts` defaults to `LocalStubEmailService` which silently discards all emails. This is almost certainly the issue in dev.
2. **Worker is not running** — outbox rows pile up unprocessed.
3. **AWS SES sender identity not verified** — SES rejects from an unverified sender.

**Diagnosis steps (for Developer to confirm before deploy):**
- Check `EMAIL_PROVIDER` in `.env` / `.env.local`. If not `"ses"`, emails never go to SES.
- Check `SES_FROM_EMAIL` is a verified SES identity in the configured region.
- Confirm the worker process is running (`apps/worker/src/worker.mjs`).
- Check `notification_outbox` table: `SELECT status, error_message FROM notification_outbox ORDER BY created_at DESC LIMIT 20;`

**Fix:**
No code change needed for the email path itself — the architecture is correct. The fix is env/ops:

File: `.env` (or `.env.local` at repo root):
```
EMAIL_PROVIDER=ses
SES_FROM_EMAIL=<verified-ses-sender@yourdomain.com>
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
```

Worker must be running alongside the API. If worker is not started, start it:
```
cd apps/worker && node src/worker.mjs
```

**If dev testing without SES:** There is currently no console-log fallback for the stub service. As a dev convenience (not required for MVP), the stub could log to console. That is a nice-to-have, not a blocking fix.

---

### Bug 2: "Start Shoot" Button Not Working

**Root cause:**
`patchQueue(entry.id, "start")` calls `PATCH /api/queue/:id/start` which maps to `startQueueEntry()` in the repo. That method **requires `arrivalPinVerifiedAt` to be set** before it allows the status transition to `in_progress`:

```ts
// repositories.ts line 1458-1459
if (!existing.entry.arrivalPinVerifiedAt) {
  return { ok: false, reason: "pin_not_verified" };
}
```

The API returns HTTP 409 with `{ error: "Arrival PIN must be verified before starting the session" }`.

The frontend's `patchQueue` function calls the API but **silently discards errors** — it just calls `await refresh()` with no error display, so the photographer sees nothing happen.

There are two valid fixes:

**Option A (MVP-safe, recommended): Surface the PIN verification error in the UI**
The photographer needs to verify the arrival PIN before hitting "Start Shoot". The UI should show the error message returned by the API.

File: `apps/web/src/features/clone-site/session-dashboard-client.tsx`

Change `patchQueue` to capture and display errors:
```tsx
// Add error state at top of component:
const [queueError, setQueueError] = useState<string | null>(null);

// Update patchQueue:
async function patchQueue(id: string, action: "notify" | "start" | "complete" | "no-show") {
  setQueueError(null);
  const response = await fetch(`/api/queue/${id}/${action}`, { method: "PATCH" });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    setQueueError(payload?.error ?? `Action '${action}' failed.`);
    return;
  }
  await refresh();
  if (action === "complete") {
    setTab("orders");
  }
}
```

Then render the error banner just above the queue list in the JSX (below the tabs, before the queue entries):
```tsx
{queueError ? (
  <div className={styles.errorBanner}>{queueError}</div>
) : null}
```

Add `.errorBanner` to `session-dashboard.module.css` (copy from photographer-dashboard.module.css pattern):
```css
.errorBanner {
  padding: 14px 18px;
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  margin-bottom: 16px;
  color: #111318;
  font-size: 14px;
  font-weight: 500;
}
```

**Option B (longer-term): Bypass arrival PIN requirement for MVP**
If arrival PIN verification is not yet part of the photographer UX (there's no UI for it on the session dashboard), the check in `startQueueEntry` can be temporarily bypassed. This is an MVP tradeoff — acceptable only if the PIN verification flow is not yet exposed.

To bypass: in `repositories.ts`, comment out or remove lines 1458-1460:
```ts
// Remove or comment:
if (!existing.entry.arrivalPinVerifiedAt) {
  return { ok: false, reason: "pin_not_verified" };
}
```

**Architect recommendation: Do Option A** — surface the error. It's the right behavior. If there's no PIN entry UI on the dashboard yet, note that as a follow-on task.

---

### Bug 3: "End Session" Button Not Working

**Root cause:**
The End Session button in `session-dashboard-client.tsx` has **no `onClick` handler**:
```tsx
<button type="button" className={styles.endSessionBtn}>
  End Session
</button>
```
It's a dead button. There is also no API endpoint for ending/deactivating a session.

**Fix — minimal MVP path:**

Step 1: Add a session end API route to `apps/api/src/routes/parity-real.ts`:
```ts
app.post("/api/sessions/:id/end", withZodValidation({}, async (request, reply) => {
  const accountId = await requirePhotographerAccountId(request, reply, deps);
  if (!accountId) return;
  const id = String((request.params as { id: string }).id);
  // Mark session inactive — update sessions table
  await deps.db
    .update(sessions)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(sessions.id, id), eq(sessions.photographerAccountId, accountId)));
  return reply.send({ ok: true });
}));
```

**Check schema first:** Confirm `sessions` table has an `isActive` / `is_active` boolean column in `packages/db`. If it doesn't, add a migration:
```sql
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
```
And update the Drizzle schema definition accordingly.

Step 2: Wire the button in `session-dashboard-client.tsx`:
```tsx
async function handleEndSession() {
  if (!confirm("End this session? This cannot be undone.")) return;
  const response = await fetch(`/api/sessions/${sessionId}/end`, {
    method: "POST",
    credentials: "include"
  });
  if (response.ok) {
    router.push("/photographer");
  }
}

// In JSX:
<button type="button" className={styles.endSessionBtn} onClick={() => void handleEndSession()}>
  End Session
</button>
```

Step 3: Add `useRouter` import if not already present (it's already imported in the component).

**Schema note:** Developer should confirm whether `sessions.isActive` exists in Drizzle schema at `packages/db/src/schema.ts`. If not, add it. If the column exists but under a different name, adapt accordingly.

---

## Section B — UX Polish

---

### UX 4: Back Button — `<- Back` → Styled Arrow

**Decision:** Replace the text `{"<- Back"}` with a proper left-arrow using the Unicode left arrow character, wrapped in a styled span.

**File:** `apps/web/src/features/clone-site/session-dashboard-client.tsx`

Change:
```tsx
<Link href="/photographer" className={styles.backLink}>
  {"<- Back"}
</Link>
```
To:
```tsx
<Link href="/photographer" className={styles.backLink}>
  ← Back
</Link>
```

Update `.backLink` in `session-dashboard.module.css`:
```css
.backLink {
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  font-family: var(--font-family-sans);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.1px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.backLink:hover {
  color: #fff;
}
```

---

### UX 5: URL / Print QR Code Gap

**Decision:** The QR URL `<a>` and the Print QR Code `<Link>` are stacked in a flex column implicitly — need explicit `display: block` on the URL link and a `margin-bottom` before the print button.

**File:** `apps/web/src/features/clone-site/session-dashboard.module.css`

Update `.qrLink`:
```css
.qrLink {
  display: block;
  margin-top: 8px;
  margin-bottom: 12px;   /* ADD THIS */
  font-size: 12px;
  color: #6b7280;          /* softer than pure black */
  text-decoration: none;
  word-break: break-all;
  line-height: 1.4;
}
```

The `margin-bottom: 12px` on `.qrLink` creates a clean 12px gap before the Print QR Code button. No JSX change needed.

---

### UX 6: Session Info Line — Typography Upgrade

**Decision (concrete values):**
The session info line currently renders at `font-size: 13px` with no weight differentiation. This looks too light for the key info a photographer needs at a glance.

**New spec:**
- Price: `font-size: 15px`, `font-weight: 700`, color `#0f1218`
- Separator dots (·) and supporting info (location, PIN): `font-size: 14px`, `font-weight: 400`, color `#4e5562`
- Line height: `1.5`

**File:** `apps/web/src/features/clone-site/session-dashboard.module.css`

Replace:
```css
.meta {
  color: #4e5562;
  font-size: 13px;
}
```
With:
```css
.meta {
  color: #4e5562;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.5;
  margin-top: 4px;
}

.metaPrice {
  font-size: 15px;
  font-weight: 700;
  color: #0f1218;
}
```

**File:** `apps/web/src/features/clone-site/session-dashboard-client.tsx`

Update the meta line JSX from:
```tsx
<div className={styles.meta}>
  <strong>{formatUsd(session.per_photo_price_cents)}</strong> per photo
  {session.location ? ` · ${session.location}` : ""}
  {pin ? ` · PIN: ${pin}` : ""}
</div>
```
To:
```tsx
<div className={styles.meta}>
  <span className={styles.metaPrice}>{formatUsd(session.per_photo_price_cents)} per photo</span>
  {session.location ? <span> · {session.location}</span> : null}
  {pin ? <span> · PIN: {pin}</span> : null}
</div>
```

---

### UX 7: End Session Button Color

**Decision:** The button should be dark/neutral to match the palette — not orange or red. Use a muted outlined dark style: dark border, dark text, no fill. Destructive affordance comes from the confirmation dialog, not the color.

**File:** `apps/web/src/features/clone-site/session-dashboard.module.css`

Replace:
```css
.endSessionBtn {
  display: block;
  width: 100%;
  padding: 12px;
  background: none;
  border: 2px solid #ef4444;
  color: #ef4444;
  border-radius: 12px;
  font-family: var(--font-family-sans);
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  margin-top: 24px;
}
```
With:
```css
.endSessionBtn {
  display: block;
  width: 100%;
  padding: 12px;
  background: none;
  border: 1.5px solid rgba(0, 0, 0, 0.2);
  color: #4e5562;
  border-radius: 12px;
  font-family: var(--font-family-sans);
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  margin-top: 24px;
  transition: border-color 0.15s, color 0.15s;
}

.endSessionBtn:hover {
  border-color: rgba(0, 0, 0, 0.4);
  color: #111318;
}
```

---

### UX 8: Branding — "shotspot" → "Shotspot" with consistent header

**Decision:** All customer-facing pages currently show `<div className={styles.logoText}>shotspot</div>` in all-lowercase with no logo image. The fix: use `"Shotspot"` (capital S) everywhere the text appears, and replace the plain div with a consistent header component that matches the dark topbar pattern already used on authenticated pages.

**Affected files and locations:**

#### 8a. Join the Queue page + Queue Status page + Gallery page
**File:** `apps/web/src/features/clone-site/customer-route-clients.tsx`

Find all instances of:
```tsx
<div className={styles.logoText}>shotspot</div>
```
Replace with:
```tsx
<div className={styles.logoText}>Shotspot</div>
```

There are **3 occurrences** in this file:
1. In `JoinQueueClient` render (the `.header` section)
2. In `QueueStatusClient` render (the `.header` section)
3. In `GalleryClient` render (the `.header` section)

#### 8b. CSS: style the logoText to look like a proper brand mark

**File:** `apps/web/src/features/clone-site/customer-flow.module.css`

Update `.logoText`:
```css
.logoText {
  font-family: var(--font-family-sans);
  font-weight: 800;
  font-size: 20px;
  color: var(--accent);
  letter-spacing: -0.5px;
}
```

The `.header` section already has correct padding (20px 24px). No layout change needed — just the text fix and weight bump.

**No logo image required for MVP** — the bold wordmark is sufficient and avoids adding a new asset dependency.

---

### UX 9: Photographer Name Casing

**Decision:** Display names should be shown with proper title casing. The API returns `display_name` from the DB as-is. The fix is a frontend utility that title-cases the value at render time, not at the DB level (avoid data mutation).

**File:** `apps/web/src/features/clone-site/photographer-dashboard-client.tsx`

Add a utility function near the top of the file (below the `formatUsd` helper):
```ts
function toTitleCase(name: string): string {
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
```

Update the topbar name display:
```tsx
// Change:
<span className={styles.topbarName}>{photographer?.display_name ?? photographer?.email}</span>
// To:
<span className={styles.topbarName}>
  {photographer?.display_name ? toTitleCase(photographer.display_name) : photographer?.email}
</span>
```

The same fix applies anywhere the photographer name is shown in the session dashboard topbar. Check `session-dashboard-client.tsx` — currently it only shows "Shotspot" as a brand link, not the photographer name. No additional change needed there.

For the **queue status page** (`customer-route-clients.tsx`), the photographer name is fetched from API and rendered as `displayPhotographer`. Apply the same fix:
```tsx
// In QueueStatusClient:
function toTitleCase(name: string): string {
  return name.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

// Then in render:
<strong>{toTitleCase(displayPhotographer)}</strong>
```

(Or move `toTitleCase` to a shared utility file like `apps/web/src/features/clone-site/customer-flow.ts` and import it where needed.)

---

### UX 10: Price Per Photo Options — Reduce to "Free" and "Custom" Only

**Decision:** Remove all preset dollar amounts. Keep only "Free" (value `"0"`) and "Custom". This simplifies the form and eliminates arbitrary price anchors.

#### 10a. Frontend — price list

**File:** `apps/web/src/features/clone-site/photographer-dashboard-client.tsx`

Change:
```ts
const prices = ["0", "5", "10", "15", "20", "25", "custom"];
```
To:
```ts
const prices = ["0", "custom"];
```

Also change the initial selectedPrice default from `"5"` to `"0"`:
```ts
const [selectedPrice, setSelectedPrice] = useState("0");
```

And in `handleCreateSession`, after form success reset:
```ts
setSelectedPrice("0");  // was "5"
```

The label rendering logic already handles `"0"` → `"Free"` and `"custom"` → `"Custom"`, so no label changes needed.

#### 10b. CSS — price grid layout

With only 2 options, the flex-wrap grid looks fine. No CSS change required. The options will render as two side-by-side pills naturally.

---

## Summary of Files to Change

| File | Changes |
|------|---------|
| `apps/web/src/features/clone-site/session-dashboard-client.tsx` | Back arrow text, error banner for queue actions, End Session handler, meta price JSX |
| `apps/web/src/features/clone-site/session-dashboard.module.css` | backLink style, qrLink margin, meta/metaPrice typography, endSessionBtn color, errorBanner |
| `apps/web/src/features/clone-site/customer-route-clients.tsx` | "shotspot" → "Shotspot" (3 instances), toTitleCase on photographer name |
| `apps/web/src/features/clone-site/customer-flow.module.css` | logoText font-weight bump |
| `apps/web/src/features/clone-site/photographer-dashboard-client.tsx` | toTitleCase utility, apply to display_name, prices array → ["0","custom"], defaultPrice → "0" |
| `apps/api/src/routes/parity-real.ts` | Add `POST /api/sessions/:id/end` route |
| `packages/db` schema + migration | Add `is_active` boolean column to sessions if missing |
| `.env` / `.env.local` | `EMAIL_PROVIDER=ses` + SES credentials (ops fix, not code) |

---

## Out of Scope (Not Touching)

- OTP flow changes
- Stripe connect flow
- Worker internals (already correct)
- Photographer profile data mutation for casing (display-time fix only)
- New logo image asset (wordmark is sufficient for MVP)
- Any other pages not mentioned above

---

## Risks / Notes for Developer

1. **Schema check first:** Before adding the End Session API route, verify whether `sessions.isActive` exists in Drizzle schema. If it doesn't, write a migration. This is the only potentially blocking DB change.
2. **arrivalPin gate:** The "Start Shoot" fix (Option A) surfaces the 409 error in the UI. If the photographer needs to enter an arrival PIN but there's no UI for that on the session dashboard, that's a follow-on task for UX/Developer. Architect recommends noting it in the task board.
3. **Email diagnosis first:** Before marking email fixed, Developer should inspect the `notification_outbox` table and confirm `EMAIL_PROVIDER=ses` is set. If rows are stuck with error_message set, surface that.
4. **toTitleCase edge cases:** The simple split-capitalize approach handles normal names. All-caps or hyphenated names will look odd, but that's acceptable at MVP scale.
