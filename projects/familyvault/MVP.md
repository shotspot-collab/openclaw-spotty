# FamilyVault — MVP Spec
## 7-Week Sprint Plan

> **Classification: PRIVATE**
> Last updated: 2026-05-10 | Target users: Naveen + wife

---

## MVP Goal

A working FamilyVault for Naveen and wife:

- Real entity/asset structure (trust → LLC → assets)
- Live bank, brokerage, and retirement data via Plaid
- Net worth dashboard with entity drill-down and ownership breakdown
- Embedded ChatGPT assistant with live Vault data access

No Gmail parsing. No external sharing. No real estate live values. No multi-tenant signup.
**This MVP is a private deployment for two users.**

---

## What Ships in 7 Weeks

| Sprint | Weeks | Focus |
|--------|-------|-------|
| Sprint 1 | 1–2 | Foundation + Entity & Asset Registry |
| Sprint 2 | 3–4 | Plaid Live Data + Ownership Migrations |
| Sprint 3 | 5–6 | Google Drive + ChatGPT Assistant |
| Sprint 4 | 7 | Hardening + AWS Deploy |

---

## Sprint 1 — Foundation + Entity & Asset Registry
**Weeks 1–2**

### Goal
Both users can log in, build the full entity/asset structure, enter manual valuations, and see a net worth dashboard.

### Deliverables

**Authentication**
- [ ] Google OAuth 2.0 login (FastAPI)
- [ ] TOTP MFA: setup flow, QR code, verify endpoint
- [ ] Session management: httpOnly + Secure + SameSite=Strict cookies
- [ ] Two users seeded (Naveen + wife, both `owner` role)
- [ ] Next.js auth wrapper + protected routes
- [ ] `families` and `users` tables seeded with correct `family_id`

**Entity Registry**
- [ ] Entity CRUD API: create, read, update, soft-delete
- [ ] Entity types: `trust` | `llc` | `lp` | `personal` | `joint`
- [ ] Parent/child relationships (`parent_entity_id`)
- [ ] Entity tree UI: expandable hierarchy (trust → LLC → sub-entities)
- [ ] Entity detail page: linked assets, linked accounts, net worth roll-up
- [ ] Ownership % entry per entity (`entity_ownership` table)

**Asset Registry**
- [ ] Asset CRUD API
- [ ] Ownership type: `entity_held` | `joint_personal` | `sole_personal`
- [ ] Sole owner assignment (`sole_owner_id`) for personal assets
- [ ] Joint ownership splits (`asset_joint_ownership` table) for joint assets
- [ ] Manual valuation entry (`asset_valuations` table)
- [ ] Liability entry (`liability_balance` on assets — for mortgages, loans)
- [ ] Asset equity display: `value − liability`
- [ ] Asset list UI: filterable by entity + ownership type
- [ ] Asset detail page with valuation history chart

**Net Worth Dashboard**
- [ ] Net worth calculation:
  - Sum of asset equity (value − liability) for all asset types
  - Sum of account balances (live or manual)
  - Roll-up by entity (recursive: includes child entities)
  - Roll-up by ownership type (entity_held / joint_personal / sole_personal)
  - Total family net worth
- [ ] Weekly auto-snapshot (`net_worth_snapshots` table, cron every Monday)
- [ ] Net worth history chart (recharts, weekly data points)
- [ ] Dashboard: net worth summary card, entity tree with assets nested, asset detail side panel

**Scaffolding (for later sprints)**
- [ ] `pending_migrations` table created (not yet exposed in UI beyond empty state)
- [ ] `notifications` table + empty feed UI with polling stub
- [ ] `audit_log` table + middleware (auto-log all API writes)

### Acceptance Criteria — Sprint 1
- [ ] Both users can log in independently (Google OAuth + TOTP)
- [ ] Full entity hierarchy can be created and navigated (trust → LLC → LP)
- [ ] Assets created with all ownership types, manual valuations, liabilities
- [ ] Net worth dashboard shows accurate total matching manual calculation
- [ ] Net worth roll-up by entity and ownership type both correct
- [ ] Net worth snapshot created on schedule
- [ ] All writes visible in audit_log

---

## Sprint 2 — Plaid Live Data + Ownership Migrations
**Weeks 3–4**

### Goal
All bank, brokerage, and retirement accounts linked via Plaid. Live balances feed the net worth dashboard. Ownership migration detection and review workflow live.

### Deliverables

**Plaid Integration**
- [ ] Plaid Link UI embedded (react-plaid-link)
- [ ] `POST /plaid/link-token` → creates Plaid link token
- [ ] `POST /plaid/exchange` → exchanges public token, stores encrypted access token
- [ ] Auto-create accounts in Vault from Plaid connection (type, subtype, name, mask)
- [ ] Default ownership assignment: `sole_personal` (user manually assigns entity after)
- [ ] Plaid webhook handler: `DEFAULT_UPDATE`, `ITEM_ERROR`, `PENDING_EXPIRATION`

**Account Coverage**
- [ ] Bank accounts: checking, savings
- [ ] Brokerage: taxable investment accounts
- [ ] Retirement: 401k, IRA
- [ ] Credit: credit card (balance as liability)

**Account Management UI**
- [ ] Account list with institution, type, balance, last synced
- [ ] Account detail: balance history chart
- [ ] Account entity assignment: "Assign to entity" dropdown (updates `entity_id`)
- [ ] Account ownership type toggle (entity_held / joint_personal / sole_personal)
- [ ] Manual balance entry for accounts not linkable via Plaid

**Balance Sync**
- [ ] Background sync: nightly balance refresh (Hermes plaid_sync_monitor, 2 AM PT)
- [ ] On sync: update `accounts.current_balance`, insert `account_balance_history`
- [ ] Net worth dashboard updates after sync (TanStack Query refetch)
- [ ] Last synced timestamp displayed per account
- [ ] Stale indicator if balance > 24h old

**Ownership Migration Workflow**
- [ ] Hermes plaid_sync_monitor detects account metadata changes
  - Compares Plaid account name vs. stored entity assignment
  - If mismatch → INSERT `pending_migrations` (status: pending)
  - Notification sent to both users
- [ ] "Pending Reviews" card on dashboard (shows count badge if > 0)
- [ ] Pending migration detail: account name, detection source, confidence, proposed change
- [ ] `POST /pending-migrations/{id}/confirm` → atomic:
  - UPDATE account `entity_id`
  - Recalculate net worth snapshot
  - INSERT audit_log (OWNERSHIP_MIGRATED)
  - INSERT notifications (both users)
- [ ] `POST /pending-migrations/{id}/reject`
- [ ] Manual migration flag: user can open account and click "Flag for retitling"

**Notification Feed (live)**
- [ ] In-app notification feed: bell icon, unread count badge
- [ ] Notifications visible for: ownership change detected, ownership change confirmed, Plaid sync anomaly
- [ ] Mark as read / mark all read
- [ ] Both users notified on significant ownership events

### Acceptance Criteria — Sprint 2
- [ ] All family bank, brokerage, and retirement accounts linked via Plaid
- [ ] Live balances update in net worth dashboard after nightly sync
- [ ] Account entity assignments saved and reflected in net worth roll-up
- [ ] Plaid metadata change → pending migration card appears for both users
- [ ] Confirm migration → entity_id updated, net worth recalculated, both users notified
- [ ] Reject migration → status set to rejected, no data change
- [ ] Notification feed shows unread badge for significant events

---

## Sprint 3 — Google Drive + ChatGPT Assistant
**Weeks 5–6**

### Goal
Finance documents indexed and searchable from Google Drive. ChatGPT Custom GPT configured and embedded in the dashboard. In-app notification feed fully live.

### Deliverables

**Google Drive Integration**
- [ ] Google Drive OAuth (user OAuth — personal Google account)
- [ ] Drive folder watch: register push notifications for `/FamilyVault` (or designated) folder
- [ ] Fallback: cron poll for Drive changes every 15 min
- [ ] File download → S3 upload pipeline
- [ ] AWS Textract OCR (async job → poll → store result in S3)
- [ ] Document chunking: 500 tokens, 50-token overlap
- [ ] OpenAI text-embedding-3-small embeddings
- [ ] pgvector storage + ivfflat index
- [ ] `documents` + `document_chunks` populated for all Drive files

**Document UI**
- [ ] Document list: name, entity, doc_type, date, tags
- [ ] Manual document tagging: assign to entity, set doc_type (k1 / tax_return / trust_doc / etc.)
- [ ] Document detail: metadata, tags, download link (signed S3 URL)
- [ ] Semantic document search: `POST /documents/search` with query string
  - Returns top-K chunks with document context + similarity score
- [ ] Search results UI: document name, excerpt, entity, doc_type

**ChatGPT Custom GPT**
- [ ] FastAPI OpenAPI spec generated at `/api/v1/openapi.json`
- [ ] GPT Actions routes implemented:
  - `GET /api/v1/gpt/net-worth` — current net worth with breakdown
  - `GET /api/v1/gpt/entities` — entity list with hierarchy
  - `GET /api/v1/gpt/accounts` — accounts with balances
  - `GET /api/v1/gpt/assets` — assets with values + liabilities
  - `POST /api/v1/gpt/documents/search` — semantic document search
  - `GET /api/v1/gpt/notifications` — recent unread notifications
  - `GET /api/v1/gpt/pending-migrations` — pending ownership reviews
- [ ] OAuth 2.0 auth flow for GPT Actions:
  - `GET /auth/gpt/authorize` → Google OAuth + TOTP → JWT (family_id scoped)
  - JWT validates on all GPT Action requests
- [ ] Custom GPT configured at ChatGPT.com:
  - System prompt with family context
  - All 7 Actions connected to Vault API
  - Tested against real data
- [ ] GPT iframe or link embedded in Vault dashboard sidebar

**Notification System (complete)**
- [ ] Notifications fire for all Sprint 2 triggers + document indexed
- [ ] Drive indexer posts to `/internal/notifications` on new document
- [ ] Notification feed polled every 30 seconds (TanStack Query)

### Acceptance Criteria — Sprint 3
- [ ] All files in designated Google Drive folder indexed and searchable
- [ ] Documents correctly assigned to entities via manual tagging
- [ ] Semantic search returns relevant results for: "operating agreement LLC #1", "K-1 ABC Fund", "2024 tax return"
- [ ] ChatGPT Custom GPT answers these queries accurately:
  - "What is our total net worth?"
  - "How much cash do we have across all accounts?"
  - "What's in LLC #1?"
  - "Find the operating agreement for LLC #1"
  - "What accounts still need entity assignment?"
- [ ] GPT embedded in dashboard and accessible without leaving the app
- [ ] Notification feed live for all event types

---

## Sprint 4 — Hardening + AWS Deploy
**Week 7**

### Goal
Security hardened, audit-complete, deployed to AWS, internal QA with real data.

### Deliverables

**Security Hardening**
- [ ] Row-level security audit: confirm all tenant-scoped tables have RLS enabled and policies tested
- [ ] Test cross-family data isolation: attempt to access another family's data as a different user → confirm blocked at DB layer
- [ ] MFA enforcement: reject all API requests where `mfa_verified = false`
- [ ] Session expiry enforcement (default: 8 hours, configurable)
- [ ] Sensitive field encryption verified: `totp_secret`, `plaid_access_token`, `tax_id` all AES-256 encrypted
- [ ] Rate limiting on auth endpoints (WAF + FastAPI middleware)
- [ ] CORS: allow only known frontend origin

**Audit Log Completeness**
- [ ] Every write operation has audit_log entry: CREATE / UPDATE / DELETE
- [ ] Ownership migrations logged with old_value / new_value JSONB
- [ ] Login events logged (success + failure)
- [ ] Audit log accessible by owner via `/audit-log` UI page
- [ ] Audit log table: revoke DELETE + UPDATE from app_role DB user

**AWS Deployment**
- [ ] Terraform: VPC, subnets (public / private / isolated), security groups
- [ ] RDS PostgreSQL (Multi-AZ, encrypted, db.t4g.large)
- [ ] S3 buckets: documents, OCR output (SSE-KMS, versioning enabled)
- [ ] ECR repositories for all 3 services
- [ ] ECS Fargate task definitions: frontend, backend, agent
- [ ] ALB + CloudFront for frontend static assets
- [ ] Secrets Manager: all API keys, OAuth credentials, DB URL, encryption key
- [ ] WAF: rate limiting, geo-restrict
- [ ] CloudWatch: logs (90-day retention), alarms (ECS health, RDS metrics)
- [ ] DNS + TLS cert (ACM): familyvault.{domain} → ALB

**Internal QA**
- [ ] Both users log in from different browsers/devices
- [ ] Full entity/asset/account flow end-to-end
- [ ] Plaid re-link tested (item refresh + balance update)
- [ ] Pending migration: create → confirm → verify NW updated
- [ ] Document: upload → index → search → return correct result
- [ ] GPT: run all acceptance queries against real production data
- [ ] Net worth snapshot: trigger manually + verify weekly cron fires
- [ ] Audit log: spot-check 10 entries, verify accuracy

### Acceptance Criteria — Sprint 4
- [ ] RLS verified: no cross-family data leakage under test
- [ ] MFA enforced on all API routes (no bypass possible)
- [ ] All 3 services running in AWS ECS without errors
- [ ] HTTPS enforced with valid TLS cert
- [ ] Net worth dashboard loads with live data in < 3 seconds
- [ ] GPT assistant answers queries in < 10 seconds
- [ ] Audit log complete for all test operations
- [ ] No P0/P1 bugs from internal QA

---

## Deferred to v0.2+

These features are explicitly out of scope for this MVP. Architecture is designed to support them without re-platforming.

| Feature | Why Deferred |
|---------|-------------|
| Gmail parsing (Hermes gmail_watcher) | Complex, multi-step; builds on Drive indexer |
| Real estate live values (ATTOM) | Not needed until Phase 2 property tracking |
| Heir / trustee / successor access views | Not needed for 2-person initial deployment |
| Report generation (PDF) | Requires document generation layer |
| External sharing / guest portal | Requires scoped share token architecture |
| Multi-tenant signup flow | Not needed for private deployment |
| Advisor portal | Phase 4 feature |
| Real estate automated valuation | Deferred with ATTOM |
| Stripe billing | Not needed for private deployment |
| AWS SES alert emails | In-app notifications sufficient for MVP |

---

## Tech Stack Reference

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TypeScript, ShadCN UI, TanStack Query, recharts |
| Backend | FastAPI (Python 3.12), SQLAlchemy (async), Alembic |
| Database | PostgreSQL 16 + pgvector |
| Agent | Hermes (Nous Research) with custom skills |
| Embeddings | OpenAI text-embedding-3-small |
| AI Assistant | ChatGPT Custom GPT with Actions |
| Account Data | Plaid |
| Storage | AWS S3 |
| Infrastructure | AWS ECS Fargate, RDS, ALB, CloudFront, Secrets Manager |
| IaC | Terraform |

---

## Definition of Done (All Sprints)

- [ ] Feature works end-to-end in local Docker Compose
- [ ] FastAPI route has Pydantic schema validation
- [ ] RLS verified for all new tables (family_id isolation)
- [ ] Audit log captures all writes
- [ ] No hardcoded credentials (Secrets Manager only)
- [ ] TypeScript strict mode — no `any` on critical paths
- [ ] Basic error handling (no 500s on invalid input)

---

*MVP Owner: Naveen*
*Target: Internal use, 2 users*
*Next review: End of Sprint 2 (Week 4)*
