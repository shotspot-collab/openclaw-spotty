# ShotSpot UX Architect Brief

**Status:** accepted  
**Owner:** UX  
**Last updated:** 2026-03-29  
**For:** Coordinator → Architect → Developer

---

## Objective

Define a single, consistent visual design system for the entire ShotSpot application — both customer-facing and photographer-facing surfaces — so every page feels like it belongs to the same product.

---

## Accepted Design Direction

### Single unified theme

ShotSpot uses one design system across all surfaces. There is no split customer-vs-photographer theme. Differentiation is achieved through **layout density and spacing**, not through different colors or component styles.

- **Customer pages:** relaxed spacing, mobile-first, one primary action per screen
- **Photographer pages:** compact spacing, tablet/desktop optimized, data-dense lists and queues

---

## Color Palette (Locked)

```
Background:        #FCFBF9   warm off-white
Card/Surface:      #FFFFFF   pure white
Primary Text:      #1A1A1A   deep charcoal
Secondary Text:    #6B6B6B   muted gray
Borders:           #EAEAEA   light gray
Primary Button:    #0A0A0A   near-black
Button Text:       #FFFFFF   white
Success:           #1A7A4A   deep green
Warning:           #B45309   amber
Danger:            #C0392B   deep red
Focus Ring:        #0A0A0A   matches primary
```

### Core principle: **No brand accent color. The photos are the color.**

ShotSpot is a photo commerce product. Every page will contain real photography. The UI must remain completely neutral so photos always dominate. Black buttons on warm white backgrounds look premium and never clash with any image.

---

## Typography (Locked)

- **Headings:** Inter (or SF Pro Display) — tight letter spacing, bold weight
- **UI / Body:** Inter — highly readable at small sizes
- **Numbers / IDs:** Monospace variant for booking IDs, prices, and data tables so they align correctly

---

## Shape & Spacing

- **Border radius:** 8px on all cards, inputs, and buttons (clean and modern, not aggressive, not playful)
- **Customer spacing:** relaxed — generous padding, clear visual breathing room between elements
- **Photographer spacing:** compact — tighter padding, more information per screen, efficient for operators

---

## Inspiration Stack Reference

| Reference | What to borrow | Apply to |
|---|---|---|
| Airbnb | booking-flow clarity, slot/price hierarchy, calm mobile decision-making | QR landing, slot picker, booking confirmation |
| Stripe | payment trust, form/input clarity, error/retry/success states | OTP, payment, confirmation |
| Apple | premium restraint, typography confidence, letting content breathe | Gallery, session landing, empty states |
| Linear | dense-but-calm dashboard structure, status chips, pro-tool feel | Photographer queue, upload, session ops |
| Pixieset / Pic-Time / ShootProof | gallery grid, selection states, cart behavior, download clarity | Gallery purchase, photo download |

---

## Page-by-Page UX Specification

### Page 1: QR Landing / Session Entry (Customer)
- **Goal:** Immediately establish trust and show what the customer is walking into.
- **Layout:** Full-bleed session cover image at top. Session name, photographer name, location, and time below. Sticky CTA at bottom.
- **Primary action:** "Start Booking" — large, full-width, black button in sticky bottom bar.
- **Consistency note:** Uses the same card + button components as every other page.

---

### Page 2: Phone OTP (Customer)
- **Goal:** Minimum friction authentication.
- **Layout:** Single centered form. Clear label. Hint text explaining why we need their number.
- **Input style:** Subtle gray background (`#F5F5F5`) that turns white with black focus ring on tap.
- **UX behavior:** Auto-advance OTP digit fields. Resend timer visible and unobtrusive.
- **Primary action:** "Send Code" / "Verify" — full-width black button.

---

### Page 3: Slot Picker (Customer)
- **Goal:** Make price and availability obvious before commitment.
- **Layout:** Clean white cards on the warm off-white background. No heavy borders. Available slots use a subtle green dot. Held slots use a gray/amber dot.
- **UX behavior:** Tapping a slot highlights it (black ring), and the sticky bottom CTA updates immediately: "Hold 3:20 PM · $75 → Continue".
- **Primary action:** Sticky bottom bar CTA. Updates based on selection state.

---

### Page 4: Hold Confirmation + Payment (Customer)
- **Goal:** Reassure the customer, complete payment fast.
- **Layout:** Booking summary locked at the top (slot, price, location). Stripe payment element below in a visually distinct container. A subtle lock icon for trust.
- **UX behavior:** Hold countdown visible but not alarming. Price stays visible throughout so customer never loses context.
- **Primary action:** "Pay $75" — full-width black button.

---

### Page 5: Booking Confirmation (Customer)
- **Goal:** Clear success state. Tell them exactly what happens next.
- **Layout:** Large success checkmark or confirmation icon. Booking reference. Date/time/location card. "What happens next" note (e.g. "We'll text you when your photos are ready").
- **UX behavior:** No unnecessary actions. Clean end state.

---

### Page 6: Gallery View & Photo Purchase (Customer)
- **Goal:** Let photos sell themselves. Make selection and purchase effortless.
- **Layout:** Full-bleed masonry photo grid. No padding between photos in the grid. Tap to select.
- **Selection state:** Selected photo slightly dims with a bold black checkmark overlay. Clean, not cluttered.
- **Cart:** Floating pill at bottom center: "2 Selected · $36  [ Checkout ]". Updates instantly.
- **Primary action:** Floating checkout pill.

---

### Page 7: Photographer Session Dashboard (Operator)
- **Goal:** Immediately show what needs attention. One clear action per booking row.
- **Layout:** Compact list rows, not heavy tables. Each row shows: time, booking ID, status chip, and one primary action.
- **Status chips:**
  - Awaiting Upload → amber dot
  - Ready to Send → green dot
  - Payment Pending → blue dot
  - Completed → gray dot
- **UX behavior:** Only the highest-priority action is visible per row. Secondary actions are in a "…" overflow menu.
- **Spacing:** Compact mode — fits 8–12 bookings in a single screen view.

---

### Page 8: Upload & Publish Flow (Operator)
- **Goal:** Fast, clear photo upload and send flow with no guesswork.
- **Layout:** Drag-and-drop zone prominently placed. Upload progress visible. Clear "Send to Customer" CTA only appears after photos are uploaded.
- **UX behavior:** Prevent sending if no photos uploaded. Clear empty state messaging.
- **Primary action:** "Send Gallery to Customer" — full-width black button. Only active when photos are ready.

---

## Key UX Constraints (Non-Negotiable)

1. Every page must use the same token system — same background, same cards, same buttons, same typography.
2. No page should introduce a new color outside the locked palette.
3. Photos should never compete with UI chrome. The UI steps back; photos come forward.
4. Every screen should have exactly one obvious primary action.
5. Mobile-first for all customer screens. Every CTA should be reachable by a thumb.
6. Photographer screens optimized for tablet/desktop but must still work on mobile.

---

## Architect Deliverables Expected

1. Map this brief onto the current token system in `apps/web/src/theme/tokens.ts` — confirm palette alignment or propose specific token changes.
2. Propose which existing prototype screens need token/layout changes vs. which are already close.
3. Identify any component gaps (e.g. masonry gallery grid, floating cart pill, sticky CTA bar) that do not exist yet.
4. Produce a component/screen delivery plan for Developer.
5. Flag any UX constraints that create architecture or schema implications (e.g. signed URL delivery timing for gallery, hold countdown state on client).

---

## Open Questions for Architect

1. Does the current token system in `tokens.ts` already support this palette, or do specific tokens need to change?
2. Is the gallery grid currently a simple list or is there a real masonry/grid implementation?
3. Does the floating cart pill require new client-side state management, or can it be derived from existing selection state?
4. Are sticky bottom bars already handled in the layout system, or does that need to be added?
