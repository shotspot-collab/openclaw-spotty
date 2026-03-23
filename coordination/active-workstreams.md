# ShotSpot Active Workstreams

This is the workspace-level execution dashboard for Spotty.
Use it instead of repo-local `.codex` files as the first coordination read.

## 1. Demo-mode removal / real-backend hardening
- Legacy task id: `remove-demo-mode-20260313`
- Status: in_progress / mostly advanced, with follow-up hardening still active
- Why it matters: keeps local and cloud on the same real backend path and removes fake/demo behavior drift
- Recent completed slices:
  - removed demo/parity fallback paths from core flows
  - hardened notification outbox worker retry behavior
  - added booking-core backend slice for holds/payment attempt persistence/webhook-authoritative finalization/idempotency
  - fixed public URL generation leaks for queue/gallery/session/password-reset/connect URLs
- Remaining watch items:
  - SES sender verification remains external
  - SMS/provider hardening and Terraform/bootstrap still have follow-up work
  - some QA/deploy-gate work remains partial
- Relevant docs:
  - `project/decisions.md`
  - `architecture/system-overview.md`
  - repo technical docs as needed

## 2. MVP feature-gap execution board
- Legacy task id: `mvp-feature-gap-plan-20260321`
- Status: in_progress
- Why it matters: converts the MVP gap analysis into an execution roadmap
- Current important findings:
  - implemented/partial: notification worker, free-session gallery flow, queue progression, gallery-ready notifications, public-route baselines
  - missing/incomplete: OTP auth completion, slot holds, booking payment finalization, signed upload/download lifecycle, retention reminders/purge, payout ledger/admin payout ops, CI/dev gates
  - spec drift: repo requirements say PaymentIntents-only while current implementation/status mentions Stripe Checkout in some places
- Current recommended lanes:
  1. critical-path integration suite + dev gate hardening
  2. OTP/session auth baseline completion
  3. slot hold lifecycle
  4. signed upload/download lifecycle
  5. retention reminder/purge worker

## 3. Signed upload/download lifecycle
- Legacy task id: `signed-upload-download-lifecycle-20260322`
- Status: in_progress
- Why it matters: moves photo upload/download toward the intended production shape instead of inline DB payload assumptions
- Current progress:
  - task was claimed and scoped
  - empty-gallery regression root cause identified and fixed
  - send/publish now rejects no-photo publish attempts
  - session dashboard status derivation improved so uploaded orders move out of pending before publish
- Remaining work:
  - signed upload URL issuance contract
  - photo registration path cleanup toward storage-shaped lifecycle
  - server-controlled signed download issuance constraints
  - affected UI validation after contract changes
- Residual risks:
  - current UI may still expose gallery affordances before publish
  - manual `Mark Paid` path remains conceptually inconsistent with Stripe-verified flow

## Working rule

When a workstream changes meaningfully, update this file and also update:
- `coordination/task-board.md`
- `coordination/handoffs.md` when another role/session needs the change
- `project/decisions.md` if the change reflects accepted project truth
