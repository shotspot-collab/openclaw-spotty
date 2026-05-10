# FamilyVault — Personal Finance OS
## Architecture & Phased Build Plan

> **Classification: PRIVATE** — Internal planning document. Do not distribute.
> Last updated: 2026-05-09 | Status: Foundation Draft

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Data Model](#3-data-model)
4. [API Surface](#4-api-surface)
5. [Security Architecture](#5-security-architecture)
6. [Access Control Matrix](#6-access-control-matrix)
7. [Phase 1 — Foundation](#7-phase-1--foundation)
8. [Phase 2 — Live Data](#8-phase-2--live-data)
9. [Phase 3 — Intelligence](#9-phase-3--intelligence)
10. [Phase 4 — Assistant](#10-phase-4--assistant)
11. [Infrastructure & Deployment](#11-infrastructure--deployment)
12. [Operational Considerations](#12-operational-considerations)

---

## 1. System Overview

FamilyVault is a **private, self-hosted personal finance operating system** for a family trust. It aggregates financial data from bank accounts, brokerages, real estate, private investments, and entity holdings into a unified dashboard with an AI-powered query layer.

### Users & Roles

| Role | Who | Scope |
|------|-----|-------|
| `owner` | Husband, Wife | Full access to all data, admin functions |
| `successor_trustee` | Designated trustees | Read + limited write on trust/entity data |
| `heir` | Son | Curated net worth view, limited document access |

### Key Capabilities

- **Net worth dashboard** with live bank/brokerage/real estate data
- **Entity registry** for trust, LLCs, private investments (AI-extracted)
- **Document intelligence** — Google Drive indexing, OCR, semantic search
- **Email parsing** — Gmail push notifications, auto-extract capital calls, distributions, K-1 notices
- **AI assistant** — natural language queries over all financial data
- **Audit trail** — immutable log of every read/write/query action

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              FAMILYVAULT SYSTEM                                 │
│                           (Private AWS Deployment)                              │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────┐
│  CLIENTS                                                                         │
│                                                                                  │
│   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐          │
│   │  Browser (Owner) │    │  Browser (Trustee│    │  Browser (Heir)  │          │
│   │   Next.js SPA    │    │   Next.js SPA    │    │   Next.js SPA    │          │
│   └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘          │
└────────────┼──────────────────────┼──────────────────────┼───────────────────────┘
             │  HTTPS               │  HTTPS               │  HTTPS
             └──────────────────────┼──────────────────────┘
                                    │
┌───────────────────────────────────▼──────────────────────────────────────────────┐
│  EDGE / LOAD BALANCER                                                            │
│   AWS ALB → CloudFront (static assets + CDN)                                     │
│   WAF rules: geo-restrict, rate limit, bot protection                            │
└───────────────────────────────────┬──────────────────────────────────────────────┘
                                    │
             ┌──────────────────────┼──────────────────────┐
             │                      │                      │
┌────────────▼──────────┐  ┌────────▼──────────┐  ┌───────▼───────────┐
│  NEXT.JS FRONTEND     │  │  FASTAPI BACKEND   │  │  BACKGROUND       │
│  ECS Fargate          │  │  ECS Fargate       │  │  WORKERS          │
│                       │  │                   │  │  ECS Fargate      │
│  - React UI           │  │  - REST API       │  │                   │
│  - Role-gated views   │  │  - Auth layer     │  │  - Plaid sync     │
│  - Chart.js / D3      │  │  - Business logic │  │  - Gmail watcher  │
│  - TanStack Query     │  │  - LangChain      │  │  - Doc indexer    │
│  - ShadCN UI          │  │  - Audit logger   │  │  - RE value sync  │
└───────────────────────┘  └────────┬──────────┘  └───────┬───────────┘
                                    │                      │
                        ┌───────────┼──────────────────────┘
                        │           │
         ┌──────────────▼──┐  ┌─────▼──────────────────────────────────┐
         │  POSTGRESQL +   │  │  EXTERNAL APIs                         │
         │  pgvector        │  │                                        │
         │  RDS (encrypted)│  │  ┌─────────────┐  ┌────────────────┐  │
         │                 │  │  │  Plaid API  │  │  ATTOM Data    │  │
         │  - Core tables  │  │  │  (bank/brok)│  │  (RE values)   │  │
         │  - Vector store │  │  └─────────────┘  └────────────────┘  │
         │  - Audit log    │  │                                        │
         └─────────────────┘  │  ┌─────────────┐  ┌────────────────┐  │
                              │  │  Gmail API  │  │  Google Drive  │  │
         ┌─────────────────┐  │  │  (push ntf) │  │  API           │  │
         │  AWS S3         │  │  └─────────────┘  └────────────────┘  │
         │  (encrypted)    │  │                                        │
         │                 │  │  ┌─────────────┐  ┌────────────────┐  │
         │  - Raw docs     │  │  │  OpenAI     │  │  AWS Textract  │  │
         │  - OCR output   │  │  │  GPT-4 API  │  │  (OCR)         │  │
         │  - Email bodies │  │  └─────────────┘  └────────────────┘  │
         └─────────────────┘  └────────────────────────────────────────┘

         ┌─────────────────┐
         │  AWS Secrets    │
         │  Manager        │
         │  - API keys     │
         │  - OAuth creds  │
         │  - Plaid tokens │
         └─────────────────┘

         ┌─────────────────┐
         │  AWS CloudWatch │
         │  + SES          │
         │  - Logs         │
         │  - Alerts       │
         │  - Monitoring   │
         └─────────────────┘
```

### Component Interaction Flow

```
User Request Flow:
  Browser → ALB → Next.js (SSR/API route proxy) → FastAPI → DB/S3/External APIs

AI Query Flow:
  Browser → FastAPI /chat → LangChain Agent → Tool calls (DB, S3, external)
                                             ↓
                                        OpenAI GPT-4 API
                                             ↓
                                    Synthesized response → Browser

Document Ingestion Flow:
  Google Drive (push webhook) → FastAPI webhook handler
    → Download file → S3 (raw)
    → AWS Textract (OCR)
    → Chunking + Embedding (OpenAI embeddings)
    → pgvector storage
    → Entity extraction (LangChain)
    → DB (Document, extracted fields)

Gmail Push Flow:
  Gmail push notification → FastAPI webhook
    → Fetch email body → S3 (raw)
    → LangChain extraction (capital call / distribution / K-1 / fund update)
    → DB (EmailEvent + extracted data)
    → Alert if action required
```

---

## 3. Data Model

### Entity Relationship Overview

```
User ──< UserRole >── Role
  │
  └── AuditLog

Entity (Trust/LLC/Fund)
  ├── Account (bank/brokerage linked via Plaid OR manual)
  │     └── AccountBalance (time-series snapshots)
  ├── Property (real estate)
  │     └── PropertyValuation (time-series)
  ├── Asset (private investments, other)
  └── NetWorthSnapshot (point-in-time total)

Document
  ├── linked to Entity (optional)
  ├── DocumentChunk (for vector search)
  └── ExtractedField (AI-parsed key-value pairs)

EmailEvent
  ├── linked to Entity (optional)
  └── ExtractedEvent (capital call, distribution, K-1 arrival, etc.)
```

### Schema Definitions

```sql
-- ─────────────────────────────────────────
-- AUTH & USERS
-- ─────────────────────────────────────────

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT NOT NULL UNIQUE,
    display_name    TEXT NOT NULL,
    google_sub      TEXT UNIQUE,          -- Google OAuth subject ID
    totp_secret     TEXT,                 -- encrypted at rest
    totp_enabled    BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    last_login_at   TIMESTAMPTZ
);

CREATE TABLE roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL UNIQUE, -- owner | successor_trustee | heir
    description     TEXT
);

CREATE TABLE user_roles (
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id         UUID REFERENCES roles(id) ON DELETE CASCADE,
    granted_by      UUID REFERENCES users(id),
    granted_at      TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL,        -- hashed session token
    mfa_verified    BOOLEAN DEFAULT FALSE,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ
);

-- ─────────────────────────────────────────
-- ENTITY REGISTRY (Trust / LLC / Fund)
-- ─────────────────────────────────────────

CREATE TYPE entity_type AS ENUM (
    'trust', 'llc', 'private_fund', 'partnership', 'individual', 'other'
);

CREATE TABLE entities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    entity_type     entity_type NOT NULL,
    tax_id_enc      TEXT,                 -- EIN/SSN encrypted
    state_of_formation TEXT,
    formed_date     DATE,
    description     TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    parent_entity_id UUID REFERENCES entities(id),  -- for nested ownership
    ownership_pct   NUMERIC(5,2),                   -- % owned by parent
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    source          TEXT DEFAULT 'manual', -- manual | ai_extracted
    source_doc_id   UUID                  -- FK to documents (set after creation)
);

-- ─────────────────────────────────────────
-- ACCOUNTS (bank, brokerage, credit)
-- ─────────────────────────────────────────

CREATE TYPE account_type AS ENUM (
    'checking', 'savings', 'brokerage', 'retirement', 'credit', 'loan', 'other'
);

CREATE TYPE account_source AS ENUM ('plaid', 'manual');

CREATE TABLE accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id       UUID REFERENCES entities(id),
    account_type    account_type NOT NULL,
    institution     TEXT NOT NULL,
    account_name    TEXT NOT NULL,
    account_mask    TEXT,                 -- last 4 digits
    currency        TEXT DEFAULT 'USD',
    plaid_account_id TEXT UNIQUE,
    plaid_item_id   TEXT,
    plaid_access_token_enc TEXT,          -- encrypted
    source          account_source DEFAULT 'manual',
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE account_balances (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id      UUID REFERENCES accounts(id) ON DELETE CASCADE,
    balance_date    DATE NOT NULL,
    current         NUMERIC(18,2),
    available       NUMERIC(18,2),
    limit_amount    NUMERIC(18,2),
    fetched_at      TIMESTAMPTZ DEFAULT NOW(),
    source          TEXT DEFAULT 'plaid'  -- plaid | manual
);

CREATE INDEX idx_account_balances_account_date
    ON account_balances(account_id, balance_date DESC);

-- ─────────────────────────────────────────
-- ASSETS (private investments, other)
-- ─────────────────────────────────────────

CREATE TYPE asset_type AS ENUM (
    'private_equity', 'private_credit', 'hedge_fund',
    'direct_investment', 'note_receivable', 'cryptocurrency',
    'collectible', 'other'
);

CREATE TABLE assets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id       UUID REFERENCES entities(id),
    asset_type      asset_type NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT,
    investment_date DATE,
    cost_basis      NUMERIC(18,2),
    current_value   NUMERIC(18,2),
    currency        TEXT DEFAULT 'USD',
    ownership_pct   NUMERIC(5,2) DEFAULT 100.00,
    is_active       BOOLEAN DEFAULT TRUE,
    source          TEXT DEFAULT 'manual',
    source_doc_id   UUID,
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE asset_valuations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id        UUID REFERENCES assets(id) ON DELETE CASCADE,
    valuation_date  DATE NOT NULL,
    value           NUMERIC(18,2) NOT NULL,
    notes           TEXT,
    source          TEXT,                 -- manual | ai_extracted | fund_statement
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- REAL ESTATE
-- ─────────────────────────────────────────

CREATE TABLE properties (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id       UUID REFERENCES entities(id),
    address_line1   TEXT NOT NULL,
    address_line2   TEXT,
    city            TEXT NOT NULL,
    state           TEXT NOT NULL,
    zip             TEXT NOT NULL,
    county          TEXT,
    parcel_number   TEXT,
    property_type   TEXT,                 -- sfr | multi_family | commercial | land
    bedrooms        INTEGER,
    bathrooms       NUMERIC(3,1),
    sqft            INTEGER,
    lot_sqft        INTEGER,
    year_built      INTEGER,
    purchase_date   DATE,
    purchase_price  NUMERIC(18,2),
    attom_id        TEXT,                 -- ATTOM Data property ID
    is_rental       BOOLEAN DEFAULT FALSE,
    monthly_rent    NUMERIC(10,2),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE property_valuations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id     UUID REFERENCES properties(id) ON DELETE CASCADE,
    valuation_date  DATE NOT NULL,
    estimated_value NUMERIC(18,2),
    low_estimate    NUMERIC(18,2),
    high_estimate   NUMERIC(18,2),
    source          TEXT NOT NULL,       -- attom | manual | zillow
    raw_response    JSONB,
    fetched_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_property_valuations_property_date
    ON property_valuations(property_id, valuation_date DESC);

-- ─────────────────────────────────────────
-- NET WORTH SNAPSHOTS
-- ─────────────────────────────────────────

CREATE TABLE net_worth_snapshots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date   DATE NOT NULL,
    total_assets    NUMERIC(18,2) NOT NULL,
    total_liabilities NUMERIC(18,2) NOT NULL DEFAULT 0,
    net_worth       NUMERIC(18,2) GENERATED ALWAYS AS (total_assets - total_liabilities) STORED,
    breakdown       JSONB,               -- {cash, real_estate, investments, private, other}
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(snapshot_date)
);

-- ─────────────────────────────────────────
-- DOCUMENTS
-- ─────────────────────────────────────────

CREATE TYPE document_type AS ENUM (
    'k1', 'tax_return', 'deed', 'trust_doc', 'operating_agreement',
    'fund_statement', 'capital_call', 'distribution_notice',
    'property_report', 'insurance', 'appraisal', 'correspondence', 'other'
);

CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id       UUID REFERENCES entities(id),
    document_type   document_type NOT NULL DEFAULT 'other',
    title           TEXT NOT NULL,
    filename        TEXT,
    mime_type       TEXT,
    s3_key          TEXT NOT NULL,        -- raw file location in S3
    s3_key_ocr      TEXT,                 -- Textract output JSON in S3
    google_drive_id TEXT UNIQUE,          -- Drive file ID if sourced from Drive
    google_drive_url TEXT,
    file_size_bytes BIGINT,
    doc_year        INTEGER,              -- fiscal/tax year if applicable
    tags            TEXT[],
    ocr_status      TEXT DEFAULT 'pending', -- pending | processing | done | failed
    embedding_status TEXT DEFAULT 'pending',
    extracted_at    TIMESTAMPTZ,
    indexed_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE document_chunks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index     INTEGER NOT NULL,
    content         TEXT NOT NULL,
    embedding       VECTOR(1536),         -- OpenAI text-embedding-3-small
    page_number     INTEGER,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_document_chunks_embedding
    ON document_chunks USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE INDEX idx_document_chunks_document
    ON document_chunks(document_id);

CREATE TABLE extracted_fields (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID REFERENCES documents(id) ON DELETE CASCADE,
    field_name      TEXT NOT NULL,        -- "partner_share_income", "distribution_amount"
    field_value     TEXT,
    confidence      NUMERIC(4,3),         -- 0.000 - 1.000
    page_number     INTEGER,
    extracted_by    TEXT DEFAULT 'ai',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- EMAIL EVENTS
-- ─────────────────────────────────────────

CREATE TYPE email_event_type AS ENUM (
    'capital_call', 'distribution', 'k1_available', 'fund_update',
    'property_report', 'tax_notice', 'statement_ready', 'other'
);

CREATE TABLE email_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gmail_message_id TEXT UNIQUE,
    gmail_thread_id TEXT,
    entity_id       UUID REFERENCES entities(id),
    event_type      email_event_type DEFAULT 'other',
    subject         TEXT,
    sender          TEXT,
    received_at     TIMESTAMPTZ,
    s3_key_raw      TEXT,                 -- raw email body in S3
    s3_key_attachments TEXT[],            -- attachment S3 keys
    extraction_status TEXT DEFAULT 'pending',
    extracted_at    TIMESTAMPTZ,
    requires_action BOOLEAN DEFAULT FALSE,
    action_due_date DATE,
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE extracted_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_event_id  UUID REFERENCES email_events(id) ON DELETE CASCADE,
    event_type      email_event_type NOT NULL,
    amount          NUMERIC(18,2),
    currency        TEXT DEFAULT 'USD',
    due_date        DATE,
    description     TEXT,
    raw_excerpt     TEXT,
    confidence      NUMERIC(4,3),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- AUDIT LOG (append-only)
-- ─────────────────────────────────────────

CREATE TABLE audit_log (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID REFERENCES users(id),
    action          TEXT NOT NULL,        -- READ | WRITE | DELETE | LOGIN | QUERY | EXPORT
    resource_type   TEXT,                 -- document | account | entity | chat | ...
    resource_id     TEXT,
    detail          JSONB,
    ip_address      INET,
    user_agent      TEXT,
    session_id      UUID,
    occurred_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log is append-only: revoke DELETE + UPDATE on this table in prod
-- Use Postgres row-level security + dedicated audit user

CREATE INDEX idx_audit_log_user ON audit_log(user_id, occurred_at DESC);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
```

---

## 4. API Surface

### Authentication

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/auth/google` | Initiate Google OAuth flow |
| `GET` | `/auth/google/callback` | OAuth callback |
| `POST` | `/auth/mfa/setup` | Generate TOTP secret, return QR |
| `POST` | `/auth/mfa/verify` | Verify TOTP code, elevate session |
| `POST` | `/auth/logout` | Revoke session |
| `GET` | `/auth/session` | Current session info + role |

### Users & Roles (owner only)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/users` | List all users |
| `POST` | `/users/invite` | Invite user (email link) |
| `PATCH` | `/users/{id}/role` | Update user role |
| `DELETE` | `/users/{id}` | Deactivate user |

### Entities

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/entities` | List all entities |
| `POST` | `/entities` | Create entity manually |
| `GET` | `/entities/{id}` | Entity detail + linked accounts/assets |
| `PATCH` | `/entities/{id}` | Update entity |
| `GET` | `/entities/{id}/net-worth` | Entity-level net worth |

### Accounts

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/accounts` | List accounts (filtered by entity/role) |
| `POST` | `/accounts` | Manual account creation |
| `GET` | `/accounts/{id}/balances` | Balance history |
| `POST` | `/accounts/{id}/balances` | Manual balance entry |
| `POST` | `/plaid/link-token` | Create Plaid Link token |
| `POST` | `/plaid/exchange` | Exchange public token |
| `POST` | `/plaid/sync` | Trigger Plaid balance refresh |
| `POST` | `/plaid/webhook` | Plaid webhook receiver |

### Assets

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/assets` | List all private assets |
| `POST` | `/assets` | Create asset |
| `GET` | `/assets/{id}` | Asset detail + valuation history |
| `POST` | `/assets/{id}/valuations` | Add valuation update |

### Properties

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/properties` | List all properties |
| `POST` | `/properties` | Add property |
| `GET` | `/properties/{id}` | Property detail + valuation history |
| `POST` | `/properties/{id}/valuations` | Manual valuation |
| `POST` | `/properties/{id}/refresh-value` | Trigger ATTOM lookup |

### Net Worth

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/net-worth` | Current net worth breakdown |
| `GET` | `/net-worth/history` | Historical snapshots |
| `POST` | `/net-worth/snapshot` | Force snapshot |

### Documents

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/documents` | List documents (paginated, filterable) |
| `POST` | `/documents` | Upload document |
| `GET` | `/documents/{id}` | Document metadata |
| `GET` | `/documents/{id}/download` | Signed S3 URL |
| `GET` | `/documents/{id}/extracted` | Extracted fields |
| `POST` | `/documents/search` | Semantic vector search |
| `POST` | `/drive/sync` | Trigger Google Drive re-index |
| `POST` | `/drive/webhook` | Drive push notification receiver |

### Email Events

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/email-events` | List parsed email events |
| `GET` | `/email-events/{id}` | Event detail |
| `PATCH` | `/email-events/{id}/mark-read` | Mark as read/actioned |
| `GET` | `/email-events/actions-needed` | Events requiring action |
| `POST` | `/gmail/webhook` | Gmail push notification receiver |

### AI Assistant

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/chat` | Send message, get streamed response |
| `GET` | `/chat/history` | Chat history for current session |
| `DELETE` | `/chat/history` | Clear chat history |

### Admin

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/admin/audit-log` | Query audit log (owner only) |
| `GET` | `/admin/health` | System health check |
| `POST` | `/admin/jobs/trigger` | Manually trigger background jobs |

---

## 5. Security Architecture

### Authentication Flow

```
1. User → /auth/google → Google OAuth consent screen
2. Google → /auth/google/callback (with code)
3. Server exchanges code for tokens, verifies email domain
4. Server checks user exists + is_active
5. If TOTP enabled → issue partial session (mfa_verified=false)
6. User → POST /auth/mfa/verify with TOTP code
7. Server verifies TOTP → upgrade session (mfa_verified=true)
8. Full session cookie issued (httpOnly, secure, sameSite=strict)
9. All API requests require valid session + mfa_verified=true
```

### Encryption at Rest

| Data | Mechanism |
|------|-----------|
| Database | AWS RDS storage encryption (AES-256) |
| S3 documents | SSE-S3 or SSE-KMS per-bucket |
| Sensitive fields (tax_id, plaid_tokens, totp_secret) | Application-level AES-256 via Python `cryptography` lib, key from AWS Secrets Manager |
| Backups | RDS automated backups, encrypted |

### Encryption in Transit

- All traffic: TLS 1.2+ enforced at ALB
- Internal service-to-service: VPC-private, no public exposure
- External API calls (Plaid, OpenAI, etc.): TLS, server-side only

### Secrets Management

- **AWS Secrets Manager** for all API keys and credentials
  - Plaid client ID/secret
  - OpenAI API key
  - ATTOM API key
  - Google OAuth client ID/secret
  - Gmail service account credentials
  - Database credentials
  - Application encryption master key
- **No secrets in environment variables** in production (use Secrets Manager SDK)
- **No secrets in code** — enforced via pre-commit hooks + CodeGuru scan

### Network Security

```
VPC Layout:
  Public Subnet:  ALB only
  Private Subnet: ECS tasks (Next.js, FastAPI, Workers)
  Isolated Subnet: RDS PostgreSQL

Security Groups:
  ALB → FastAPI: 8000 only
  ALB → Next.js: 3000 only
  FastAPI → RDS: 5432 only
  FastAPI → S3: via VPC endpoint (no public internet)
  FastAPI → Secrets Manager: via VPC endpoint
  Workers → RDS: 5432 only
  All → External APIs: via NAT Gateway (controlled egress)
```

### Audit Logging

- Every authenticated API call writes to `audit_log`
- Immutable: RDS user has no UPDATE/DELETE on `audit_log`
- Includes: user, action, resource, IP, user agent, timestamp
- AI chat queries logged with query text (truncated to 500 chars) + entity IDs referenced
- CloudWatch Logs for application logs (retain 90 days)

### Backup & Recovery

- RDS automated backups: 7-day retention, point-in-time recovery
- S3 versioning enabled on document bucket
- S3 replication to second region (optional, Phase 2+)
- Recovery time objective (RTO): 4 hours
- Recovery point objective (RPO): 24 hours

### Dependency Security

- Python dependencies: `pip-audit` in CI
- Node dependencies: `npm audit` in CI
- Docker images: ECR image scanning on push
- OWASP dependency check in CI pipeline

---

## 6. Access Control Matrix

### Feature Access by Role

| Feature | `owner` | `successor_trustee` | `heir` |
|---------|:-------:|:-------------------:|:------:|
| **Net Worth Dashboard** | Full (all entities) | Full (trust entities) | Summary only |
| **Account Balances** | ✅ All accounts | ✅ Trust accounts | ❌ |
| **Account Details / Plaid** | ✅ | Read-only | ❌ |
| **Add/Edit Accounts** | ✅ | ❌ | ❌ |
| **Asset Registry** | ✅ Full | ✅ Read-only | Summary values only |
| **Add/Edit Assets** | ✅ | ❌ | ❌ |
| **Real Estate Portfolio** | ✅ Full | ✅ Read-only | ❌ |
| **Property Values** | ✅ | ✅ | ❌ |
| **Entity Registry** | ✅ Full CRUD | ✅ Read-only | ❌ |
| **Documents — Trust Docs** | ✅ | ✅ | ❌ |
| **Documents — Tax Returns** | ✅ | ✅ | ❌ |
| **Documents — K-1s** | ✅ | ✅ | ❌ |
| **Document Upload** | ✅ | ✅ | ❌ |
| **Document Search** | ✅ | ✅ | ❌ |
| **Email Events** | ✅ All | ✅ Trust-related | ❌ |
| **Capital Calls / Distributions** | ✅ | ✅ Read-only | ❌ |
| **AI Chat — Full queries** | ✅ | ✅ | ❌ |
| **AI Chat — Net worth queries** | ✅ | ✅ | Limited |
| **Invite Users** | ✅ | ❌ | ❌ |
| **Manage Roles** | ✅ | ❌ | ❌ |
| **Audit Log** | ✅ | ❌ | ❌ |
| **Admin / Job Triggers** | ✅ | ❌ | ❌ |
| **Plaid Link / Management** | ✅ | ❌ | ❌ |

### Row-Level Security Policy Summary

RLS is enforced at the PostgreSQL level using a `current_user_role` session variable:

```sql
-- Example: accounts table
CREATE POLICY accounts_owner ON accounts
    FOR ALL TO app_role
    USING (true);  -- owners see all

CREATE POLICY accounts_trustee ON accounts
    FOR SELECT TO app_role
    USING (
        entity_id IN (
            SELECT id FROM entities
            WHERE entity_type IN ('trust', 'llc')
        )
    );

-- FastAPI sets role context on each request:
-- SET LOCAL app.current_user_id = '<uuid>';
-- SET LOCAL app.current_role = 'successor_trustee';
```

---

## 7. Phase 1 — Foundation

> **Goal:** Working system with auth, entity registry, manual data entry, and document indexing.
> **Estimated effort:** 6–8 weeks (1–2 developers)

### Deliverables

#### 1.1 Project Bootstrap (Week 1)
- [ ] Repository structure (monorepo: `/frontend`, `/backend`, `/infra`)
- [ ] Docker Compose local dev environment
- [ ] PostgreSQL with pgvector extension enabled
- [ ] CI/CD pipeline skeleton (GitHub Actions)
- [ ] AWS infrastructure baseline (Terraform):
  - VPC, subnets, security groups
  - RDS PostgreSQL (encrypted)
  - S3 buckets (documents, raw emails)
  - ECR repositories
  - Secrets Manager setup
- [ ] Database migrations framework (Alembic)
- [ ] Initial schema (all tables above)

#### 1.2 Authentication (Week 2)
- [ ] Google OAuth 2.0 integration (FastAPI)
- [ ] TOTP MFA setup flow + QR code generation
- [ ] Session management (secure httpOnly cookies)
- [ ] User invite flow (email link)
- [ ] Role assignment (owner seeds initial roles)
- [ ] Audit log middleware (auto-logs all API calls)
- [ ] Next.js auth wrapper + protected routes by role

#### 1.3 Entity Registry (Week 3)
- [ ] Entity CRUD API (owner/trustee)
- [ ] Nested entity ownership (LLC owned by Trust)
- [ ] Entity list + detail views (Next.js)
- [ ] Entity tagging (trust, LLC, fund)

#### 1.4 Manual Net Worth & Assets (Week 4)
- [ ] Manual account creation + balance entry
- [ ] Asset creation with valuations
- [ ] Property creation (no live values yet)
- [ ] Net worth calculation from manual data
- [ ] Net worth dashboard (static, no live data)
- [ ] Net worth history chart

#### 1.5 Google Drive Document Indexing (Weeks 5–6)
- [ ] Google Drive API OAuth setup (service account)
- [ ] Drive folder watch (push notifications via webhook)
- [ ] File download + S3 upload pipeline
- [ ] AWS Textract OCR integration
  - Async job submission
  - Result polling worker
  - Text extraction storage (S3 + DB)
- [ ] Document chunking strategy (500 tokens, 50-token overlap)
- [ ] OpenAI text-embedding-3-small embedding generation
- [ ] pgvector storage for chunks
- [ ] Document list + search UI (Next.js)
- [ ] Document viewer (signed S3 URL)

#### 1.6 Semantic Document Search (Week 7)
- [ ] `/documents/search` endpoint with vector similarity
- [ ] Hybrid search (keyword + vector) for better recall
- [ ] Search UI with result highlighting
- [ ] Document classification (rule-based + AI) for document_type

#### 1.7 Testing & Hardening (Week 8)
- [ ] Unit tests for auth, entity, document endpoints
- [ ] Integration tests for Drive webhook + OCR pipeline
- [ ] Penetration test checklist (OWASP Top 10)
- [ ] Load test document ingestion pipeline
- [ ] Audit log review

### Phase 1 Success Criteria
- All family members can log in with Google + TOTP MFA
- Entity registry reflects full ownership structure
- Manual net worth dashboard shows accurate total
- All Google Drive documents indexed and searchable
- Audit log captures every action

---

## 8. Phase 2 — Live Data

> **Goal:** Real-time bank/brokerage balances, live real estate valuations, live net worth dashboard.
> **Estimated effort:** 4–6 weeks

### Deliverables

#### 2.1 Plaid Integration (Weeks 1–3)
- [ ] Plaid Link UI (Next.js embedded widget)
- [ ] Link token creation + public token exchange
- [ ] Account sync (accounts + balances)
- [ ] Plaid webhook handler (TRANSACTIONS_REMOVED, DEFAULT_UPDATE, etc.)
- [ ] Background sync worker (nightly balance refresh)
- [ ] Plaid access token rotation + error handling
- [ ] Plaid Item health monitoring (re-auth alerts)
- [ ] Balance history time-series storage

#### 2.2 Real Estate Valuations (Weeks 3–4)
- [ ] ATTOM Data API integration
  - Property AVM (automated valuation model)
  - Property detail enrichment (sqft, beds, baths) on first add
- [ ] Valuation refresh worker (weekly schedule)
- [ ] Property detail pages with valuation history chart
- [ ] Manual override for valuation (if ATTOM is wrong)

#### 2.3 Live Net Worth Dashboard (Weeks 4–5)
- [ ] Real-time net worth from live account balances
- [ ] Asset class breakdown: Cash, Investments, Real Estate, Private, Other
- [ ] Entity-level drill-down
- [ ] Net worth trend chart (historical snapshots)
- [ ] Daily snapshot automation (cron job)
- [ ] Dashboard refresh (polling or WebSocket)

#### 2.4 Data Quality & Reconciliation (Week 6)
- [ ] Plaid balance vs manual balance reconciliation alerts
- [ ] Stale data indicators (last-fetched timestamps)
- [ ] Data source confidence indicators
- [ ] Missing data alerts (accounts not synced, properties without valuation)

### Phase 2 Success Criteria
- Bank and brokerage balances update automatically
- Real estate values update weekly from ATTOM
- Net worth dashboard reflects live data with <5 minute lag
- Historical net worth chart shows 12+ months of data

---

## 9. Phase 3 — Intelligence

> **Goal:** Automated Gmail parsing, AI extraction from financial documents, proactive alerts.
> **Estimated effort:** 5–7 weeks

### Deliverables

#### 3.1 Gmail Integration (Weeks 1–2)
- [ ] Gmail API OAuth setup (service account with domain delegation OR user OAuth)
- [ ] Gmail push notification setup (Pub/Sub topic → webhook)
- [ ] Email ingestion pipeline:
  - Fetch message body + attachments
  - Store raw email in S3
  - Store attachments → trigger OCR pipeline
- [ ] Email deduplication (gmail_message_id)

#### 3.2 AI Email Event Extraction (Weeks 2–4)
- [ ] LangChain extraction chain for email events:
  - Capital call detection (fund name, amount, due date)
  - Distribution notice (fund name, amount, date)
  - K-1 availability (entity, tax year)
  - Fund update / NAV update parsing
  - Property management report parsing (rents received, expenses)
- [ ] Entity matching (extracted fund name → entities table)
- [ ] Confidence scoring for extractions
- [ ] Email event list + action queue UI
- [ ] Manual correction interface (if AI extraction is wrong)

#### 3.3 AI Document Intelligence Enhancement (Weeks 4–5)
- [ ] K-1 structured extraction (partner share of income, credits, deductions)
- [ ] Tax return extraction (AGI, total tax, key schedules)
- [ ] Capital account statement parsing
- [ ] Fund statement NAV + distribution extraction
- [ ] Extracted field storage + entity linking
- [ ] Document type auto-classification (LangChain + document content)

#### 3.4 Alert System (Weeks 5–6)
- [ ] Alert rules engine:
  - Capital call due in N days
  - Distribution received (new EmailEvent)
  - Plaid account re-auth required
  - Document indexing failed
  - Net worth change > X% in 30 days
- [ ] Alert delivery: in-app notification + AWS SES email
- [ ] Alert history + acknowledgment UI
- [ ] Per-user alert preferences

#### 3.5 Private Investment Registry AI Enhancement (Week 7)
- [ ] Auto-extract entity details from documents (fund agreements, operating agreements)
- [ ] Auto-link email events to entities
- [ ] Suggested entity creates from document/email extraction (owner approval flow)
- [ ] Investment timeline (capital calls + distributions over time, per entity)

### Phase 3 Success Criteria
- Capital calls auto-detected from Gmail within 5 minutes of email arrival
- K-1s auto-classified and key fields extracted on Google Drive sync
- Alert delivered when action is required
- Private investment registry enriched from document content

---

## 10. Phase 4 — Assistant

> **Goal:** Natural language AI assistant, successor/heir tailored views, full system polish.
> **Estimated effort:** 4–6 weeks

### Deliverables

#### 4.1 LangChain Agent Architecture (Weeks 1–2)
- [ ] LangChain agent with tools:
  - `get_net_worth` — current total + breakdown
  - `get_entity_details` — entity + accounts + assets
  - `get_account_balances` — specific account(s) history
  - `get_property_values` — RE portfolio + valuations
  - `get_email_events` — recent capital calls / distributions / K-1s
  - `search_documents` — semantic search over document corpus
  - `get_asset_history` — asset valuation over time
  - `calculate_allocation` — asset class allocation percentages
- [ ] System prompt with user context (name, role, entity access list)
- [ ] Conversation memory (windowed, stored in DB or Redis)
- [ ] Role-gated tool access (heir sees subset of tools)
- [ ] Server-sent events (SSE) for streaming responses

#### 4.2 Chat Interface (Weeks 2–3)
- [ ] Next.js chat UI (streaming, message history)
- [ ] Source citations (documents, accounts referenced in answer)
- [ ] Suggested queries (context-aware quick starts)
- [ ] Follow-up question suggestions
- [ ] Copy / export chat response
- [ ] Chat audit log (queries + responses)

#### 4.3 Sample Queries the Assistant Should Handle
```
"What is our total net worth as of today?"
"How much cash do we have across all accounts?"
"Which capital calls are due in the next 30 days?"
"What distributions did we receive in Q1 2026?"
"What is our real estate portfolio worth?"
"When was the last time ABC Fund sent a K-1?"
"Summarize the trust operating agreement."
"What is our largest private investment by current value?"
"Show me the net worth trend over the last 2 years."
"Which entities had distributions this year?"
```

#### 4.4 Successor Trustee View (Week 4)
- [ ] Tailored dashboard (trust assets only)
- [ ] Trust document quick-access
- [ ] Entity ownership map (trust → LLCs → assets)
- [ ] Key contacts and trustee obligations checklist (manual)
- [ ] Simplified AI queries (trust-scoped context)

#### 4.5 Heir View (Week 4)
- [ ] Single-page net worth summary (no entity detail)
- [ ] Estate value estimate (simplified)
- [ ] Key documents list (wills, trust summary — if owner grants)
- [ ] No financial account or entity detail access
- [ ] Limited AI chat (net worth questions only)

#### 4.6 System Polish & Performance (Weeks 5–6)
- [ ] Query response time optimization (caching layer for net worth, common queries)
- [ ] Document search result ranking tuning
- [ ] AI tool call latency optimization
- [ ] Mobile-responsive UI audit
- [ ] Export to PDF (net worth report, entity summary)
- [ ] Comprehensive user guide (for successor trustees)
- [ ] Full end-to-end regression test suite
- [ ] Security review + penetration test

### Phase 4 Success Criteria
- Natural language queries return accurate answers in <10 seconds
- All 10 sample queries answered correctly from live data
- Successor trustee can independently navigate trust portfolio
- Heir view shows net worth summary without exposing sensitive detail
- System passes security review

---

## 11. Infrastructure & Deployment

### AWS Service Inventory

| Service | Purpose | Notes |
|---------|---------|-------|
| ECS Fargate | Run Next.js, FastAPI, Workers | No EC2 to manage |
| RDS PostgreSQL | Primary database | Multi-AZ for HA |
| S3 | Document + email storage | Versioning + encryption |
| ECR | Container registry | Image scanning enabled |
| ALB | Load balancer + SSL termination | |
| CloudFront | CDN for Next.js static assets | |
| Secrets Manager | API keys + credentials | Auto-rotation where supported |
| SES | Outbound email (alerts) | |
| CloudWatch | Logs + metrics + alarms | |
| SNS | Gmail push notification relay | |
| Textract | OCR | Async jobs |
| VPC + NAT Gateway | Network isolation | |
| WAF | Web application firewall | |
| KMS | Encryption key management | |

### Terraform Module Structure

```
infra/
├── modules/
│   ├── vpc/
│   ├── rds/
│   ├── ecs-service/
│   ├── s3-bucket/
│   ├── alb/
│   ├── cloudfront/
│   └── secrets/
├── environments/
│   ├── dev/
│   └── prod/
└── main.tf
```

### Environment Strategy

| Environment | Purpose | Scale |
|-------------|---------|-------|
| `local` | Development (Docker Compose) | Single machine |
| `dev` | Integration testing (AWS) | Minimal, spot instances |
| `prod` | Production | Multi-AZ, reserved capacity |

### CI/CD Pipeline

```
Push to main branch:
  1. Lint + Type check (Next.js + FastAPI)
  2. Unit tests
  3. Integration tests (Testcontainers for DB)
  4. Docker build + push to ECR
  5. Terraform plan (dev)
  6. Deploy to dev (ECS rolling update)
  7. Smoke tests against dev
  8. Manual approval gate
  9. Terraform plan (prod)
  10. Deploy to prod (blue/green)
  11. Post-deploy health checks
```

### Background Worker Jobs

| Job | Trigger | Frequency |
|-----|---------|-----------|
| Plaid balance sync | Cron | Nightly 2 AM |
| ATTOM property valuation refresh | Cron | Weekly Sunday |
| Net worth snapshot | Cron | Nightly 3 AM |
| Document embedding retry | Cron | Every 30 min |
| Email event extraction retry | Cron | Every 15 min |
| Gmail push subscription renewal | Cron | Every 6 days (7-day TTL) |
| Drive change poll (fallback) | Cron | Every 15 min |
| Plaid webhook health check | Cron | Daily |

---

## 12. Operational Considerations

### Data Volume Estimates

| Data Type | Estimate | Growth |
|-----------|----------|--------|
| Documents | ~500 initial, 50/year | Low |
| Document chunks | ~50k initial, 5k/year | Low |
| Account balances | ~10 accounts × 365 days | ~4k rows/year |
| Email events | ~200/year | Low |
| Property valuations | ~10 properties × 52 weeks | ~520/year |
| Net worth snapshots | 365/year | Low |
| Audit log entries | ~10k/year | Medium |

RDS instance sizing: `db.t4g.medium` for dev, `db.t4g.large` for prod (adequate for years).

### Monitoring & Alerting

- **Application health:** `/admin/health` endpoint polled by CloudWatch
- **Worker job failures:** CloudWatch alarm on ECS task exit code ≠ 0
- **Plaid item degraded:** Detected in sync, alert to owner via SES
- **OpenAI API errors:** Logged + alerted if sustained failure
- **Textract failures:** Tracked in `ocr_status`, retried automatically
- **Database connection pool:** CloudWatch RDS metrics

### Cost Estimates (Monthly, Prod)

| Service | Est. Monthly Cost |
|---------|------------------|
| RDS t4g.large (Multi-AZ) | ~$120 |
| ECS Fargate (3 services) | ~$80 |
| S3 (storage + requests) | ~$10 |
| ALB + CloudFront | ~$25 |
| Textract (OCR) | ~$5 (low volume) |
| OpenAI API (embeddings + GPT-4) | ~$50–200 (usage-dependent) |
| Plaid (development tier) | Free (production: check pricing) |
| ATTOM Data API | Per-contract |
| Secrets Manager | ~$5 |
| CloudWatch + misc | ~$20 |
| **Total estimate** | **~$315–500/month** |

### Disaster Recovery Playbook (Outline)

1. **Database failure:** RDS Multi-AZ auto-failover (<60 seconds)
2. **ECS task failure:** ECS service restarts task automatically
3. **Full region failure:** Restore from RDS snapshot to new region, update DNS
4. **Data corruption:** RDS point-in-time recovery, S3 versioning rollback
5. **Secrets compromised:** Rotate in Secrets Manager, redeploy ECS (picks up new secrets)
6. **Plaid access token invalidated:** Re-link in UI (owner flow)

### Key Open Questions (Resolve Before Phase 1 Build)

1. **Gmail access method:** Service account with domain delegation (requires Google Workspace) OR individual user OAuth (simpler but requires re-auth periodically). Recommend user OAuth for family Gmail accounts.
2. **ATTOM vs Zillow vs RentCast:** ATTOM has broadest coverage and AVM API. Evaluate pricing vs coverage for your specific property locations before committing.
3. **OpenAI data privacy:** Confirm with legal that sending document excerpts to OpenAI API is acceptable under trust governance. Consider Azure OpenAI (same models, private endpoint, no training on data).
4. **Plaid tier:** Confirm Plaid pricing tier needed for your institution count. Some accounts (Fidelity, Schwab) require Plaid's higher tiers.
5. **Gmail vs service account:** Whose Gmail accounts are monitored? Single "family finance" account or multiple individual accounts?
6. **Heir access timeline:** When does the heir view become active — now, or only upon trustee succession? Affects initial build scope.

---

*Document maintained by: FamilyVault system architects*
*Review cycle: Quarterly or on major architectural change*
