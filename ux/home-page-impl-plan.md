# Home Page Implementation Plan

**Role:** Architect  
**Date:** 2026-03-30  
**Scope:** Home page only — approval checkpoint before any broader rehaul  
**For:** Developer

---

## Current State Assessment

The home page at `apps/web/app/(public)/page.tsx` already has a functional marketing page. It uses a self-contained `home.module.css` with its own local CSS variables. The structure is good — the problem is visual token misalignment with the locked UX brief.

**Key misalignments vs. locked brief:**
| Current | Locked UX Brief |
|---|---|
| Background `#f7f3ea` (warm amber-tinted) | Background `#FCFBF9` (cleaner warm off-white) |
| Primary color `#ff3b30` (red accent) | No accent color — primary button is `#0A0A0A` near-black |
| Buttons: red with glow effects | Buttons: near-black, clean, no glow |
| Fonts: Sora + Plus Jakarta Sans | Inter (or SF Pro Display) for headings |
| Border radius: 0.75–1.25rem (aggressive) | 8px (`0.5rem`) across all components |
| Coral/gold gradient glows throughout | None — UI is neutral; photos are the color |

---

## 1. What the Home Page Should Contain (First Pass)

Keep the existing content structure — it's already good. The first pass is a **visual token regrounding**, not a content redesign:

1. **Nav** — Logo + Login link. Keep as-is structurally.
2. **Hero section** — Headline, subtitle, CTA button, trust bar. Keep content, restyle visuals.
3. **How It Works** — 4-step flow grid. Keep content, restyle cards.
4. **Features** — 2x2 feature card grid. Keep content, restyle cards.
5. **Simple Pricing** — Price card. Keep content, restyle card.
6. **Footer** — Links + copyright. Keep as-is.

**What to add in this pass:**
- Nothing new structurally. Do not add sections.

**What to explicitly exclude in this pass:**
- Session hero / cover photo (that's the QR landing page, not the marketing home)
- Sticky CTA bar
- Masonry gallery grid
- Customer flow components
- Any photographer dashboard UI

---

## 2. Which Existing Components Can Be Reused

**Reuse as-is (no changes):**
- `UIButton` (`apps/web/src/components/ui/button.tsx`) — already uses `dk-btn-primary` class. The `primary` variant will be styled correctly once tokens are updated.
- `UICard` (`apps/web/src/components/ui/card.tsx`) — already uses `dk-card`. Same deal.

**Do not use for this pass (home page uses its own module CSS):**
- `globals.css` `.dk-header`, `.dk-page` — these are internal app chrome styles, not marketing page styles. Do not apply them to the home page.

The home page correctly self-contains its styling in `home.module.css`. Developer should keep that pattern — only update the CSS variables and specific visual rules within that file.

---

## 3. Token Changes Required

### Do NOT touch `tokens.ts` in this pass.

`tokens.ts` defines tokens for the full app design kit (`dk-*` classes). Changing those values now would cascade to every other page. That is out of scope for a home-page-only pass.

**Instead:** Update the local CSS variables declared inside `.homePage` in `home.module.css`. These are scoped to the home page only and are safe to change in isolation.

### Specific variable changes in `home.module.css`:

```css
/* Old → New */
--bg-base: #f7f3ea       → #FCFBF9
--bg-primary: #f7f3ea    → #FCFBF9
--bg-secondary: #f2ede1  → #F5F4F1   (slightly darker off-white for section alternation)
--text-primary: #111318  → #1A1A1A
--text-muted: #4e5562    → #6B6B6B
--accent: #ff3b30        → #0A0A0A   (near-black replaces red accent)
--accent-deep: #d91f15   → #000000
--panel: rgba(255,255,255,0.9) → #FFFFFF
--border: rgba(0,0,0,0.18)     → #EAEAEA
```

**Remove entirely (glow variables no longer needed):**
- `--coral-glow`
- `--hot-coral-glow`
- `--yellow-warm-glow`
- `--gold-glow`
- `--accent-glow`
- `--warm-border`
- `--shadow-accent`
- `--shadow-accent-lg`

**Font change:**
```css
/* Remove Sora import from home.module.css */
/* Keep Plus Jakarta Sans, or swap to Inter if loaded globally */
/* h1/h2/h3 should use Inter or Plus Jakarta Sans — NOT Sora */
```

Check whether Inter is already loaded in the project. If not, add it to the Google Fonts import already in `home.module.css` and replace the Sora references.

**Border radius change:**
```css
--radius-sm: 0.5rem   (8px)
--radius-md: 0.5rem   (8px)
--radius-lg: 0.5rem   (8px)
```
The brief calls for consistent 8px across all cards, inputs, and buttons.

---

## 4. Files Developer Should Modify

| File | What to change |
|---|---|
| `apps/web/src/features/clone-site/home.module.css` | Update local CSS variables, remove glow styles, flatten border radii, restyle `.heroCta`/`.navCta` buttons to near-black, remove pseudo-element gradient glows |
| `apps/web/app/(public)/page.tsx` | Remove/replace inline emoji-heavy section icons with neutral equivalents if desired (optional — content is acceptable as-is for first pass) |

**That's it. Two files maximum.**

---

## 5. What NOT to Change in This Pass

- `apps/web/src/theme/tokens.ts` — do not touch
- `apps/web/app/globals.css` — do not touch
- Any other page under `apps/web/app/(public)/` — leave alone
- Any component under `apps/web/src/components/ui/` — leave alone
- The `customer-booking` feature — leave alone
- The photographer dashboard — leave alone
- The prototype screens — leave alone

---

## 6. Specific Styling Rules for the CSS Update

**Buttons (`.heroCta`, `.navCta`, `.fullWidthCta`):**
```css
background: #0A0A0A;
color: #FFFFFF;
border-radius: 0.5rem;   /* 8px */
box-shadow: none;        /* remove glow shadows */
transition: opacity 0.15s ease;
```
Hover state: `opacity: 0.85` — no transform, no color shift, no glow.

**Cards (`.flowStep`, `.featureCard`, `.priceCard`):**
```css
background: #FFFFFF;
border: 1px solid #EAEAEA;
border-radius: 0.5rem;   /* 8px */
backdrop-filter: none;   /* remove blur */
```
Hover state: subtle `box-shadow: 0 4px 12px rgba(0,0,0,0.06)` only — no translateY.

**Price card (`.priceCard`):**
```css
border: 1px solid #EAEAEA;  /* remove accent-colored border */
```
Remove the `::before` gradient stripe.

**Hero pseudo-element glow:**
Remove the `.hero::before` radial gradient entirely.

**Flow grid connector line (`.flowGrid::before`):**
Replace with a simple `1px solid #EAEAEA` horizontal line, or remove it.

**Step icons (`.stepIcon`, `.emoji`):**
```css
background: #F5F4F1;   /* neutral background, not coral glow */
border-radius: 0.5rem;
```

---

## 7. Approval Checkpoint

**Before any broader rehaul, the approval checkpoint is:**

1. Load `http://localhost:3000/` (the home page) in a browser.
2. Visually confirm:
   - Background is warm off-white (`#FCFBF9`), not amber-tinted
   - All buttons are near-black (`#0A0A0A`), no red anywhere
   - No glow effects, no gradient backgrounds, no coral/gold color
   - Cards use 8px radius and a clean `#EAEAEA` border
   - Typography is Inter (or Plus Jakarta Sans) — Sora has been removed or replaced
   - Page still scrolls correctly on mobile (`≤ 375px`)
3. No other routes should be visually different.
4. User approves this visual direction → then Developer proceeds with the broader app rehaul.

---

## Summary for Developer

**Core task:** Regrounding the home page's local CSS variables and button/card/glow styles to match the locked UX palette. It's a CSS update, not a structural change.

**Biggest changes:**
1. Red accent → near-black (#0A0A0A) everywhere
2. Remove all glow/gradient effects
3. 8px border radius throughout
4. Background to #FCFBF9

**Estimated scope:** ~100–150 lines of CSS changes in one file (`home.module.css`), possible minor cleanup in `page.tsx`.
