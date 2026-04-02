# ShotSpot Whole-App UX Implementation Plan

**Role:** Architect  
**Date:** 2026-04-01  
**Scope:** Full-app rollout of the approved homepage visual direction  
**Status:** Handoff-ready for Developer  
**Prerequisite:** Homepage UX pass approved (commit `0306fbc`)

---

## Current Understanding

The homepage UX update (`home.module.css`) was approved and establishes the locked visual direction:

| Token | Value |
|---|---|
| Background | `#FCFBF9` (warm off-white) |
| Surface/Card | `#FFFFFF` |
| Primary Text | `#1A1A1A` |
| Muted Text | `#6B6B6B` |
| Border | `#EAEAEA` |
| Primary Button | `#0A0A0A` (near-black) |
| Button Text | `#FFFFFF` |
| Success | `#1A7A4A` |
| Warning | `#B45309` |
| Danger | `#C0392B` |
| Font | Inter (or Plus Jakarta Sans) — Sora removed |
| Border radius | `0.5rem` (8px) everywhere |
| Shadows | Clean only — no glow, no accent-colored shadows |

The full app currently has **six separate CSS module files** — each independently hardcoding the old palette (`#f7f3ea`, `#ff3b30`, Sora font, glow effects) without using the shared `tokens.ts`. Additionally, `tokens.ts` itself still holds the old palette and must now be updated to lock in the new values globally.

---

## Architecture Decision: Token System Alignment

**The right path for whole-app rollout is:**

1. **Update `tokens.ts`** — align `themeColorTokens.light` and `typographyFamilyTokens` to the approved palette. This drives the `dk-*` component classes in `globals.css` and every consumer of CSS custom properties from `:root`.

2. **Update each CSS module** — remove their locally-scoped old palette variables and old font imports. Align to the new values. Modules that already reference `var(--color-*)` tokens will automatically update once `tokens.ts` is fixed. Modules that hardcode hex values must be explicitly updated.

3. **Remove Sora everywhere** — all Google Fonts imports for Sora must be removed across all CSS modules. Replace with Inter or Plus Jakarta Sans (whichever is confirmed loaded globally).

**Font loading decision (must be made before implementation):**
Check whether Inter is imported in the project. If not, add it to the Next.js `layout.tsx` or `globals.css` Google Fonts import. Do not add it per-module. Once confirmed global, remove all per-module `@import` font URLs.

---

## Surface-by-Surface Rollout Plan

### Stage 1 — Shared Foundation (do first, unblocks everything)

**Files:**
- `apps/web/src/theme/tokens.ts`
- `apps/web/app/globals.css` (font import only, if needed)

**Changes:**
- Update `themeColorTokens.light`:
  - `--color-bg`: `#f7f3ea` → `#FCFBF9`
  - `--color-surface`: `rgba(255,255,255,0.9)` → `#FFFFFF`
  - `--color-text`: `#111318` → `#1A1A1A`
  - `--color-text-muted`: `#4e5562` → `#6B6B6B`
  - `--color-border`: `rgba(0,0,0,0.18)` → `#EAEAEA`
  - `--color-primary`: `#ff3b30` → `#0A0A0A`
  - `--color-primary-contrast`: `#ffffff` (unchanged)
  - `--color-success`: `#1f7f46` → `#1A7A4A`
  - `--color-warning`: `#d4a100` → `#B45309`
  - `--color-danger`: `#d91f15` → `#C0392B`
- Update `typographyFamilyTokens`:
  - `--font-family-display`: Remove Sora; set to `"Inter", "Plus Jakarta Sans", system-ui, sans-serif`
  - `--font-family-sans`: `"Inter", "Plus Jakarta Sans", system-ui, sans-serif`
- Update `radiusTokens`:
  - `--radius-sm`: → `0.5rem`
  - `--radius-md`: → `0.5rem`
  - `--radius-lg`: → `0.5rem`
  - `--radius-xl`: → `0.5rem`
  - (keep `--radius-pill` at `999px`)
- Update `componentTokens`:
  - `--skeleton-a`: `#ece7dc` → `#EAEAEA`
  - `--skeleton-b`: `#f7f2e7` → `#F5F4F1`
  - `--field-radius`: `0.64rem` → `0.5rem`
  - `--panel-radius`: `0.875rem` → `0.5rem`
  - `--shadow-card`: clean shadow (no accent-colored shadows)
  - Remove any glow/accent-tinted shadows
- Add Inter to Google Fonts import in `globals.css` if not already present.

**Why Stage 1 first:** Components using `dk-*` classes (`UIButton`, `UICard`, `UIInput`, etc.) are read by the customer-booking screens and will automatically pick up the new palette once `tokens.ts` is updated.

---

### Stage 2 — Photographer Auth Pages

**Files:**
- `apps/web/src/features/clone-site/auth.module.css`
- Routes: `/photographer-login.html`, `/photographer-signup.html`, `/forgot-password.html`, `/reset-password.html`

**Changes:**
- Remove `@import` for Sora + Plus Jakarta Sans (font now global)
- Update scoped variables on `.page`:
  - `--bg-base`: `#f7f3ea` → `#FCFBF9`
  - `--accent`: `#ff3b30` → `#0A0A0A`
  - `--accent-deep`: `#d91f15` → `#000000`
  - `--panel`: `rgba(255,255,255,0.9)` → `#FFFFFF`
  - `--border`: `rgba(0,0,0,0.18)` → `#EAEAEA`
  - Remove: `--coral-glow`, `--yellow-warm-glow`, `--gold-glow`, `--accent-glow`, `--shadow-accent`
  - Update radius variables to `0.5rem`
- Remove `.page::before` / `.page::after` radial gradient decorations (glow blobs)
- `.submitBtn`: `background: var(--accent)` already; will update via token. Remove `box-shadow: var(--shadow-accent)`
- `.submitBtn:hover`: Change `background: var(--accent-deep)` — stays working. Remove any scale/glow.
- `.forgotLink`: Was `color: var(--accent)` — now renders as near-black. This is correct for the approved direction.
- `.oauthBtn`: Remove hover glow, keep clean border hover.
- `.formGroup input:focus`: Change focus ring from `rgba(255,59,48,0.12)` → `rgba(0,0,0,0.12)` to match near-black primary.

**Risk:** Photographer auth pages use Google OAuth button — its colors are spec'd by Google and must not be changed. The `.oauthBtn` styles only wrap the button container, not the Google icon/branding itself.

---

### Stage 3 — Customer Flow Pages

**Files:**
- `apps/web/src/features/clone-site/customer-flow.module.css`
- Routes: `/s/[code]` (QR landing/session entry), `/q/[id]` (queue status), `/g/[token]` (gallery), `/c/[chatToken]` (chat), `/enter-pin.html`, `/download/[token]`

**Changes:**
- Remove `@import` for Sora + Plus Jakarta Sans (font now global)
- Update scoped variables on `.page`:
  - `--bg-base`: `#f7f3ea` → `#FCFBF9`
  - `--bg-secondary`: `#f2ede1` → `#F5F4F1`
  - `--accent`: `#ff3b30` → `#0A0A0A`
  - `--accent-deep`: `#d91f15` → `#000000`
  - `--panel`: `rgba(255,255,255,0.9)` → `#FFFFFF`
  - `--border`: `rgba(0,0,0,0.18)` → `#EAEAEA`
  - `--border-light`: `rgba(0,0,0,0.1)` → `#EAEAEA`
  - Remove: `--coral-glow`, `--accent-glow`
  - Keep semantic: `--green`, `--green-glow`, `--yellow`, `--yellow-glow`, `--blue`, `--blue-glow` (used for status chips — these are semantic, not brand accent colors)
- `.cameraIcon`: Remove gradient + coral glow. Replace with:
  ```css
  background: #1A1A1A;
  box-shadow: none;
  border-radius: 0.5rem;
  ```
- `.sessionName`: Was `color: var(--accent)` (red). Change to `color: var(--text-primary)` or `#1A1A1A`.
- `.logoText`: Was `color: var(--accent)` (red). Change to `#1A1A1A`.
- `.button`, `.linkButton`: Remove `box-shadow` glow. Keep `background: var(--accent)` which now resolves to near-black.
- `.field input:focus`, `.field textarea:focus`: Change focus border/shadow from red accent to near-black: `border-color: #0A0A0A; box-shadow: 0 0 0 3px rgba(0,0,0,0.08);`
- `.selected` (photo card selection): Change `border-color: var(--accent)` → `border-color: #0A0A0A; box-shadow: 0 0 0 2px #0A0A0A;`
- `.selected .checkbox`: Change `background: var(--accent)` → `background: #0A0A0A`
- `.priceValue`: Was `color: var(--accent)`. Change to `color: #1A1A1A`.
- `.messageMine`: Was `background: var(--accent)`. Change to `background: #0A0A0A`.
- `.bigNumber`: Was `color: var(--accent)`. Change to `color: #1A1A1A`.
- `.notifyCard`: Remove gradient. Use solid neutral card with status chip instead, OR keep gradient using semantic green/amber, not coral accent.
- `.progressCard`: This uses a green gradient — this is semantically fine (green = in-progress). Keep as-is.
- `.highlightCard` (generic): Remove colored gradient. Replace with neutral background + border.
- Status badges (`.waiting`, `.notified`, `.inProgress`, `.completed`): These use semantic color variables (`--blue`, `--yellow`, `--green`) — keep them. They convey meaning, not brand identity.
- `.sheet` (bottom-sheet chrome): Remove `border-radius: 1.5rem 1.5rem 0 0` → `border-radius: 0.5rem 0.5rem 0 0` (8px cap).
- `.statusCard`, `.infoCard`, `.galleryCard`, `.pinCard`, `.chatCard`: Remove `backdrop-filter: blur(8px)`. Set `background: #FFFFFF`, `border: 1px solid #EAEAEA`, `border-radius: 0.5rem`.

---

### Stage 4 — Photographer Dashboard

**Files:**
- `apps/web/src/features/clone-site/photographer-dashboard.module.css`
- Routes: `/photographer` (dashboard list), `/photographer-login.html` (auth — handled Stage 2)

**Changes:**
- `.topbar`: Was `background: #0d1b2a` (dark blue-black). This is intentional for the operator topbar — keep the dark topbar but align to pure black: `background: #0A0A0A`.
- `.topbarBrand`: Remove Sora font reference. Font now global.
- `.logout`: Was `border: 1px solid rgba(255,59,48,0.4); color: #ff3b30`. Change to `border: 1px solid rgba(255,255,255,0.3); color: rgba(255,255,255,0.8)`.
- Background `.page`: `#f7f3ea` → `#FCFBF9`.
- `.card`: Remove `backdrop-filter`, `rgba(255,255,255,0.92)` → `#FFFFFF`, border `rgba(0,0,0,0.12)` → `#EAEAEA`, `border-radius: 20px` → `0.5rem`.
- `.button`: Remove `box-shadow: 0 4px 16px rgba(255,59,48,0.22)`. Background `#ff3b30` → `#0A0A0A`.
- `.buttonGhost`: `color: #ff3b30; border: 2px solid #ff3b30` → `color: #0A0A0A; border: 2px solid #0A0A0A`.
- `.alertBtn`: `background: #ff3b30` → `background: #0A0A0A`.
- `.tabActive`: `color: #ff3b30; border-bottom-color: #ff3b30` → `color: #0A0A0A; border-bottom-color: #0A0A0A`.
- `.priceSelected`: `border-color: #ff3b30; background: rgba(255,59,48,0.06)` → `border-color: #0A0A0A; background: rgba(0,0,0,0.04)`.
- `.statCard`: Was a green gradient — this is semantic (revenue summary), keep it.
- `.statCardDark`: Was `#0d1b2a` gradient. Change to `background: #0A0A0A` (pure near-black).
- `.formGroup input:focus`: Focus ring from red glow → near-black.
- `.sessionArrow`: Was `color: #ff3b30`. Change to `color: #0A0A0A`.
- `.pinValue`: Was `background: #0d1b2a; color: #ff3b30`. Change to `background: #0A0A0A; color: #FFFFFF`.
- Remove Sora-specific font references in button, tab, card, headline classes.

---

### Stage 5 — Session Dashboard (Photographer View per Session)

**Files:**
- `apps/web/src/features/clone-site/session-dashboard.module.css`
- Routes: `/photographer/session/[sessionId]`

**Changes:**
- `.topbar`: `background: #0d1b2a` → `#0A0A0A`
- `.brand`, `.backLink`: Remove Sora font.
- `.page` background: `#f7f3ea` → `#FCFBF9`
- `.panel`: Remove `backdrop-filter`. `rgba(255,255,255,0.9)` → `#FFFFFF`. `border-radius: 14px` → `0.5rem`.
- `.badge`: `background: #ff3b30` → `#0A0A0A`.
- `.tabActive`: Remove Sora. `color: #111318` → `#1A1A1A`.
- `.printBtn`: `background: #ff3b30` → `#0A0A0A`.
- `.qrLink`: `color: #ff3b30` → `color: #1A1A1A` with underline, or keep subtle.
- `.sessionInfo h1`: Remove Sora font.
- `.revenueSummary`: Green gradient — keep (semantic success/revenue).
- `.revenueTotal`: Remove Sora.
- `.endSessionBtn`: `border: 2px solid #ef4444; color: #ef4444` — this is semantic danger. Map to `--color-danger` (`#C0392B`). Keep danger-colored.
- `.btnNotify`, `.btnStart`, `.btnDone`, `.btnSecondary`: These use semantic status colors. Keep the semantic color logic; only replace `rgba(255,59,48,...)` danger references with the new `#C0392B` danger token.
- Status tags (`.statusWaiting`, `.statusNotified`, `.statusProgress`, `.statusComplete`): Keep as-is — these use semantic colors.

---

### Stage 6 — Public Pages (Shared Shell, Legal, Contact, FAQ, Print QR, Error)

**Files:**
- `apps/web/src/features/clone-site/public-pages.module.css` (legal, FAQ, contact, 404)
- `apps/web/src/features/clone-site/public-page-shell.tsx` (shared nav/footer)
- `apps/web/src/features/clone-site/print-qr.module.css`
- `apps/web/src/features/clone-site/site.module.css`

**Changes (`public-pages.module.css`):**
- Remove `@import` Sora + Plus Jakarta Sans
- `--bg-base`/`--bg-primary`: `#f7f3ea` → `#FCFBF9`
- `--accent`: `#ff3b30` → `#0A0A0A`
- `--accent-deep`: `#d91f15` → `#000000`
- `--warm-border`: Remove this variable entirely
- `--accent-glow`: Remove
- `--shadow-accent`, `--shadow-accent-lg`: Remove
- `.navCta`: Remove `box-shadow` glow. `background: var(--accent)` now resolves near-black. Remove hover scale.
- `.navCta:hover`: → `opacity: 0.85`, no transform, no glow.
- `.faqSectionTitle`: Was `color: var(--accent)` (red). Change to `color: #1A1A1A`.
- `.faqQuestion::before` circle: Was `background: var(--accent-glow); color: var(--accent)`. Change to `background: #F5F4F1; color: #1A1A1A`.
- `.faqItem:hover`: Remove `border-color: var(--warm-border)` → `border-color: #EAEAEA`.
- `.ctaBox`: Remove `background: var(--accent-glow); border: 2px solid var(--accent)`. Replace with `background: #F5F4F1; border: 1px solid #EAEAEA`.
- `.ctaLink`, `.backBtn`: `background: var(--accent)` → near-black (via token). Remove glow.
- `.errorCode`: Was `color: var(--accent); opacity: 0.15` (faint red). Change to `color: #1A1A1A; opacity: 0.06`.
- `.errorPage::before` gradient blob: Remove entirely.
- `.button`: Remove `box-shadow` glow. Keep `background: var(--accent)`.
- `.button:hover`: Remove `translateY(-2px)` and glow. Just `opacity: 0.85`.

**Changes (`site.module.css`):**
- Background gradient: `linear-gradient(135deg, #f7f3ea 0%, #f2ede1 100%)` → `background: #FCFBF9` (flat)
- `.brand`: Remove `font-family: var(--font-family-display)` (Sora). Use `var(--font-family-sans)`.
- `.accent`: Was `color: var(--color-primary)` (red). Now resolves to near-black — correct.
- `.btn`/`.btnPrimary`: Remove `box-shadow`. Radius `0.875rem` → `0.5rem`.
- `.btnPrimary:hover`: → `opacity: 0.85`.
- `.heroBadge`: Was accent-colored badge. Change to neutral: `background: #F5F4F1; color: #1A1A1A; border-color: #EAEAEA`.
- `.card`: `rgba(255,255,255,0.9)` → `#FFFFFF`. `border-radius: 1rem` → `0.5rem`.
- `.authWrap` gradient → `background: #FCFBF9`.
- `.authCard`: `rgba(255,255,255,0.94)` → `#FFFFFF`. `border-radius: 1.25rem` → `0.5rem`.
- `.tabBtnActive`: Was `color: var(--color-primary)`. Now near-black — correct.
- `.footerLinks a`: Was `color: var(--color-primary)` (red). Change to `color: #1A1A1A` or `#6B6B6B`.
- `.dashTop`: Was `background: #1a1f2b`. Change to `#0A0A0A` for dark topbar consistency.
- `.notFound` gradient → `background: #FCFBF9`.

**Changes (`print-qr.module.css`):**
- `.page` background: `#f7f3ea` → `#FCFBF9`
- `.button` references: Remove Sora. `border-radius: 10px` → `0.5rem`.
- `.buttonPrimary`: `background: #ff3b30` → `#0A0A0A`.
- `.brandName`: `color: #ff3b30` → `#FFFFFF` (it's on dark header `#0d1b2a` → `#0A0A0A`).
- `.brandHeader`: `background: #0d1b2a` → `#0A0A0A`.
- `.spinner` border-top-color: `#ff3b30` → `#0A0A0A`.
- `.qrLink`: `color: #ff3b30` → `#1A1A1A`.

---

### Stage 7 — Customer Booking Screens (Prototype/Real Path)

**Files:**
- `apps/web/src/features/customer-booking/screens.module.css`
- `apps/web/src/features/customer-booking/screens.tsx`
- Routes: `/prototype/booking/[screenId]`, real customer booking path

**Assessment:** `screens.module.css` already uses CSS custom properties (`var(--color-*)`, `var(--radius-*)`) throughout — it has no hardcoded hex values or old palette. **This file will automatically update correctly once Stage 1 (tokens.ts) is done.** No direct changes needed.

**Verify only:**
- After Stage 1, load the prototype booking screens at `/prototype/booking/` and confirm they render with near-black buttons, `#FCFBF9` background, and `#EAEAEA` borders.

---

## Component Gaps Requiring New Work

The following components from the UX brief **do not currently exist** and must be built:

| Component | UX Brief Reference | Priority |
|---|---|---|
| Sticky bottom CTA bar | QR landing, slot picker, gallery | High — needed for customer critical path |
| Floating cart pill | Gallery (photo selection + checkout) | High — needed for gallery purchase flow |
| Masonry photo grid | Gallery full-bleed layout | Medium — current grid is simple, not masonry |
| OTP digit auto-advance inputs | Phone OTP screen | High — needed for frontend OTP wiring |
| Hold countdown display | Hold confirmation screen | Medium — UX brief calls for visible but calm countdown |

**These are new component builds, separate from the CSS token rollout.** Do not block the CSS token rollout on them. Prioritize the token rollout first, then component gaps.

---

## Affected Files Summary

| File | Stage | Primary Change |
|---|---|---|
| `apps/web/src/theme/tokens.ts` | 1 | Palette + font + radius token update |
| `apps/web/app/globals.css` | 1 | Font import (if needed) |
| `apps/web/src/features/clone-site/auth.module.css` | 2 | Palette, glow removal, font |
| `apps/web/src/features/clone-site/customer-flow.module.css` | 3 | Palette, glow removal, font, selection states |
| `apps/web/src/features/clone-site/photographer-dashboard.module.css` | 4 | Palette, glow removal, font |
| `apps/web/src/features/clone-site/session-dashboard.module.css` | 5 | Palette, topbar, font |
| `apps/web/src/features/clone-site/public-pages.module.css` | 6 | Palette, glow removal, font |
| `apps/web/src/features/clone-site/print-qr.module.css` | 6 | Palette, font |
| `apps/web/src/features/clone-site/site.module.css` | 6 | Palette, background gradient removal |
| `apps/web/src/features/customer-booking/screens.module.css` | 7 | Verify only — token-driven, no edits |

**Not in scope for this rollout:**
- Any `.tsx` / `.ts` component logic files (unless explicit inline styles are found)
- `apps/api/*` — backend unaffected
- `apps/worker/*` — backend unaffected
- `packages/db/*` — schema unaffected
- Prototype screens at `/prototype/design-kit` — these are reference-only

---

## Acceptance Criteria

1. **All pages** use `#FCFBF9` background (no amber `#f7f3ea` visible anywhere)
2. **All primary buttons** render near-black (`#0A0A0A`) — no red buttons on any page
3. **No glow effects** — no `box-shadow` with red/coral/amber tint anywhere
4. **No Sora font** — all text renders in Inter or Plus Jakarta Sans
5. **8px border radius** on all cards, inputs, and buttons
6. **Status chips** retain semantic colors (green/amber/blue) for status communication
7. **Dark topbar** on photographer surfaces renders as `#0A0A0A` (not `#0d1b2a`)
8. **Revenue summary cards** (green gradient) remain — they are semantic, not brand
9. **Critical flows still functional** (verified via QA pass below)
10. **Mobile layout intact** — customer screens must work at 375px width

---

## Validation Required

### Local Verification (Developer should run before handoff to QA)

1. Start dev stack: `pnpm --dir apps/web dev`
2. Load each route and visually confirm palette:
   - `/` — home (already approved)
   - `/photographer-login.html` — auth card
   - `/photographer-signup.html` — auth card
   - `/s/test` or similar — QR landing (customer entry)
   - `/q/[id]` — queue status
   - `/g/[token]` — gallery
   - `/photographer` — dashboard list
   - `/photographer/session/[id]` — session dashboard
   - `/faq.html`, `/privacy.html`, `/contact.html` — public pages
   - `/print-qr.html` — print view
3. No TypeScript errors: run `pnpm --dir apps/web typecheck` or `tsc --noEmit`
4. No console errors related to missing CSS variables

### QA Regression Pass (Highest-Risk Flows)

**Flow 1: Customer join → queue (highest risk)**
1. Open QR landing at `/s/[code]`
2. Tap "Start Booking" — confirm near-black sticky CTA
3. OTP entry screen — confirm input focus ring, button style
4. Slot picker — confirm slot cards render with `#EAEAEA` border + available/held dot states
5. Hold confirmation + Stripe payment element — confirm booking summary visible
6. Confirmation screen — confirm success state renders clean

**Flow 2: Photographer auth → dashboard**
1. `/photographer-login.html` — confirm Google OAuth button renders; Sora gone; near-black submit button
2. Post-auth, land on `/photographer` dashboard — confirm topbar is `#0A0A0A`, tab highlights near-black
3. Open a session → `/photographer/session/[id]` — confirm queue list rows, status chips, action buttons

**Flow 3: Gallery → purchase**
1. `/g/[token]` — gallery view — confirm photo grid renders; selected state uses near-black ring (not red)
2. Checkout pill — confirm near-black
3. Stripe payment element renders correctly

### Public/End-to-End Verification (via Tailscale public URL)

- Load all 3 critical flows above at `https://msi.taila8c3ab.ts.net/` to confirm no URL-leaked localhost issues or env-specific styling differences.
- Verify mobile layout at 375px viewport (Chrome DevTools responsive mode acceptable for QA).

---

## Evidence Needed to Close

- [ ] Screenshot or screen recording of each critical-flow first screen confirming near-black palette
- [ ] TypeScript typecheck passing (`tsc --noEmit` clean)
- [ ] QA report confirming Flow 1, 2, 3 pass (end-to-end, not just visual)
- [ ] No open CSS console errors related to undefined CSS variables

---

## Sequencing / Staging for Developer

```
Stage 1: tokens.ts + globals.css font   ← do first, unblocks all
Stage 2: auth.module.css               ← photographer login/signup pages
Stage 3: customer-flow.module.css      ← customer critical path
Stage 4: photographer-dashboard.module.css
Stage 5: session-dashboard.module.css
Stage 6: public-pages.module.css + print-qr.module.css + site.module.css
Stage 7: verify customer-booking screens (no edits expected)
```

Each stage is independently reviewable. Developer can commit after each stage.

---

## Risks and Open Questions

| Risk | Severity | Mitigation |
|---|---|---|
| Google OAuth button visuals break if parent styles interfere | Medium | `.oauthBtn` only wraps the container; Google's OAuth button is iframe-isolated or image-based. Test after Stage 2. |
| Sora font still loaded if Google Fonts import not fully removed from all modules | Low | Search all module CSS for `@import url` containing "Sora" before closing. Remove any found. |
| Status chip semantic colors may need `var()` references instead of hardcoded hex | Low | Confirm `--green`, `--yellow`, `--blue` are defined at page level (they are in `customer-flow.module.css`); keep them |
| `customer-booking/screens.module.css` uses `var(--color-primary)` which was red — now near-black | Intended | The navLinkActive and screenLink hover border will change to near-black. Verify it reads correctly on screen. |
| Dark mode tokens (not updated in this plan) | Low | Dark mode (`[data-theme="dark"]`) is not the active path for the MVP. Update `themeColorTokens.dark` separately; it is not in scope here. |
| Revenue summary gradient card (green) may look inconsistent if other cards are now flat | Low | Green gradient is semantically appropriate for revenue summary. UX brief explicitly calls out photos + semantic colors as the visual hierarchy. |
| `home.module.css` (approved pass) still uses a local variable block — should it be left alone? | Low | Yes. Leave `home.module.css` as-is. It was approved in isolation and should not be changed in this rollout unless a regression is found. |
| Inter font availability — project may not load Inter yet | Medium | **Must confirm before Stage 1.** Check `apps/web/app/layout.tsx` for current Google Fonts import. Add Inter if missing. If Inter is not viable, confirm Plus Jakarta Sans is acceptable as the heading font replacement for Sora. |

---

## Summary for Developer

The whole-app visual rollout is primarily a **CSS token and CSS module update**. It is not a structural or component logic change.

**The core work:**
1. Fix `tokens.ts` — this is the most impactful single change. Everything using `var(--color-*)` updates automatically.
2. Update each of the 7 CSS module files — remove the old local palette variables, remove Sora, remove glow effects.
3. Verify the `customer-booking/screens.module.css` did not need changes (it shouldn't).

**What NOT to do:**
- Do not change component logic (`.tsx` files) unless forced by a regression
- Do not change `home.module.css` (already approved)
- Do not change dark mode tokens yet (out of scope)
- Do not rebuild any component — this is palette work only

**Component gaps** (sticky CTA, floating cart pill, masonry grid, OTP digits, hold countdown) are a **separate follow-on task** after the token rollout is done and QA-verified.

**Estimated scope:** ~300–400 lines of CSS changes across 8 files. No logic changes.
