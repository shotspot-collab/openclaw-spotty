# Email OTP Implementation Plan
## Customer Join Flow: Phone OTP → Email OTP

**Role:** Architect  
**Date:** 2026-04-02  
**Status:** Ready for Developer handoff  
**Scope:** Web customer join flow only. Photographer auth is not affected.

---

## 1. Current State

### How phone OTP works today

The customer join flow (`/q/[code]`) has two modes controlled by the env flag:

```
NEXT_PUBLIC_ENABLE_PHONE_OTP=false   ← currently OFF in .env.local
```

**When `NEXT_PUBLIC_ENABLE_PHONE_OTP=true` (phone OTP path):**
1. Frontend collects name + phone (email optional) → `JoinQueueClient`
2. Frontend POSTs `{ phoneE164, purpose: "signup" }` → `POST /api/auth/phone/request-otp`
3. API creates an `authOtpRequests` row keyed on `phone_e164`, sends SMS via `SmsService`
4. Frontend shows OTP digit input; user submits 6-digit code
5. Frontend POSTs `{ otpRequestId, otpCode }` → `POST /api/auth/phone/verify-otp`
6. API validates OTP, calls `findOrCreateAccountByPhone()` (creates/finds account by phone, sets `phone_verified_at`), creates session cookie
7. Authenticated session is established; frontend then POSTs to `POST /api/queue/join`

**When `NEXT_PUBLIC_ENABLE_PHONE_OTP=false` (current bypass path):**
1. Frontend collects name + email (phone optional)
2. Frontend POSTs directly to `POST /api/queue/join` — no auth, no OTP, no session
3. Queue entry is created; confirmation email is sent via `parity-real.ts` outbox

### Schema snapshot
- `accounts.phone_e164` — `NOT NULL`, has unique index (current constraint)
- `accounts.email` — nullable, has partial unique index (unique where not null)
- `auth_otp_requests.phone_e164` — `NOT NULL`, keyed to phone; the table has no email column
- `accounts.phone_verified_at` / `accounts.email_verified_at` — both tracked separately

### Email service
- `SesEmailService` is already wired as `deps.emailService` in `app.ts`
- It supports `send({ to, subject, text })`
- Local dev uses real SES (configured via `.env.local` with `SES_FROM_EMAIL`)
- There is **no** `LocalStubEmailService` — email always goes to SES even in dev

---

## 2. Target State

1. Customer join flow uses **email OTP** instead of phone OTP
2. Phone is no longer required for verification (remains an optional field for notifications)
3. The existing `NEXT_PUBLIC_ENABLE_PHONE_OTP` flag is repurposed/replaced or a new `NEXT_PUBLIC_ENABLE_EMAIL_OTP` flag is introduced
4. Verified identity is still established before queue join (same safety level as phone OTP)
5. Phone OTP backend routes (`/api/auth/phone/*`) remain in place but are not used by customer join

---

## 3. Implementation Slice

### 3.1 — DB Schema: add `email` to `auth_otp_requests` (migration needed)

**File:** `packages/db/src/schema.ts`  
**Change:** Add optional `email` column to `authOtpRequests` table.

```ts
// In authOtpRequests table definition:
email: text("email"),   // nullable; populated for email OTP flows
```

Existing `phone_e164` column stays `NOT NULL` (backward compat). For email OTP rows, `phone_e164` should be set to a system placeholder (e.g., `email:<hash>`) OR the column should be made nullable. **Recommended: make `phone_e164` nullable** in a migration, so email-OTP rows don't need a fake phone value.

> **Migration:** `ALTER TABLE auth_otp_requests ALTER COLUMN phone_e164 DROP NOT NULL; ALTER TABLE auth_otp_requests ADD COLUMN email text;`

Update index: `auth_otp_requests_phone_created_idx` → add a parallel index on `(email, created_at)` for rate-limiting email lookups.

### 3.2 — Repository: new `findOrCreateAccountByEmail()` method

**File:** `apps/api/src/data/repositories.ts`  
**Class:** `DrizzleAuthRepository`

Add to the `AuthRepository` interface and `DrizzleAuthRepository` class:

```ts
findOrCreateAccountByEmail(input: { email: string }): Promise<{ accountId: string; emailVerifiedAt: Date | null }>
```

Logic mirrors `findOrCreateAccountByPhone()`:
1. Lookup `accounts` by `email` (case-insensitive, lowercased)
2. If found → return `{ accountId, emailVerifiedAt }`
3. If not found → insert new account with `email` set, `phone_e164 = NULL` (after migration), `status = 'active'`
4. `INSERT INTO account_roles (accountId, role) VALUES (..., 'customer') ON CONFLICT DO NOTHING`

Also update `createOtpRequest()` to accept optional `email` in place of `phoneE164`, and update `consumeOtpRequest()` to set `email_verified_at` for email OTP rows instead of `phone_verified_at`.

**Alternatively (simpler slice):** `createOtpRequest` and `consumeOtpRequest` remain phone-keyed; add parallel `createEmailOtpRequest` / `consumeEmailOtpRequest` methods. This avoids changing shared logic and is lower-risk.

> **Recommended: add new parallel methods** — `createEmailOtpRequest` / `consumeEmailOtpRequest`. Touch the existing phone OTP path minimally.

### 3.3 — New API routes: `/api/auth/email/request-otp` and `/api/auth/email/verify-otp`

**File:** `apps/api/src/routes/auth.ts`

Add two new route handlers (parallel to existing phone routes):

**`POST /api/auth/email/request-otp`**
- Body: `{ email: string (email format), purpose: "login" | "signup" | "sensitive_action" }`
- Generates 6-digit OTP code (same `createOtpCode()` utility)
- Stores row in `auth_otp_requests` with `email` column populated, `phone_e164 = null`
- Sends OTP via `deps.emailService.send()` with subject "Your ShotSpot verification code" and body containing the code
- Returns `{ otpRequestId, expiresAt, devOtpCode? }` (same dev bypass pattern as phone OTP: expose code if `SMS_PROVIDER !== 'sns'` — or better, introduce `EMAIL_OTP_DEV_BYPASS=true`)
- Rate limit: same `maxAttempts` / `expiresAt` (10 min) as phone OTP

**`POST /api/auth/email/verify-otp`**
- Body: `{ otpRequestId: uuid, otpCode: /^\d{6}$/ }`
- Validates OTP against stored hash (same `hashSessionToken` logic)
- On success: calls `findOrCreateAccountByEmail({ email })`, sets `email_verified_at`
- Creates session cookie (same `buildSessionCookie` / `createSession` path as phone verify)
- Returns `{ account: { id }, roles, emailVerified: true }`

### 3.4 — Frontend: update `JoinQueueClient`

**File:** `apps/web/src/features/clone-site/customer-route-clients.tsx`

**Changes:**
1. Add `emailOtpEnabled` flag alongside `phoneOtpEnabled`:
   ```ts
   const emailOtpEnabled = process.env.NEXT_PUBLIC_ENABLE_EMAIL_OTP === "true";
   ```
2. When `emailOtpEnabled`:
   - Step 1 form: collect name + **email** (required) + phone (optional)
   - Send code button → `POST /api/auth/email/request-otp`
   - Step 2 verify screen: show "We sent a code to {email}" (update copy from phone copy)
   - Verify button → `POST /api/auth/email/verify-otp`
   - On verify success → `POST /api/queue/join` (same as phone OTP path today)
3. When neither `phoneOtpEnabled` nor `emailOtpEnabled` → existing bypass path (no change)
4. `phoneOtpEnabled` path remains intact but should be disabled (i.e., `NEXT_PUBLIC_ENABLE_PHONE_OTP=false` stays)

**Key UI changes:**
- `cust-02` equivalent: "Email Address" field, hint "We'll email you a one-time code"
- `cust-03` equivalent: "Enter the code from your email" (not SMS)
- Resend button → calls `POST /api/auth/email/request-otp` again
- "Change number" button → "Change email"

Also update `screens.tsx` design-kit screen copy (CUST-02, CUST-03) to reflect email OTP wording.

### 3.5 — Email service: add LocalStubEmailService for dev

**File:** `apps/api/src/services/email.ts`

Currently only `SesEmailService` exists — there's no dev stub. In local dev, every OTP email goes to real SES. This is acceptable if `SES_FROM_EMAIL` is verified, but causes noise and requires AWS creds.

Add a `LocalStubEmailService`:
```ts
export class LocalStubEmailService implements EmailService {
  async send(input: { to: string; subject: string; text: string }): Promise<void> {
    console.log(`[DEV EMAIL] to=${input.to} subject="${input.subject}"\n${input.text}`);
  }
}
```

**In `app.ts`:** Select email service based on an env flag, parallel to `SMS_PROVIDER`:
```ts
const emailProvider = process.env.EMAIL_PROVIDER ?? "stub";
emailService: emailProvider === "ses"
  ? new SesEmailService({ region: ..., fromEmail: env.SES_FROM_EMAIL })
  : new LocalStubEmailService()
```

> **Note:** This changes existing behavior — currently `emailService` always uses SES. But in local dev, the stub is safer (no SES creds needed for OTP dev). Make this change carefully with awareness that all email flows (password reset, queue notifications) will also hit the stub. Alternatively, keep SES default and only swap for OTP-specific dev testing.

**Simpler option:** Keep SES for `emailService` in prod; add `devOtpCode` to the email OTP response (same as phone OTP) so local testing doesn't require checking actual email. This is the recommended approach for MVP — least disruptive.

### 3.6 — `accounts` table: make `phone_e164` nullable (migration)

**File:** `packages/db/src/schema.ts`  
**Migration required.**

Current: `phoneE164: text("phone_e164").notNull()`  
Target: `phoneE164: text("phone_e164")` (nullable)

This is required to create accounts that don't have a phone. The unique index on `phone_e164` should remain but only apply where not null:
```sql
ALTER TABLE accounts ALTER COLUMN phone_e164 DROP NOT NULL;
DROP INDEX IF EXISTS accounts_phone_e164_unique;
CREATE UNIQUE INDEX accounts_phone_e164_unique ON accounts (phone_e164) WHERE phone_e164 IS NOT NULL;
```

Update the Drizzle schema definition to match.

> **Risk:** Existing data all has phone (from `findOrCreateAccountByPhone` always inserting a phone). This migration is additive-only.

### 3.7 — Env vars

**`.env.local` updates:**
```
NEXT_PUBLIC_ENABLE_PHONE_OTP=false          # already set; keep false
NEXT_PUBLIC_ENABLE_EMAIL_OTP=true           # new flag; enable email OTP
EMAIL_PROVIDER=stub                          # new; use stub in local dev (or 'ses' for real)
```

**New env var to document:**
- `NEXT_PUBLIC_ENABLE_EMAIL_OTP` — frontend flag to activate email OTP path
- `EMAIL_PROVIDER` — `stub` (default) | `ses` — controls which EmailService is used in API

---

## 4. Affected Files/Modules

| File | Change |
|------|--------|
| `packages/db/src/schema.ts` | Make `accounts.phone_e164` nullable; add `auth_otp_requests.email` column |
| `packages/db/src/index.ts` | Re-export updated schema if needed |
| `apps/api/src/data/repositories.ts` | Add `findOrCreateAccountByEmail`, `createEmailOtpRequest`, `consumeEmailOtpRequest` to `DrizzleAuthRepository`; update `AuthRepository` interface |
| `apps/api/src/routes/auth.ts` | Add `POST /api/auth/email/request-otp` and `POST /api/auth/email/verify-otp` routes |
| `apps/api/src/services/email.ts` | Add `LocalStubEmailService` |
| `apps/api/src/app.ts` | Wire `EMAIL_PROVIDER` → `LocalStubEmailService` or `SesEmailService`; no structural change otherwise |
| `apps/api/src/lib/env.ts` | No change needed (SES_FROM_EMAIL stays required for prod; stub bypasses it) |
| `apps/web/src/features/clone-site/customer-route-clients.tsx` | Update `JoinQueueClient`: add `emailOtpEnabled` flag, email OTP request/verify flow |
| `apps/web/src/features/customer-booking/screens.tsx` | Update CUST-02 / CUST-03 copy to email OTP wording |
| `.env.local` | Add `NEXT_PUBLIC_ENABLE_EMAIL_OTP=true`, `EMAIL_PROVIDER=stub` |
| **DB migration** | New Drizzle migration: nullable `phone_e164`, add `email` to `auth_otp_requests` |

---

## 5. API/Schema/Env Implications

### Schema
- `accounts.phone_e164`: `NOT NULL` → nullable. Partial unique index.
- `auth_otp_requests`: add `email text` column; `phone_e164` must also become nullable OR a placeholder strategy must be defined (nullable recommended)
- `auth_otp_requests` new index: `(email, created_at DESC)` for rate-limit lookups

### API Contract
- New: `POST /api/auth/email/request-otp` — `{ email, purpose }` → `{ otpRequestId, expiresAt, devOtpCode? }`
- New: `POST /api/auth/email/verify-otp` — `{ otpRequestId, otpCode }` → `{ account: { id }, roles, emailVerified }`
- Existing `POST /api/auth/phone/request-otp` and `/verify-otp` — **unchanged**, just unused by customer join
- `POST /api/queue/join` — **unchanged**; called after email OTP verify just as it was called after phone OTP verify

### Env
- `NEXT_PUBLIC_ENABLE_EMAIL_OTP=true` — new frontend var
- `EMAIL_PROVIDER=stub|ses` — new API var
- `NEXT_PUBLIC_ENABLE_PHONE_OTP=false` — already exists, stays false

---

## 6. What Is Not Changing

- Photographer auth (password + Google OAuth) — untouched
- Password reset flow — untouched (already uses email, not OTP)
- Queue notification emails (join/notified/completed) — untouched
- Phone OTP backend routes — remain but unused in this flow
- `ENABLE_SMS_NOTIFICATIONS` flag — untouched
- Stripe payment path — untouched
- Session/cookie architecture — same as phone OTP (no change)

---

## 7. Risks and Open Questions

| Risk | Severity | Notes |
|------|----------|-------|
| `accounts.phone_e164 NOT NULL` migration | Medium | Additive only; existing rows have phone. New email-only accounts will have `phone_e164 = NULL`. Test that no application code assumes phone is always present. |
| No `LocalStubEmailService` today | Low | Every OTP email goes to real SES in local dev. Recommend stub for dev; or use `devOtpCode` in response to avoid needing to check email. |
| `auth_otp_requests` schema change | Low | Adding nullable `email` column is safe. Making `phone_e164` nullable in that table needs careful review of existing `consumeOtpRequest` logic. |
| Rate limiting | Low-Medium | No per-email rate limiting currently exists. Phone OTP path has `maxAttempts` per request but no request-rate throttle per phone. Email OTP should have the same. Full rate-limiting is a backlog item but the per-request `maxAttempts` at least prevents brute force. |
| `findOrCreateAccountByEmail` uniqueness | Low | `accounts.email` has a partial unique index (`WHERE email IS NOT NULL`). Lookup by email is safe. Case-normalization (lowercase) is already done in photographer signup; apply same to customer email OTP. |
| SES sandbox in dev | Low | If `EMAIL_PROVIDER=ses` in local dev, the OTP email will only reach verified email addresses in SES sandbox. Recommend `EMAIL_PROVIDER=stub` in dev and surface `devOtpCode` in the API response. |
| Reuse of existing `consumeOtpRequest` | Medium | Current `consumeOtpRequest` calls `findOrCreateAccountByPhone()` internally. If we want to reuse this method for email OTP, we need a branch (by email or phone). Recommended: new parallel method `consumeEmailOtpRequest` that calls `findOrCreateAccountByEmail()` instead. Keeps existing phone path untouched. |

---

## 8. Validation Plan

### Local verification (dev)
1. Set `NEXT_PUBLIC_ENABLE_EMAIL_OTP=true`, `EMAIL_PROVIDER=stub` in `.env.local`
2. Load `/q/[valid-session-code]`
3. Enter name + email → click "Send Code"
4. Check API logs for `[DEV EMAIL] to=... code=XXXXXX`  — or check `devOtpCode` in API response
5. Enter OTP → click Verify
6. Confirm session cookie is set (`/api/auth/me` → 200 with `emailVerified: true`)
7. Confirm redirect to `/q/[entry-id]` queue status page
8. Confirm queue entry exists in DB with correct `customer_account_id` and email

### Public / end-to-end verification (via Tailscale)
1. Set `EMAIL_PROVIDER=ses` in env (real SES)
2. Use a verified SES recipient email address
3. Walk the same flow end-to-end — OTP arrives in inbox
4. Complete join → verify queue entry + session on real DB

### QA pass (tight)
- **Affected area:** `/q/[code]` join flow (email OTP on + email OTP off)
- **Regression checks:**
  - Phone OTP flag (`NEXT_PUBLIC_ENABLE_PHONE_OTP=false`) still bypasses correctly
  - Photographer login/signup unaffected
  - Password reset flow unaffected
  - Queue status page loads after email OTP join
- **Test IDs:**
  - `auth.test.ts` — add unit test for `createEmailOtpRequest` + `consumeEmailOtpRequest`
  - `parity-real.test.ts` — verify `/api/queue/join` still works after email OTP verify session

---

## 9. Implementation Order (for Developer)

1. **DB migration** — make `accounts.phone_e164` nullable + add `auth_otp_requests.email` column
2. **Schema update** — update `packages/db/src/schema.ts` to match
3. **Repository** — add `findOrCreateAccountByEmail`, `createEmailOtpRequest`, `consumeEmailOtpRequest` to `DrizzleAuthRepository`
4. **Email service stub** — add `LocalStubEmailService` to `apps/api/src/services/email.ts`
5. **API routes** — add `POST /api/auth/email/request-otp` and `POST /api/auth/email/verify-otp` in `auth.ts`
6. **App wiring** — update `app.ts` to select email service based on `EMAIL_PROVIDER` env
7. **Frontend** — update `JoinQueueClient` in `customer-route-clients.tsx` for email OTP flow
8. **Env** — update `.env.local` flags
9. **Tests** — add `auth.test.ts` coverage for new email OTP methods
10. **QA pass** — verify end-to-end on local, then public Tailscale URL

---

## 10. Handoff Notes for Developer

- **Do not remove** the phone OTP backend routes. They should remain dormant (not wired to frontend).
- **Do not touch** `handleCaptureSubmit` phone OTP branch in `JoinQueueClient` — leave it behind the `phoneOtpEnabled` flag.
- The `devOtpCode` pattern from the phone OTP route should be replicated for email OTP. This allows local dev without checking email.
- When creating the email OTP account, **lowercase the email** before lookup and storage (same as photographer signup).
- The session established by `verify-otp` (email) should set `data.source = "email_otp"` in the session row (parallel to phone OTP `"phone_otp"`).
- Migration must be idempotent — check if column exists before altering.
- The `accounts_phone_e164_unique` index change (partial index) must match the updated Drizzle schema or Drizzle will flag it on push. Coordinate with whoever runs `drizzle-kit push`.
