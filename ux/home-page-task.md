# ShotSpot Home Page UX Task Requirement

**Status:** Draft for Architect → Developer
**Scope:** Home page only (single-page proof first)
**Owner:** UX
**Date:** 2026-03-30

## Objective
Create a polished first-pass redesign of the ShotSpot home page only, using the locked UX design system from `ux/architect-brief.md`. Show this page for approval before any broader app rehaul.

## Why this task exists
- The full app rehaul is too broad to do in one pass.
- We need a visible, shippable home page first to validate the direction.
- The home page should feel premium, photo-first, and consistent with the rest of ShotSpot.

## Mandatory constraints
1. **Only the home page** should be changed in the first pass.
2. **Use the locked theme tokens** from the UX brief:
   - Background: `#FCFBF9`
   - Surface: `#FFFFFF`
   - Text: `#1A1A1A`
   - Muted text: `#6B6B6B`
   - Border: `#EAEAEA`
   - Primary button: `#0A0A0A`
   - Button text: `#FFFFFF`
3. **Typography** should align with the brief:
   - Headings: Inter or SF Pro Display
   - Body/UI: Inter
4. **Rounded corners** should use the brief’s 8px feel.
5. **No new brand accent colors**.
6. **Do not start full-app redesign** until the home page is reviewed and approved.

## Home page UX goals
- Immediate trust
- Premium, neutral, photo-first visual treatment
- Clear one-primary-action behavior
- Strong hierarchy without clutter
- Mobile-first layout

## Suggested home page content structure
The home page should likely include:
1. **Hero / session entry section**
   - strong visual first impression
   - session title / photographer / location / time
2. **Primary CTA**
   - one obvious action button
3. **Supportive proof/trust elements**
   - simple, calm copy explaining what happens next
4. **Photo-forward layout**
   - photos should dominate the visual hierarchy

## Deliverables requested from Architect
Architect should produce a home-page-only implementation plan answering:
- Which current tokens need to change for the home page?
- Which components can be reused as-is?
- Which components need layout adjustments just for the home page?
- What should the first-pass home page include / exclude?
- What are the minimum changes needed to show a clean approval-ready version?

## Deliverables requested from Developer
After Architect approval, Developer should:
- implement only the home page changes
- update only the minimal token styles needed for this page if required
- keep the rest of the app untouched
- make sure the page is easy to show in a browser for review

## Acceptance criteria
- Home page matches the locked UX direction closely enough for approval
- No other pages are reworked in this pass
- Page is reviewable in the live app
- Changes are minimal, reversible, and easy to expand later