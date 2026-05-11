# FamilyVault — Personal Finance OS
## Architecture & Phased Build Plan

> **Classification: PRIVATE** — Internal planning document. Do not distribute.
> Last updated: 2026-05-10 | Status: v2 — Revised Architecture

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Platform Mindset — Multi-Tenant from Day 1](#2-platform-mindset--multi-tenant-from-day-1)
3. [Tech Stack Decisions](#3-tech-stack-decisions)
4. [Ownership Hierarchy & Entity Model](#4-ownership-hierarchy--entity-model)
5. [Architecture Diagram](#5-architecture-diagram)
6. [Data Model — Full Schema](#6-data-model--full-schema)
7. [Ownership Migration Workflow](#7-ownership-migration-workflow)
8. [Notification System](#8-notification-system)
9. [API Surface](#9-api-surface)
10. [Security Architecture](#10-security-architecture)
11. [Access Control Matrix](#11-access-control-matrix)
12. [Hermes Agent Layer](#12-hermes-agent-layer)
13. [ChatGPT Custom GPT Integration](#13-chatgpt-custom-gpt-integration)
14. [Outbound Sharing Layer (Future)](#14-outbound-sharing-layer-future)
15. [Phase 1 — Foundation + Entity & Asset Registry](#15-phase-1--foundation--entity--asset-registry)
16. [Phase 2 — Live Data (Plaid)](#16-phase-2--live-data-plaid)
17. [Phase 3 — Intelligence (Hermes + Gmail)](#17-phase-3--intelligence-hermes--gmail)
18. [Phase 4 — Advisor Portal + Multi-Tenant Signup](#18-phase-4--advisor-portal--multi-tenant-signup)
19. [Infrastructure & Deployment](#19-infrastructure--deployment)
20. [Operational Considerations](#20-operational-considerations)

---

## 1. System Overview

FamilyVault is a **private, multi-tenant personal finance operating system** built for family trusts and high-net-worth families. It aggregates financial data from bank accounts, brokerages, real estate, private investments, and entity holdings into a unified dashboard with an AI-powered query layer.

The system is architected as a **multi-tenant platform from day one**, scoping all data to a `family_id`. The initial deployment serves a single family (Naveen + wife), but the architecture supports future tenants, subscription tiers, and an advisor portal without re-platforming.

### Core Capabilities

| Capability | Description |
|---|---|
| **Entity Registry** | Trust, LLC, LP hierarchy with parent/child relationships |
| **Asset Registry** | Real estate, private investments, manual valuations, liabilities |
| **Live Account Data** | Bank, brokerage, retirement via Plaid |
| **Net Worth Dashboard** | Real-time roll-up by entity, ownership type, and total |
| **Document Intelligence** | Google Drive indexing, semantic search |
| **Email Parsing** | Gmail capital calls, distributions, K-1 notices (Phase 3) |
| **AI Assistant** | ChatGPT Custom GPT with Actions against Vault API |
| **Ownership Migration** | Pending review workflow for retitling accounts/assets |
| **Notification Feed** | In-app alerts for both users on key events |
| **Audit Trail** | Immutable log of every read/write/query action |
| **Sharing Layer** | Scoped guest portal, report generation (future v0.2+) |

### Users & Roles (v1)

| Role | Who | Scope |
|------|-----|-------|
| `owner` | Husband, Wife | Full access to all family data, admin functions |
| `successor_trustee` | Designated trustees | Read + limited write on trust/entity data |
| `heir` | Son | Curated net worth view, limited document access |

### Subscription Tiers (Platform)

| Tier | Who | Features |
|------|-----|----------|
| `personal` | Individual family | Core Vault features |
| `family_trust` | Family with trust/LLC structure | Full entity hierarchy, multi-user |
| `advisor` | CPA / financial advisor | Manage multiple family clients (Phase 4) |

---

## 2. Platform Mindset — Multi-Tenant from Day 1

Every tenant-scoped entity in the system carries a `family_id`. This is enforced at two layers:

1. **Application layer** — all API queries filter by `family_id` derived from the authenticated session
2. **Database layer** — PostgreSQL Row-Level Security (RLS) policies enforce tenant isolation

### RLS Enforcement Pattern

```sql
-- Enable RLS on all tenant tables
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
-- (repeat for all tenant-scoped tables)

-- App sets session variable on every request
-- SET LOCAL app.current_family_id = '<uuid>';
-- SET LOCAL app.current_user_id = '<uuid>';
-- SET LOCAL app.current_role = 'owner';

-- Policy example: all roles within a family see their family's data
CREATE POLICY tenant_isolation ON entities
    FOR ALL TO app_role
    USING (family_id = current_setting('app.current_family_id')::uuid);
```

### FastAPI Middleware Pattern

```python
# middleware/tenant.py
async def set_tenant_context(request: Request, call_next):
    session = get_session(request)
    async with db.transaction():
        await db.execute(
            f"SET LOCAL app.current_family_id = '{session.family_id}'"
        )
        await db.execute(
            f"SET LOCAL app.current_user_id = '{session.user_id}'"
        )
        await db.execute(
            f"SET LOCAL app.current_role = '{session.role}'"
        )
    response = await call_next(request)
    return response
```

### Tenant Isolation Guarantees

- A family can **never** read or write another family's data
- Even if a bug exists in application-layer filtering, RLS at DB layer prevents cross-tenant leakage
- The `families` table itself is the trust root — no family-level data exists without an entry there
- Admin operations (e.g., billing, support) use a separate privileged `admin_role` that bypasses RLS, never exposed to regular API consumers

---

## 3. Tech Stack Decisions

### Rationale Summary

| Decision | Choice | Rationale |
|---|---|---|
| Backend | FastAPI (Python) | Native AI/ML ecosystem, clean async, OpenAPI generation |
| Frontend | Next.js 14+ (React) | SSR, excellent DX, TanStack Query, ShadCN |
| Database | PostgreSQL + pgvector | RLS, JSONB, vector search, battle-tested |
| AI Agent | Hermes Agent (Nous Research) | Open-source, custom skills, no vendor lock-in |
| AI Assistant | ChatGPT Custom GPT + Actions | User's own OpenAI OAuth, embedded iframe |
| Account Data | Plaid | Industry standard, broad institution coverage |
| Drive Integration | Google Drive API + OAuth | User-owned credentials |
| Document Storage | AWS S3 + RDS pgvector | Raw files in S3, embeddings in pgvector |
| Infrastructure | AWS (ECS Fargate, RDS, S3, ALB) | Serverless containers, managed DB |
| Secrets | AWS Secrets Manager | Centralized, rotation support |

### What We Are NOT Using

- ❌ **Google/Gemini models** — not in any part of the AI stack
- ❌ **LangChain** — replaced by Hermes Agent for background ingestion
- ❌ **Custom LLM worker** — Hermes handles background agent tasks via skills
- ❌ **Azure OpenAI** — not needed; user's own OpenAI key via Custom GPT
- ❌ **Pinecone / Weaviate** — pgvector handles vector search at this scale

### Dependency Matrix

```
┌─────────────────────────────────────────────────────────────────┐
│  RUNTIME DEPENDENCIES                                           │
│                                                                 │
│  Backend (Python 3.12+)                                         │
│    fastapi, uvicorn, asyncpg, sqlalchemy (async)                │
│    alembic (migrations)                                         │
│    python-jose (JWT), pyotp (TOTP)                              │
│    httpx (async HTTP client)                                    │
│    google-auth, google-api-python-client                        │
│    plaid-python                                                 │
│    boto3 (S3, Secrets Manager, Textract)                        │
│    openai (embeddings only, not chat)                           │
│    pgvector (python client)                                     │
│    cryptography (field-level encryption)                        │
│                                                                 │
│  Frontend (Node 20+)                                            │
│    next@14, react@18, typescript                                │
│    @tanstack/react-query                                        │
│    shadcn/ui, tailwindcss                                       │
│    recharts (net worth charts)                                  │
│    @plaid/react (Plaid Link widget)                             │
│    zod (schema validation)                                      │
│                                                                 │
│  Hermes Agent                                                   │
│    hermes (Nous Research open-source)                           │
│    Custom skills: gmail_watcher, drive_indexer                  │
│    Calls Vault FastAPI for writes/notifications                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Ownership Hierarchy & Entity Model

### Real Ownership Structure

The system models a 3-tier ownership hierarchy that reflects how a family trust actually holds assets:

```
Family Trust (top-level entity — type: trust)
  │
  ├── LLC #1 (entity owned by trust — type: llc)
  │     ├── Real Estate Asset #1
  │     ├── Real Estate Asset #2
  │     └── Private Investment (direct)
  │
  ├── LLC #2 (entity owned by trust — type: llc)
  │     ├── Real Estate Asset #3
  │     └── Bank Account (LLC checking)
  │
  ├── LP #1 (limited partnership — type: lp)
  │     └── Investment Holdings
  │
  └── Assets held directly by trust
        └── Brokerage Account

Personal (outside trust — type: personal / joint)
  ├── Joint accounts (husband + wife, with % split — type: joint)
  │     ├── Joint Checking
  │     └── Joint Savings
  └── Sole accounts (type: personal, sole_owner_id set)
        ├── Husband 401k
        └── Wife 401k
```

### Entity Types

| Type | Description |
|------|-------------|
| `trust` | Family trust (top-level, can hold LLCs, assets, accounts) |
| `llc` | Limited liability company (owned by trust or another LLC) |
| `lp` | Limited partnership |
| `personal` | Personal account/asset (individual, outside trust) |
| `joint` | Jointly held between two or more individuals |

### Asset Ownership Types

| ownership_type | Description | Notes |
|---|---|---|
| `entity_held` | Asset held by a trust/LLC/LP entity | entity_id is set, sole_owner_id is null |
| `joint_personal` | Jointly held by individuals (not via entity) | asset_joint_ownership table has % split |
| `sole_personal` | Held by one individual only | sole_owner_id is set |

### Net Worth Roll-Up Logic

```
Total Family Net Worth =
  Σ entity_held assets (equity = value − liability)
  + Σ joint_personal assets (full value counted once)
  + Σ sole_personal assets (husband + wife)
  + Σ account balances (net of liabilities)

Entity-Level Net Worth =
  Σ assets where entity_id = <entity_id>
  + Σ account balances where entity_id = <entity_id>
  (recursive: includes child entities)

By Ownership Type =
  entity_held: assets/accounts via entity_id
  joint_personal: joint-split assets/accounts
  sole_personal: per-user assets/accounts
```

---

## 5. Architecture Diagram

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           FAMILYVAULT SYSTEM                                    │
│                      (Private AWS Deployment — Multi-Tenant)                    │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────┐
│  CLIENTS                                                                         │
│                                                                                  │
│   ┌──────────────────────┐   ┌──────────────────────┐   ┌────────────────────┐  │
│   │  Browser — Owner     │   │  Browser — Trustee   │   │  ChatGPT GPT UI    │  │
│   │  Next.js Dashboard   │   │  Next.js Dashboard   │   │  (ChatGPT.com)     │  │
│   │  + Embedded GPT      │   │  (trust-scoped)      │   │  Custom GPT        │  │
│   └──────────┬───────────┘   └──────────┬───────────┘   └─────────┬──────────┘  │
└──────────────┼──────────────────────────┼─────────────────────────┼──────────────┘
               │  HTTPS                   │  HTTPS                  │  HTTPS
               └──────────────────────────┼─────────────────────────┘
                                          │
┌─────────────────────────────────────────▼────────────────────────────────────────┐
│  EDGE                                                                            │
│   AWS ALB (SSL termination) → CloudFront (static assets)                         │
│   WAF: geo-restrict, rate limit, bot protection                                  │
└──────────────────────────────────────────┬───────────────────────────────────────┘
                                           │
                  ┌────────────────────────┼────────────────────────┐
                  │                        │                        │
     ┌────────────▼──────────┐  ┌──────────▼──────────┐  ┌─────────▼───────────┐
     │  NEXT.JS FRONTEND     │  │  FASTAPI BACKEND     │  │  HERMES AGENT       │
     │  ECS Fargate          │  │  ECS Fargate         │  │  ECS Fargate        │
     │                       │  │                      │  │                     │
     │  - React UI           │  │  - REST API          │  │  Nous Research      │
     │  - Role-gated views   │  │  - Auth layer        │  │  open-source agent  │
     │  - Net worth charts   │  │  - Business logic    │  │                     │
     │  - Entity tree        │  │  - OpenAPI spec      │  │  Skills:            │
     │  - GPT iframe embed   │  │  - Audit logger      │  │  - gmail_watcher    │
     │  - Notification feed  │  │  - Tenant RLS ctx    │  │  - drive_indexer    │
     │  - Pending reviews    │  │  - Notification svc  │  │                     │
     │  - TanStack Query     │  │                      │  │  Calls Vault API    │
     │  - ShadCN UI          │  │                      │  │  to write data +    │
     └───────────────────────┘  └──────────┬───────────┘  │  fire notifications │
                                           │              └─────────┬───────────┘
                              ┌────────────┼─────────────────────────┘
                              │            │
         ┌────────────────────▼──┐   ┌─────▼──────────────────────────────────────┐
         │  POSTGRESQL           │   │  EXTERNAL SERVICES                         │
         │  RDS (encrypted)      │   │                                            │
         │  + pgvector           │   │  ┌──────────────┐  ┌────────────────────┐  │
         │                       │   │  │  Plaid API   │  │  Google Drive API  │  │
         │  RLS on all tables    │   │  │  (bank/brok) │  │  (doc indexing)    │  │
         │  family_id scoping    │   │  └──────────────┘  └────────────────────┘  │
         │                       │   │                                            │
         │  Tables:              │   │  ┌──────────────┐  ┌────────────────────┐  │
         │  - families           │   │  │  Gmail API   │  │  OpenAI Embeddings │  │
         │  - users              │   │  │  (Phase 3)   │  │  text-embedding-3  │  │
         │  - entities           │   │  └──────────────┘  └────────────────────┘  │
         │  - assets             │   │                                            │
         │  - accounts           │   │  ┌──────────────┐  ┌────────────────────┐  │
         │  - documents          │   │  │  AWS Textract│  │  ATTOM Data (RE)   │  │
         │  - notifications      │   │  │  (OCR)       │  │  (Phase 2+)        │  │
         │  - audit_log          │   │  └──────────────┘  └────────────────────┘  │
         │  - pending_migrations │   └────────────────────────────────────────────┘
         └───────────────────────┘
         ┌───────────────────────┐
         │  AWS S3               │
         │  (encrypted)          │
         │  - Raw documents      │
         │  - OCR output         │
         │  - Email bodies       │
         └───────────────────────┘
         ┌───────────────────────┐
         │  AWS Secrets Manager  │
         │  - API keys           │
         │  - OAuth credentials  │
         │  - Plaid tokens       │
         │  - Encryption master  │
         └───────────────────────┘
```

### Request Flow Diagrams

```
─── BROWSER → VAULT API ───────────────────────────────────────────────────────────
  Browser → ALB → Next.js (SSR / API proxy) → FastAPI → DB / S3 / External APIs
  Middleware sets: SET LOCAL app.current_family_id, current_user_id, current_role
  RLS enforces tenant isolation at DB layer automatically

─── CHATGPT GPT → VAULT API ───────────────────────────────────────────────────────
  ChatGPT Custom GPT (user's account) → Vault OpenAPI Actions endpoint
  → FastAPI /v1/gpt/... routes → DB queries (tenant-scoped via JWT family_id)
  → JSON response → GPT synthesizes natural language answer

─── HERMES AGENT → VAULT API ──────────────────────────────────────────────────────
  Hermes Agent (ECS) runs skill on schedule
    gmail_watcher skill:
      → Poll Gmail API → extract events → POST /internal/email-events
      → Vault fires notifications → both users see in-app alert
    drive_indexer skill:
      → Poll Drive API → download new files → S3 upload
      → Textract OCR → embedding → POST /internal/documents/index

─── OWNERSHIP MIGRATION FLOW ──────────────────────────────────────────────────────
  Detection (Plaid metadata change / Gmail parse / manual)
    → INSERT pending_migrations (status: pending)
    → Notify both users (in-app notification)
  User reviews in Pending Reviews card
    → PATCH /pending-migrations/{id}/confirm
    → Update account/asset entity_id
    → Recalculate net worth snapshot
    → Write audit_log
    → Notify both users (confirmed)
```

---

## 6. Data Model — Full Schema

### Entity Relationship Overview

```
families
  └── users (family_id)
  └── entities (family_id) — trust / llc / lp / personal / joint
        └── entity_ownership (entity_id, user_id, pct)
        └── assets (family_id, entity_id)
              └── asset_joint_ownership (asset_id, user_id, pct)
              └── asset_valuations (asset_id)
        └── accounts (family_id, entity_id)
              └── account_joint_ownership (account_id, user_id, pct)
              └── account_balance_history (account_id)
  └── pending_migrations (family_id)
  └── documents (family_id, entity_id)
        └── document_chunks (document_id) — vector(1536)
  └── email_events (family_id)
  └── net_worth_snapshots (family_id)
  └── notifications (family_id, user_id)
  └── audit_log (family_id, user_id)
```

### Complete SQL Schema

```sql
-- ═══════════════════════════════════════════════════════════════
-- EXTENSIONS
-- ═══════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ═══════════════════════════════════════════════════════════════
-- TENANT CORE
-- ═══════════════════════════════════════════════════════════════

CREATE TYPE plan_tier AS ENUM ('personal', 'family_trust', 'advisor');

CREATE TABLE families (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    plan_tier       plan_tier NOT NULL DEFAULT 'family_trust',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id       UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    email           TEXT NOT NULL,
    name            TEXT NOT NULL,
    google_sub      TEXT,                   -- Google OAuth subject ID
    totp_secret     TEXT,                   -- AES-256 encrypted at rest
    totp_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
    role            TEXT NOT NULL DEFAULT 'owner',  -- owner | trustee | heir
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at   TIMESTAMPTZ,
    UNIQUE (family_id, email)
);

CREATE TABLE sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    family_id       UUID NOT NULL REFERENCES families(id),
    token_hash      TEXT NOT NULL,
    mfa_verified    BOOLEAN NOT NULL DEFAULT FALSE,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ
);

-- ═══════════════════════════════════════════════════════════════
-- ENTITY HIERARCHY
-- ═══════════════════════════════════════════════════════════════

CREATE TYPE entity_type AS ENUM ('trust', 'llc', 'lp', 'personal', 'joint');
CREATE TYPE entity_status AS ENUM ('active', 'inactive', 'dissolved');

CREATE TABLE entities (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id        UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    name             TEXT NOT NULL,
    type             entity_type NOT NULL,
    parent_entity_id UUID REFERENCES entities(id),   -- NULL for top-level trust
    tax_id           TEXT,                            -- EIN/SSN, AES-256 encrypted
    state            TEXT,                            -- state of formation
    status           entity_status NOT NULL DEFAULT 'active',
    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_entities_family ON entities(family_id);
CREATE INDEX idx_entities_parent ON entities(parent_entity_id);

-- % ownership of entity by user (for non-standard splits)
CREATE TABLE entity_ownership (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id   UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pct         NUMERIC(6,3) NOT NULL CHECK (pct > 0 AND pct <= 100),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (entity_id, user_id)
);

-- ═══════════════════════════════════════════════════════════════
-- ASSETS
-- ═══════════════════════════════════════════════════════════════

CREATE TYPE asset_ownership_type AS ENUM (
    'entity_held',       -- owned by a trust/LLC/LP entity
    'joint_personal',    -- jointly held by individuals (not via entity)
    'sole_personal'      -- held by one individual only
);

CREATE TABLE assets (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id         UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    entity_id         UUID REFERENCES entities(id),        -- NULL if personal/joint
    name              TEXT NOT NULL,
    asset_type        TEXT NOT NULL,  -- real_estate | private_equity | brokerage | etc.
    ownership_type    asset_ownership_type NOT NULL,
    sole_owner_id     UUID REFERENCES users(id),           -- set if sole_personal
    current_value     NUMERIC(18,2) NOT NULL DEFAULT 0,
    liability_balance NUMERIC(18,2) NOT NULL DEFAULT 0,    -- mortgage, loan, etc.
    valuation_date    DATE,
    notes             TEXT,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Computed: equity = current_value - liability_balance (app layer)

CREATE INDEX idx_assets_family ON assets(family_id);
CREATE INDEX idx_assets_entity ON assets(entity_id);

-- % ownership split for joint_personal assets
CREATE TABLE asset_joint_ownership (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id    UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pct         NUMERIC(6,3) NOT NULL CHECK (pct > 0 AND pct <= 100),
    UNIQUE (asset_id, user_id)
);

CREATE TABLE asset_valuations (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id          UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    value             NUMERIC(18,2) NOT NULL,
    liability_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
    valuation_date    DATE NOT NULL,
    source            TEXT NOT NULL DEFAULT 'manual',  -- manual | attom | ai_extracted
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_asset_valuations_asset_date ON asset_valuations(asset_id, valuation_date DESC);

-- ═══════════════════════════════════════════════════════════════
-- ACCOUNTS (Plaid-linked or manual)
-- ═══════════════════════════════════════════════════════════════

CREATE TYPE account_ownership_type AS ENUM (
    'entity_held',
    'joint_personal',
    'sole_personal'
);

CREATE TABLE accounts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id           UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    entity_id           UUID REFERENCES entities(id),       -- NULL if personal/joint
    plaid_account_id    TEXT UNIQUE,
    plaid_item_id       TEXT,
    plaid_access_token  TEXT,                               -- AES-256 encrypted
    name                TEXT NOT NULL,
    type                TEXT NOT NULL,    -- checking | savings | brokerage | retirement | credit
    subtype             TEXT,             -- e.g. '401k', 'roth', 'money_market'
    ownership_type      account_ownership_type NOT NULL,
    sole_owner_id       UUID REFERENCES users(id),
    current_balance     NUMERIC(18,2) NOT NULL DEFAULT 0,
    available_balance   NUMERIC(18,2),
    currency            TEXT NOT NULL DEFAULT 'USD',
    last_synced         TIMESTAMPTZ,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_accounts_family ON accounts(family_id);
CREATE INDEX idx_accounts_entity ON accounts(entity_id);

-- % ownership split for joint_personal accounts
CREATE TABLE account_joint_ownership (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pct         NUMERIC(6,3) NOT NULL CHECK (pct > 0 AND pct <= 100),
    UNIQUE (account_id, user_id)
);

CREATE TABLE account_balance_history (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id   UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    balance      NUMERIC(18,2) NOT NULL,
    recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_account_balance_history_account_time
    ON account_balance_history(account_id, recorded_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- OWNERSHIP MIGRATION WORKFLOW
-- ═══════════════════════════════════════════════════════════════

CREATE TYPE migration_detection_source AS ENUM (
    'gmail_parse',       -- Hermes detected in email
    'plaid_metadata',    -- Plaid account metadata changed
    'manual'             -- user flagged manually
);

CREATE TYPE migration_status AS ENUM (
    'pending',           -- awaiting user review
    'confirmed',         -- user confirmed, migration applied
    'rejected',          -- user rejected
    'expired'            -- no action taken, auto-expired
);

CREATE TABLE pending_migrations (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id        UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    account_id       UUID REFERENCES accounts(id),     -- which account (if account migration)
    asset_id         UUID REFERENCES assets(id),       -- which asset (if asset migration)
    from_entity_id   UUID REFERENCES entities(id),     -- current owner entity (NULL = personal)
    to_entity_id     UUID REFERENCES entities(id),     -- proposed new owner entity (NULL = personal)
    detection_source migration_detection_source NOT NULL,
    confidence       NUMERIC(4,3),                     -- 0.000–1.000 for AI detections
    status           migration_status NOT NULL DEFAULT 'pending',
    detected_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_by      UUID REFERENCES users(id),
    reviewed_at      TIMESTAMPTZ,
    notes            TEXT,
    -- raw evidence (email excerpt, Plaid payload, etc.)
    evidence         JSONB
);

CREATE INDEX idx_pending_migrations_family_status
    ON pending_migrations(family_id, status);

-- ═══════════════════════════════════════════════════════════════
-- DOCUMENTS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE documents (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id        UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    entity_id        UUID REFERENCES entities(id),
    name             TEXT NOT NULL,
    doc_type         TEXT NOT NULL DEFAULT 'other',
    -- 'k1' | 'tax_return' | 'trust_doc' | 'operating_agreement' |
    -- 'fund_statement' | 'capital_call' | 'distribution' |
    -- 'deed' | 'insurance' | 'appraisal' | 'correspondence' | 'other'
    drive_file_id    TEXT UNIQUE,                       -- Google Drive file ID
    s3_key           TEXT,                              -- raw file in S3
    s3_key_ocr       TEXT,                              -- Textract output in S3
    mime_type        TEXT,
    file_size_bytes  BIGINT,
    tags             TEXT[],
    ocr_status       TEXT NOT NULL DEFAULT 'pending',   -- pending | processing | done | failed
    embedding_status TEXT NOT NULL DEFAULT 'pending',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_family ON documents(family_id);
CREATE INDEX idx_documents_entity ON documents(entity_id);

CREATE TABLE document_chunks (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_text   TEXT NOT NULL,
    embedding    VECTOR(1536),                          -- OpenAI text-embedding-3-small
    chunk_index  INTEGER NOT NULL,
    page_number  INTEGER,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_document_chunks_document ON document_chunks(document_id);
CREATE INDEX idx_document_chunks_embedding
    ON document_chunks USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- ═══════════════════════════════════════════════════════════════
-- EMAIL EVENTS (Phase 3 — Hermes Gmail Skill)
-- ═══════════════════════════════════════════════════════════════

CREATE TYPE email_event_type AS ENUM (
    'capital_call', 'distribution', 'k1_available', 'fund_update',
    'property_report', 'tax_notice', 'statement_ready', 'other'
);

CREATE TABLE email_events (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id         UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    gmail_message_id  TEXT UNIQUE,
    sender            TEXT,
    subject           TEXT,
    received_at       TIMESTAMPTZ,
    event_type        email_event_type NOT NULL DEFAULT 'other',
    extracted_data    JSONB,                 -- amount, due_date, fund_name, etc.
    linked_entity_id  UUID REFERENCES entities(id),
    linked_asset_id   UUID REFERENCES assets(id),
    status            TEXT NOT NULL DEFAULT 'pending',  -- pending | processed | flagged
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_events_family ON email_events(family_id);

-- ═══════════════════════════════════════════════════════════════
-- NET WORTH SNAPSHOTS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE net_worth_snapshots (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id        UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    snapshot_date    DATE NOT NULL,
    total_assets     NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_liabilities NUMERIC(18,2) NOT NULL DEFAULT 0,
    net_worth        NUMERIC(18,2) GENERATED ALWAYS AS (total_assets - total_liabilities) STORED,
    breakdown        JSONB,
    -- breakdown shape:
    -- {
    --   "by_entity": [{"entity_id": "...", "name": "...", "value": 0, "liability": 0}],
    --   "by_ownership_type": {"entity_held": 0, "joint_personal": 0, "sole_personal": 0},
    --   "by_asset_class": {"cash": 0, "real_estate": 0, "investments": 0, "private": 0}
    -- }
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (family_id, snapshot_date)
);

CREATE INDEX idx_net_worth_snapshots_family_date
    ON net_worth_snapshots(family_id, snapshot_date DESC);

-- ═══════════════════════════════════════════════════════════════
-- NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════

CREATE TYPE notification_type AS ENUM (
    'ownership_change_detected',   -- account/asset retitling detected
    'ownership_change_confirmed',  -- user confirmed migration
    'capital_call',                -- capital call from email
    'distribution',                -- distribution received
    'plaid_sync_anomaly',          -- Plaid re-auth needed or balance anomaly
    'valuation_update_due',        -- asset valuation stale
    'document_indexed',            -- new document available
    'system'                       -- admin/system messages
);

CREATE TYPE notification_status AS ENUM ('unread', 'read', 'dismissed');

CREATE TABLE notifications (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id            UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title                TEXT NOT NULL,
    body                 TEXT NOT NULL,
    type                 notification_type NOT NULL,
    status               notification_status NOT NULL DEFAULT 'unread',
    related_entity_type  TEXT,   -- 'account' | 'asset' | 'entity' | 'document' | 'migration'
    related_entity_id    UUID,   -- ID of the related record
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at              TIMESTAMPTZ
);

CREATE INDEX idx_notifications_user_status
    ON notifications(user_id, status, created_at DESC);
CREATE INDEX idx_notifications_family ON notifications(family_id);

-- ═══════════════════════════════════════════════════════════════
-- AUDIT LOG (append-only)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE audit_log (
    id                BIGSERIAL PRIMARY KEY,
    family_id         UUID NOT NULL REFERENCES families(id),
    user_id           UUID REFERENCES users(id),
    action            TEXT NOT NULL,      -- READ | CREATE | UPDATE | DELETE | LOGIN | EXPORT | QUERY
    resource_type     TEXT,               -- entity | asset | account | document | migration | ...
    resource_id       TEXT,
    old_value         JSONB,
    new_value         JSONB,
    ip_address        INET,
    user_agent        TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Append-only: revoke DELETE + UPDATE on audit_log in prod
-- Separate DB user for audit writes only

CREATE INDEX idx_audit_log_family_time ON audit_log(family_id, created_at DESC);
CREATE INDEX idx_audit_log_user ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);

-- ═══════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY POLICIES
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS on all tenant-scoped tables
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities           ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_ownership   ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_joint_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_valuations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_joint_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_balance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE net_worth_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log          ENABLE ROW LEVEL SECURITY;

-- Primary isolation policy (same for all tenant tables)
-- FastAPI sets: SET LOCAL app.current_family_id = '<uuid>'
CREATE POLICY tenant_isolation ON entities
    FOR ALL TO app_role
    USING (family_id = current_setting('app.current_family_id')::uuid);

-- (Apply same pattern to all other tenant-scoped tables)

-- Notification policy: users see only their own notifications
CREATE POLICY notification_user_scope ON notifications
    FOR ALL TO app_role
    USING (
        family_id = current_setting('app.current_family_id')::uuid
        AND user_id = current_setting('app.current_user_id')::uuid
    );
```

### Indexes & Performance Notes

```sql
-- Full-text search on document names and tags
CREATE INDEX idx_documents_name_fts ON documents USING gin(to_tsvector('english', name));
CREATE INDEX idx_documents_tags ON documents USING gin(tags);

-- Account balance time-series queries
CREATE INDEX idx_account_balance_history_account_time
    ON account_balance_history(account_id, recorded_at DESC);

-- Net worth history queries
CREATE INDEX idx_net_worth_snapshots_family_date
    ON net_worth_snapshots(family_id, snapshot_date DESC);

-- Migration review queue
CREATE INDEX idx_pending_migrations_family_status
    ON pending_migrations(family_id, status) WHERE status = 'pending';
```

---

## 7. Ownership Migration Workflow

When an account or asset is retitled (moved from personal ownership to trust/LLC, or vice versa), the system captures this as a pending migration requiring explicit user review.

### Detection Sources

```
1. Plaid metadata change
   → Plaid account name or institution name changes
   → Background sync worker detects discrepancy vs stored entity_id
   → Confidence: medium (0.60–0.80)

2. Gmail parsing (Phase 3 — Hermes gmail_watcher skill)
   → Email contains "account retitled", "transferred to trust", etc.
   → Hermes extracts: account_name, from_entity, to_entity
   → Confidence: high if entity names match (0.80–0.95)

3. Manual
   → User opens account detail and clicks "Flag for retitling"
   → Confidence: 1.00
```

### State Machine

```
                  ┌─────────────┐
  Detection  ───► │   PENDING   │
                  └──────┬──────┘
                         │ User reviews in dashboard
              ┌──────────┴──────────┐
              │                     │
         Confirm                Reject
              │                     │
              ▼                     ▼
         ┌──────────┐         ┌──────────┐
         │CONFIRMED │         │REJECTED  │
         └──────────┘         └──────────┘
              │
    On confirm:
    1. UPDATE account/asset SET entity_id = to_entity_id
       (or SET entity_id = NULL for personal)
    2. Recalculate net_worth_snapshot (or mark stale)
    3. INSERT audit_log (action: OWNERSHIP_MIGRATED)
    4. INSERT notification (both users notified)
    5. UPDATE pending_migrations SET status = 'confirmed'
```

### API Flow

```
POST   /pending-migrations/{id}/confirm
  Body: { notes?: string }
  → Atomic transaction:
      UPDATE accounts/assets SET entity_id = pm.to_entity_id
      UPDATE pending_migrations SET status='confirmed', reviewed_by, reviewed_at
      INSERT audit_log
      INSERT notifications (2 rows — one per user)
      CALL recalculate_net_worth()
  → Returns: updated migration + new net worth summary

POST   /pending-migrations/{id}/reject
  Body: { notes?: string }
  → UPDATE pending_migrations SET status='rejected'
  → INSERT audit_log
```

### Dashboard UI — Pending Reviews Card

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠ Pending Ownership Reviews  (2)                               │
├─────────────────────────────────────────────────────────────────┤
│  Chase Business Checking ****1234                               │
│  Detected: Account name changed to "Family Trust Checking"      │
│  Source: Plaid metadata  |  Confidence: 74%                     │
│  Proposed: Personal → Family Trust                              │
│  [✓ Confirm]  [✗ Reject]                                       │
├─────────────────────────────────────────────────────────────────┤
│  Fidelity Individual Account ****5678                           │
│  Detected via: Gmail (retitling notice)                         │
│  Source: Hermes gmail_watcher  |  Confidence: 91%               │
│  Proposed: Personal → LLC #1                                    │
│  [✓ Confirm]  [✗ Reject]                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Notification System

### Trigger Events

| Event | Trigger Source | Who Notified |
|---|---|---|
| `ownership_change_detected` | Plaid sync / Hermes gmail skill / manual | Both users |
| `ownership_change_confirmed` | User confirms pending migration | Both users |
| `capital_call` | Hermes gmail_watcher extracts capital call | Both users |
| `distribution` | Hermes gmail_watcher extracts distribution | Both users |
| `plaid_sync_anomaly` | Plaid sync fails or requires re-auth | Both users |
| `valuation_update_due` | Asset valuation date > 90 days stale | Both users |
| `document_indexed` | Hermes drive_indexer processes new file | Both users |
| `system` | Admin / internal system message | Targeted user(s) |

### Notification Service (FastAPI)

```python
# services/notifications.py

async def notify_family(
    db: AsyncSession,
    family_id: UUID,
    type: NotificationType,
    title: str,
    body: str,
    related_entity_type: str | None = None,
    related_entity_id: UUID | None = None,
):
    """Create notifications for all active users in a family."""
    users = await db.execute(
        select(User).where(
            User.family_id == family_id,
            User.is_active == True,
            User.role.in_(['owner'])  # owners always notified
        )
    )
    notifications = [
        Notification(
            family_id=family_id,
            user_id=user.id,
            title=title,
            body=body,
            type=type,
            related_entity_type=related_entity_type,
            related_entity_id=str(related_entity_id) if related_entity_id else None,
        )
        for user in users.scalars()
    ]
    db.add_all(notifications)
    await db.commit()
```

### In-App Notification Feed (UI)

```
┌─────────────────────────────────────────────────────────────────┐
│  🔔 Notifications                              [Mark all read]  │
├─────────────────────────────────────────────────────────────────┤
│  ●  Ownership change detected                    2 min ago      │
│     Chase Business Checking may have been retitled              │
│     → View Pending Reviews                                      │
├─────────────────────────────────────────────────────────────────┤
│  ●  Capital call detected                        1 hour ago     │
│     ABC Fund LP — $50,000 due 2026-06-01                        │
│     → View Email Event                                          │
├─────────────────────────────────────────────────────────────────┤
│     Plaid sync completed                         Yesterday       │
│     12 accounts updated — all balances current                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. API Surface

All routes prefixed with `/api/v1/`. FastAPI auto-generates OpenAPI spec at `/api/v1/openapi.json`.

### Authentication

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/auth/google` | Initiate Google OAuth flow |
| `GET` | `/auth/google/callback` | OAuth callback |
| `POST` | `/auth/mfa/setup` | Generate TOTP secret, return QR |
| `POST` | `/auth/mfa/verify` | Verify TOTP code, elevate session |
| `POST` | `/auth/logout` | Revoke session |
| `GET` | `/auth/session` | Current session info + role |

### Families & Users

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/family` | Get current family info |
| `GET` | `/users` | List all users in family |
| `PATCH` | `/users/{id}/role` | Update user role (owner only) |
| `PATCH` | `/users/{id}/status` | Activate/deactivate user |

### Entities

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/entities` | List entities (tree structure with children) |
| `POST` | `/entities` | Create entity |
| `GET` | `/entities/{id}` | Entity detail + linked assets + accounts |
| `PATCH` | `/entities/{id}` | Update entity |
| `DELETE` | `/entities/{id}` | Soft-delete (set status=inactive) |
| `GET` | `/entities/{id}/net-worth` | Entity-level net worth (recursive) |
| `POST` | `/entities/{id}/ownership` | Set user ownership % for entity |

### Assets

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/assets` | List all assets (filterable by entity, ownership_type) |
| `POST` | `/assets` | Create asset |
| `GET` | `/assets/{id}` | Asset detail + valuation history |
| `PATCH` | `/assets/{id}` | Update asset |
| `DELETE` | `/assets/{id}` | Soft-delete |
| `POST` | `/assets/{id}/valuations` | Add valuation update |
| `GET` | `/assets/{id}/valuations` | Valuation history |
| `POST` | `/assets/{id}/joint-ownership` | Set joint ownership splits |

### Accounts

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/accounts` | List accounts (filterable by entity, type, ownership_type) |
| `POST` | `/accounts` | Manual account creation |
| `GET` | `/accounts/{id}` | Account detail |
| `PATCH` | `/accounts/{id}` | Update account (entity assignment, ownership type) |
| `GET` | `/accounts/{id}/balance-history` | Balance time series |
| `POST` | `/accounts/{id}/balance-history` | Manual balance entry |
| `POST` | `/plaid/link-token` | Create Plaid Link token |
| `POST` | `/plaid/exchange` | Exchange public token, create accounts |
| `POST` | `/plaid/sync` | Trigger Plaid balance refresh |
| `POST` | `/plaid/webhook` | Plaid webhook receiver |

### Ownership Migrations

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/pending-migrations` | List pending migrations (family-scoped) |
| `GET` | `/pending-migrations/{id}` | Migration detail + evidence |
| `POST` | `/pending-migrations/{id}/confirm` | Confirm migration (applies change) |
| `POST` | `/pending-migrations/{id}/reject` | Reject migration |
| `POST` | `/pending-migrations` | Manual migration flag |

### Net Worth

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/net-worth` | Current net worth + breakdown |
| `GET` | `/net-worth/history` | Historical snapshots |
| `POST` | `/net-worth/snapshot` | Force snapshot creation |
| `GET` | `/net-worth/by-entity` | Net worth grouped by entity |
| `GET` | `/net-worth/by-ownership-type` | Net worth grouped by ownership type |

### Documents

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/documents` | List documents (paginated, filterable by entity, doc_type) |
| `POST` | `/documents` | Upload document |
| `GET` | `/documents/{id}` | Document metadata |
| `GET` | `/documents/{id}/download` | Signed S3 URL |
| `PATCH` | `/documents/{id}` | Update tags, entity assignment, doc_type |
| `POST` | `/documents/search` | Semantic vector search |
| `POST` | `/drive/sync` | Trigger Google Drive re-index |
| `POST` | `/drive/webhook` | Drive push notification receiver |

### Notifications

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/notifications` | List notifications for current user |
| `POST` | `/notifications/{id}/read` | Mark notification as read |
| `POST` | `/notifications/read-all` | Mark all as read |
| `GET` | `/notifications/unread-count` | Unread count (for badge) |

### Email Events (Phase 3)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/email-events` | List parsed email events |
| `GET` | `/email-events/{id}` | Event detail |
| `PATCH` | `/email-events/{id}` | Update status, linked_entity_id |
| `POST` | `/gmail/webhook` | Gmail push notification receiver (Hermes) |

### Audit Log

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/audit-log` | Query audit log (owner only, paginated) |

### Internal (Hermes → Vault)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/internal/email-events` | Hermes posts extracted email event |
| `POST` | `/internal/documents/index` | Hermes posts indexed document record |
| `POST` | `/internal/pending-migrations` | Hermes posts detected migration |
| `POST` | `/internal/notifications` | Hermes posts notification to fire |

Internal routes require a shared HMAC secret (not user JWT), validated by `InternalAuthMiddleware`.

### ChatGPT GPT Actions Routes

These routes are designed for use by the ChatGPT Custom GPT:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/gpt/net-worth` | Current net worth summary |
| `GET` | `/v1/gpt/entities` | List entities with asset counts |
| `GET` | `/v1/gpt/accounts` | List accounts with balances |
| `GET` | `/v1/gpt/assets` | List assets with values |
| `POST` | `/v1/gpt/documents/search` | Semantic document search |
| `GET` | `/v1/gpt/notifications` | Recent unread notifications |
| `GET` | `/v1/gpt/pending-migrations` | Pending ownership reviews |

GPT Actions authenticate via OAuth 2.0 (user's own OpenAI account, scoped to their `family_id` JWT).

---

## 10. Security Architecture

### Authentication Flow

```
1. User → GET /auth/google
   → Redirect to Google OAuth consent screen

2. Google → GET /auth/google/callback (authorization code)
   → Server exchanges code for tokens
   → Verify google_sub in users table
   → Verify is_active = true

3. If totp_enabled = true:
   → Issue partial session (mfa_verified = false)
   → Return: { status: 'mfa_required' }

4. User → POST /auth/mfa/verify { code: '123456' }
   → Verify TOTP using pyotp
   → Upgrade session: mfa_verified = true
   → Set httpOnly + Secure + SameSite=Strict session cookie

5. All API requests:
   → Validate session cookie
   → Check mfa_verified = true
   → Set tenant context (family_id, user_id, role)
   → Pass to route handler
```

### Encryption at Rest

| Data | Mechanism |
|------|-----------|
| Database (all tables) | AWS RDS storage encryption (AES-256, KMS) |
| S3 documents | SSE-S3 or SSE-KMS per-bucket |
| `users.totp_secret` | Application-level AES-256, key from Secrets Manager |
| `accounts.plaid_access_token` | Application-level AES-256, key from Secrets Manager |
| `entities.tax_id` | Application-level AES-256, key from Secrets Manager |
| RDS backups | Encrypted via RDS automated backup |

### Encryption in Transit

- All traffic: TLS 1.2+ enforced at ALB (TLS 1.3 preferred)
- Internal ECS service-to-service: VPC-private, TLS not required (same VPC)
- External API calls: TLS, server-side only (Plaid, Google, OpenAI embeddings)
- Hermes → Vault API: HMAC-signed requests over TLS

### Secrets Management

```
AWS Secrets Manager holds:
  - PLAID_CLIENT_ID / PLAID_SECRET
  - GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET
  - OPENAI_API_KEY (for embeddings only)
  - GMAIL_SERVICE_ACCOUNT_CREDENTIALS (Phase 3)
  - DB_CONNECTION_STRING
  - APP_ENCRYPTION_MASTER_KEY
  - INTERNAL_HMAC_SECRET (Hermes → Vault auth)
  - HERMES_API_KEY

Rules:
  - No secrets in environment variables (Fargate uses Secrets Manager injection)
  - No secrets in code (pre-commit hook blocks common patterns)
  - Separate secret per environment (dev / prod)
```

### Network Security

```
VPC Layout:
  Public Subnet:    ALB only (no ECS tasks)
  Private Subnet:   ECS tasks (Next.js, FastAPI, Hermes)
  Isolated Subnet:  RDS PostgreSQL (no NAT, no internet)

Security Groups:
  alb-sg:           Inbound 443 from 0.0.0.0/0
  nextjs-sg:        Inbound 3000 from alb-sg only
  fastapi-sg:       Inbound 8000 from alb-sg + nextjs-sg
  hermes-sg:        Outbound to fastapi-sg (internal calls)
  rds-sg:           Inbound 5432 from fastapi-sg + hermes-sg only
  
VPC Endpoints (no public internet for internal AWS traffic):
  - S3 Gateway Endpoint
  - Secrets Manager Interface Endpoint
  - ECR Interface Endpoint (image pulls)
```

### Audit Logging

```
Every authenticated API call → INSERT audit_log
  - action: READ | CREATE | UPDATE | DELETE | LOGIN | EXPORT | QUERY
  - resource_type: entity | asset | account | document | migration | net_worth
  - resource_id: UUID of affected record
  - old_value / new_value: JSONB diff (for CREATE / UPDATE / DELETE)
  - ip_address: from X-Forwarded-For (validated)
  - created_at: server timestamp (not client)

Audit log is append-only:
  - DB user 'app_role' has no UPDATE or DELETE on audit_log table
  - A separate 'audit_writer' role is used for inserts only
  - CloudWatch Logs retention: 90 days
  - S3 archive: indefinite (Glacier after 1 year)
```

---

## 11. Access Control Matrix

### Feature Access by Role

| Feature | `owner` | `successor_trustee` | `heir` |
|---------|:-------:|:-------------------:|:------:|
| **Net Worth Dashboard** | Full (all entities) | Full (trust entities) | Summary only |
| **Entity Registry** | Full CRUD | Read-only | ❌ |
| **Asset Registry** | Full CRUD | Read-only | Summary values only |
| **Account Balances** | ✅ All accounts | ✅ Trust accounts | ❌ |
| **Add/Edit Accounts** | ✅ | ❌ | ❌ |
| **Plaid Link / Manage** | ✅ | ❌ | ❌ |
| **Pending Migrations** | ✅ Review + confirm | ❌ | ❌ |
| **Documents — All types** | ✅ | ✅ Read-only | ❌ |
| **Document Upload** | ✅ | ✅ | ❌ |
| **Document Search** | ✅ | ✅ | ❌ |
| **Email Events** | ✅ | Read-only | ❌ |
| **AI Assistant (Full)** | ✅ | ✅ | Limited (net worth only) |
| **Notification Feed** | ✅ | ✅ | ✅ (own notifications) |
| **Invite Users** | ✅ | ❌ | ❌ |
| **Audit Log** | ✅ | ❌ | ❌ |
| **Admin / Job Triggers** | ✅ | ❌ | ❌ |

### Row-Level Security: Role-Aware Pattern

```sql
-- For tables where role matters (e.g., accounts: trustee sees trust accounts only)
-- FastAPI sets session variables, policies use them

-- Owner: all accounts in family
CREATE POLICY accounts_owner ON accounts
    FOR ALL TO app_role
    USING (
        family_id = current_setting('app.current_family_id')::uuid
        AND current_setting('app.current_role') = 'owner'
    );

-- Trustee: only accounts linked to trust/llc entities
CREATE POLICY accounts_trustee ON accounts
    FOR SELECT TO app_role
    USING (
        family_id = current_setting('app.current_family_id')::uuid
        AND current_setting('app.current_role') = 'successor_trustee'
        AND (
            entity_id IS NULL  -- if you want to be conservative, exclude
            OR entity_id IN (
                SELECT id FROM entities
                WHERE type IN ('trust', 'llc', 'lp')
                  AND family_id = current_setting('app.current_family_id')::uuid
            )
        )
    );
```

---

## 12. Hermes Agent Layer

Hermes is the **background intelligence layer** — an open-source agent from Nous Research that runs custom skills to automate data ingestion. It replaces a custom LangChain worker.

### Architecture

```
┌───────────────────────────────────────────────────────────────┐
│  HERMES AGENT (ECS Fargate — separate task definition)        │
│                                                               │
│  Skills registered:                                           │
│    - gmail_watcher      (Phase 3)                             │
│    - drive_indexer      (Phase 2/3)                           │
│    - plaid_sync_monitor (Phase 2)                             │
│                                                               │
│  Each skill:                                                  │
│    1. Polls external API (Gmail / Drive / Plaid webhook)      │
│    2. Processes data (extract, embed, classify)               │
│    3. Calls Vault internal API to write results               │
│    4. Vault service layer fires notifications                 │
│                                                               │
│  Auth to Vault API: HMAC-signed request header                │
│    X-Internal-Signature: HMAC-SHA256(body, HMAC_SECRET)       │
└───────────────────────────────────────────────────────────────┘
```

### Skill: drive_indexer

```
Trigger: Google Drive push notification (webhook) OR cron poll (every 15 min fallback)

Steps:
  1. Receive Drive change notification (file added/modified in finance folder)
  2. Download file from Drive → upload to S3 (raw)
  3. Submit to AWS Textract async job (for PDFs)
  4. On Textract completion:
     a. Extract text → chunk (500 tokens, 50-token overlap)
     b. Generate embeddings via OpenAI text-embedding-3-small
     c. POST /internal/documents/index with chunks + metadata
  5. Vault stores document_chunks in pgvector
  6. POST /internal/notifications → notify both users (document indexed)
```

### Skill: gmail_watcher (Phase 3)

```
Trigger: Gmail push notification via Cloud Pub/Sub → Vault webhook → Hermes

Steps:
  1. Receive notification: new message in monitored Gmail account
  2. Fetch email body + attachments via Gmail API
  3. Store raw email in S3
  4. Run extraction chain:
     - Capital call? → extract: fund_name, amount, due_date
     - Distribution? → extract: fund_name, amount, effective_date
     - K-1 notice? → extract: fund_name, tax_year
     - Retitling notice? → extract: account_name, from_entity, to_entity
  5. POST /internal/email-events with extracted_data
  6. If retitling detected → POST /internal/pending-migrations
  7. POST /internal/notifications → notify both users
```

### Skill: plaid_sync_monitor

```
Trigger: Plaid webhook (DEFAULT_UPDATE, ITEM_ERROR, etc.) → Vault /plaid/webhook
  → Vault enqueues task → Hermes picks up

Steps:
  1. Receive Plaid webhook payload
  2. Fetch updated balances for affected accounts
  3. Compare vs stored entity_id / account metadata
  4. If metadata mismatch → POST /internal/pending-migrations
  5. POST /internal/notifications (if anomaly)
  6. Update account balances in DB
```

### Hermes Internal API Auth

```python
# Vault middleware for internal routes
class InternalAuthMiddleware:
    async def __call__(self, request: Request, call_next):
        if request.url.path.startswith('/api/v1/internal/'):
            body = await request.body()
            signature = request.headers.get('X-Internal-Signature')
            expected = hmac.new(
                INTERNAL_HMAC_SECRET.encode(),
                body,
                hashlib.sha256
            ).hexdigest()
            if not hmac.compare_digest(signature or '', expected):
                raise HTTPException(status_code=401, detail='Invalid internal signature')
        return await call_next(request)
```

---

## 13. ChatGPT Custom GPT Integration

The AI assistant is a **ChatGPT Custom GPT** configured with Actions against the Vault OpenAPI spec. The user uses their own OpenAI account — no API key costs on the Vault side for assistant queries.

### Architecture

```
User → ChatGPT.com (Custom GPT)
  → GPT reads system prompt: "You are the FamilyVault assistant for [user_name]..."
  → User asks: "What's our total net worth?"
  → GPT invokes Action: GET /api/v1/gpt/net-worth
  → Vault FastAPI authenticates via OAuth 2.0 JWT (family_id scoped)
  → Returns: { net_worth: 4200000, breakdown: {...} }
  → GPT synthesizes: "Your family's total net worth is $4.2M..."

Embed in Vault dashboard:
  → <iframe src="https://chatgpt.com/g/g-XXXXXX" />
  → Or link to GPT in sidebar navigation
```

### OAuth Flow for GPT Actions

```
1. User opens Custom GPT (first time)
2. GPT Actions requires authorization → redirect to Vault OAuth endpoint
   GET /auth/gpt/authorize?client_id=...&redirect_uri=...&scope=read:vault
3. User authenticates with Google OAuth + TOTP in Vault
4. Vault issues JWT scoped to: { family_id, user_id, scope: ['read:vault'] }
5. JWT returned to GPT as Bearer token
6. All subsequent GPT Action calls: Authorization: Bearer <jwt>
7. Vault validates JWT, extracts family_id, applies RLS
```

### GPT System Prompt Template

```
You are FamilyVault Assistant, a knowledgeable financial assistant
for the [FAMILY_NAME] family. You have access to their financial data
through the FamilyVault API.

You can answer questions about:
- Total net worth and historical trends
- Entity structure (Family Trust, LLCs, LPs)
- Bank and brokerage account balances
- Asset values and liabilities
- Documents (K-1s, trust docs, fund statements)
- Pending ownership changes and notifications

You should be accurate, concise, and use appropriate financial terminology.
Always cite the data source and date when providing numbers.
Never speculate about future values. If data is unavailable, say so.

Current date: [injected at query time]
User: [user_name], Role: [role]
```

### Available Actions (OpenAPI Spec)

```yaml
openapi: 3.1.0
info:
  title: FamilyVault GPT Actions
  version: 1.0.0
paths:
  /api/v1/gpt/net-worth:
    get:
      operationId: getNetWorth
      summary: Get current net worth with breakdown
      responses: ...
  /api/v1/gpt/entities:
    get:
      operationId: listEntities
      summary: List entities with hierarchy and asset counts
      responses: ...
  /api/v1/gpt/accounts:
    get:
      operationId: listAccounts
      summary: List accounts with current balances
      responses: ...
  /api/v1/gpt/assets:
    get:
      operationId: listAssets
      summary: List assets with values and liabilities
      responses: ...
  /api/v1/gpt/documents/search:
    post:
      operationId: searchDocuments
      summary: Semantic search over indexed documents
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                query: { type: string }
                entity_id: { type: string }
                doc_type: { type: string }
      responses: ...
  /api/v1/gpt/notifications:
    get:
      operationId: getNotifications
      summary: Get recent unread notifications
      responses: ...
  /api/v1/gpt/pending-migrations:
    get:
      operationId: getPendingMigrations
      summary: Get pending ownership review items
      responses: ...
```

### Sample Queries the GPT Should Handle

```
"What is our total net worth as of today?"
"How much cash do we have across all accounts?"
"What's in LLC #1?"
"Show me the net worth breakdown by entity"
"What capital calls are pending?"
"When was the last distribution from ABC Fund?"
"Find the operating agreement for LLC #1"
"What's our total real estate equity?"
"Which accounts still need to be assigned to an entity?"
"Show me the net worth trend over the last 12 months"
"Are there any pending ownership changes I need to review?"
"What's our 401k balance?"
```

---

## 14. Outbound Sharing Layer (Future — v0.2+)

The data model supports a future sharing layer. Architecture is designed now so it doesn't require schema changes.

### Concept

```
Owner creates a share link:
  POST /share-links
  {
    "recipient_name": "John Smith (CPA)",
    "scope": ["net_worth", "documents:tax_returns"],
    "entity_filter": ["<trust_id>"],
    "expires_at": "2026-12-31",
    "password_protected": true
  }

  → Returns: { url: "https://vault.family.com/share/abc123xyz", token: "..." }

Recipient opens link → Vault renders scoped read-only view
  → No auth required (share token acts as credential)
  → Scope limits what data is visible
  → All access logged to audit_log (actor: share_token)
  → Expired tokens are rejected
```

### Report Generation

```
POST /reports/generate
{
  "report_type": "net_worth_statement",
  "as_of_date": "2026-05-01",
  "include_entities": ["<trust_id>", "<llc1_id>"],
  "format": "pdf"
}

Report types:
  - net_worth_statement     → Total NW, entity breakdown, asset class breakdown
  - tax_prep_package        → Entity list, account list, K-1s, cost basis summary
  - trust_asset_inventory   → All assets under trust with valuations
  - investment_position_report → Private investments, capital calls, distributions

AI + Vault data → PDF report
  → GPT drafts narrative sections
  → Vault data populates tables/charts
  → PDF generated (WeasyPrint or Playwright headless)
  → Stored in S3, link returned
```

### Share Target Types

| Recipient | Report Type | Scope |
|-----------|-------------|-------|
| CPA | Tax Prep Package | Entities, K-1s, accounts, tax docs |
| Financial Advisor | Net Worth Statement | NW breakdown, investment positions |
| Successor Trustee | Trust Asset Inventory | Trust entities, assets, documents |
| Fund Manager | Investment Position Report | Specific fund positions |
| Investment Partner | Net Worth Statement (summary) | Scoped NW only |

### Schema (Deferred — design only)

```sql
-- share_links (id, family_id, created_by, recipient_name, scope jsonb,
--              entity_filter uuid[], password_hash, token_hash,
--              expires_at, max_views, view_count, created_at, revoked_at)

-- share_link_access_log (id, share_link_id, ip_address, accessed_at, action)

-- reports (id, family_id, report_type, as_of_date, s3_key, created_by,
--          share_link_id, created_at)
```

---

## 15. Phase 1 — Foundation + Entity & Asset Registry

> **Goal:** Working authentication, entity/asset registry, manual net worth dashboard, basic document indexing.
> **Timeline:** Weeks 1–2 (MVP Sprint 1)

### 15.1 Bootstrap

- [ ] Monorepo structure: `/frontend` (Next.js), `/backend` (FastAPI), `/agent` (Hermes), `/infra` (Terraform)
- [ ] Docker Compose local dev environment (Postgres + pgvector, FastAPI, Next.js)
- [ ] Database migrations framework (Alembic)
- [ ] Initial schema: all tables from Section 6
- [ ] RLS policies enabled and tested
- [ ] CI pipeline skeleton (GitHub Actions: lint, typecheck, test)

### 15.2 Authentication

- [ ] Google OAuth 2.0 (FastAPI + httpx)
- [ ] TOTP MFA: setup flow, QR code generation (pyotp), verify endpoint
- [ ] Session management: httpOnly + Secure + SameSite=Strict cookies
- [ ] Two users seeded (owner role for both)
- [ ] Next.js auth wrapper + protected routes

### 15.3 Entity Registry

- [ ] Entity CRUD API with parent/child relationships
- [ ] Entity types: trust | llc | lp | personal | joint
- [ ] Entity tree UI: expandable tree with child entities nested
- [ ] Entity detail page: linked assets, linked accounts, net worth
- [ ] Entity ownership % entry (entity_ownership table)

### 15.4 Asset Registry

- [ ] Asset CRUD API
- [ ] Ownership type: entity_held | joint_personal | sole_personal
- [ ] Sole owner assignment (sole_owner_id)
- [ ] Joint ownership splits (asset_joint_ownership)
- [ ] Manual valuation entry (asset_valuations)
- [ ] Liability entry (liability_balance on assets)
- [ ] Asset equity display: value − liability
- [ ] Asset list UI with entity filter + ownership type filter
- [ ] Asset detail page with valuation history chart

### 15.5 Net Worth Dashboard

- [ ] Net worth calculation: sum of asset equity + account balances
- [ ] Roll-up by entity (recursive: includes child entities)
- [ ] Roll-up by ownership type
- [ ] Total family net worth
- [ ] Weekly auto-snapshot (cron job)
- [ ] Net worth history chart (recharts)
- [ ] Dashboard: summary card, entity tree with assets nested, asset details

### 15.6 Scaffolding (used in later sprints)

- [ ] `pending_migrations` table + stub API endpoints
- [ ] `notifications` table + feed UI (empty state, polling)
- [ ] `audit_log` table + middleware (auto-log all API writes)

### Phase 1 Success Criteria

- Both users can log in with Google OAuth + TOTP MFA
- Full entity hierarchy created (trust → LLC → assets)
- Assets created with ownership types, valuations, liabilities
- Net worth dashboard shows accurate total with entity drill-down
- Net worth snapshot taken weekly automatically
- Audit log captures all writes

---

## 16. Phase 2 — Live Data (Plaid)

> **Goal:** Real-time bank/brokerage/retirement balances feeding live net worth dashboard, Plaid-based migration detection.
> **Timeline:** Weeks 3–4 (MVP Sprint 2)

### 16.1 Plaid Integration

- [ ] Plaid Link UI embedded in Next.js (react-plaid-link)
- [ ] `POST /plaid/link-token` → create link token
- [ ] `POST /plaid/exchange` → exchange public token → store encrypted access token
- [ ] Auto-create accounts in Vault from Plaid connection
  - Account type/subtype mapped to Vault account types
  - Default ownership_type: `sole_personal` (user assigns entity later)
- [ ] Account entity assignment UI (assign account to entity after linking)
- [ ] Plaid webhook handler: DEFAULT_UPDATE, ITEM_ERROR, PENDING_EXPIRATION

### 16.2 Balance Sync

- [ ] Background sync: nightly balance refresh via Hermes plaid_sync_monitor
- [ ] On sync: update `accounts.current_balance`, insert `account_balance_history`
- [ ] Net worth dashboard auto-updates after sync
- [ ] Last synced timestamp displayed per account
- [ ] Stale indicator if balance > 24h old

### 16.3 Migration Detection

- [ ] Hermes plaid_sync_monitor detects account metadata changes (name, institution)
- [ ] Compare vs stored entity_id → if mismatch, create `pending_migration`
- [ ] Pending Reviews card on dashboard
- [ ] `POST /pending-migrations/{id}/confirm` → atomic migration apply
- [ ] `POST /pending-migrations/{id}/reject`
- [ ] Notification sent to both users on detection and confirmation

### 16.4 Account Coverage (MVP)

| Account Type | Plaid Product | Notes |
|---|---|---|
| Checking / Savings | Auth + Balance | Most banks |
| Brokerage (taxable) | Investments | Fidelity, Schwab, etc. |
| Retirement (401k, IRA) | Investments | Same as brokerage |
| Credit cards | Liabilities | Balance as negative |

### Phase 2 Success Criteria

- All bank, brokerage, and retirement accounts linked via Plaid
- Live balance sync running nightly (and on Plaid webhook)
- Net worth dashboard shows live data
- Plaid metadata changes surface as pending migration items
- User can confirm/reject ownership migrations from dashboard

---

## 17. Phase 3 — Intelligence (Hermes + Gmail)

> **Goal:** Automated email parsing for capital calls/distributions, Google Drive document indexing with semantic search.
> **Timeline:** Post-MVP (v0.2)

### 17.1 Google Drive Indexing (Hermes drive_indexer skill)

- [ ] Google Drive OAuth (service account or user OAuth)
- [ ] Register Drive folder watch (push notifications)
- [ ] Fallback: cron poll every 15 minutes for changes
- [ ] File download → S3 upload pipeline
- [ ] AWS Textract OCR (async job → poll → store)
- [ ] Document chunking (500 tokens, 50-token overlap)
- [ ] OpenAI text-embedding-3-small embeddings
- [ ] pgvector storage + ivfflat index
- [ ] Document semantic search endpoint
- [ ] Manual document tagging UI (entity, doc_type)
- [ ] Drive webhook: `POST /drive/webhook`

### 17.2 Gmail Parsing (Hermes gmail_watcher skill)

- [ ] Gmail API OAuth (user OAuth recommended for family accounts)
- [ ] Gmail push via Cloud Pub/Sub → `POST /gmail/webhook`
- [ ] Hermes gmail_watcher picks up webhook events
- [ ] Email extraction:
  - Capital call (fund name, amount, due date)
  - Distribution (fund name, amount, date)
  - K-1 availability (fund name, tax year)
  - Account retitling notice
- [ ] Entity matching (extracted fund name → entities table fuzzy match)
- [ ] Email event list UI with action queue
- [ ] Manual correction interface for AI extraction errors
- [ ] Capital call / distribution feeds notification system

### 17.3 Alert Enhancements

- [ ] Capital call due in < 14 days → alert
- [ ] Distribution received → alert
- [ ] New K-1 available → alert
- [ ] Asset valuation > 90 days stale → alert
- [ ] Email delivery via AWS SES (as secondary channel in addition to in-app)

### Phase 3 Success Criteria

- Capital calls auto-detected from Gmail within 5 minutes of email arrival
- Google Drive documents indexed and semantically searchable
- Alert delivered when capital call action required
- K-1s auto-classified on Drive sync

---

## 18. Phase 4 — Advisor Portal + Multi-Tenant Signup

> **Goal:** Multi-tenant signup flow, advisor portal, report generation, external sharing.
> **Timeline:** v0.3+

### 18.1 Multi-Tenant Signup

- [ ] Public signup flow (family creates own Vault account)
- [ ] Plan tier selection: personal | family_trust | advisor
- [ ] Stripe billing integration per plan tier
- [ ] Domain-verified Google OAuth (families use their own Google accounts)
- [ ] Admin dashboard (FamilyVault ops): view all families, plan tiers, usage

### 18.2 Advisor Portal

- [ ] Advisor account type: manages multiple family clients
- [ ] Client list view: each client = separate family_id
- [ ] Advisor can be granted read access to specific client families
- [ ] Cross-family aggregation view (advisor's book of business net worth)
- [ ] Client report generation + delivery

### 18.3 Report Generation + Sharing

- [ ] PDF report generation (WeasyPrint or Playwright)
- [ ] Share link creation with scope + expiry
- [ ] Guest portal (read-only scoped view via share token)
- [ ] Delivery audit trail

### 18.4 Heir / Trustee Access Views

- [ ] Successor trustee tailored dashboard
- [ ] Heir curated view (NW summary, no entity detail)
- [ ] Invite flow for non-owner roles

---

## 19. Infrastructure & Deployment

### AWS Service Inventory

| Service | Purpose | Notes |
|---------|---------|-------|
| ECS Fargate | Next.js, FastAPI, Hermes Agent | Separate task defs |
| RDS PostgreSQL | Primary database | Multi-AZ, encrypted, pgvector |
| S3 | Documents, OCR output, email bodies | Versioning + SSE-KMS |
| ECR | Container registry | Image scanning on push |
| ALB | Load balancer + SSL termination | |
| CloudFront | CDN for static assets | |
| Secrets Manager | All secrets + credentials | |
| SES | Alert emails + report delivery | |
| CloudWatch | Logs, metrics, alarms | 90-day retention |
| SNS | Gmail Pub/Sub relay | |
| Textract | OCR (async) | Phase 3 |
| VPC + NAT Gateway | Network isolation + controlled egress | |
| WAF | Rate limiting, geo-restrict, bot protection | |
| KMS | Encryption key management | |

### Monorepo Structure

```
familyvault/
├── frontend/              # Next.js 14
│   ├── app/               # App router pages
│   ├── components/        # UI components (ShadCN base)
│   ├── lib/               # API client, hooks
│   └── public/
├── backend/               # FastAPI
│   ├── api/               # Route handlers
│   ├── models/            # SQLAlchemy models
│   ├── schemas/           # Pydantic schemas
│   ├── services/          # Business logic
│   ├── middleware/        # Auth, tenant context, audit
│   ├── migrations/        # Alembic
│   └── tests/
├── agent/                 # Hermes Agent
│   ├── skills/
│   │   ├── gmail_watcher/
│   │   ├── drive_indexer/
│   │   └── plaid_sync_monitor/
│   └── main.py
├── infra/                 # Terraform
│   ├── modules/
│   │   ├── vpc/
│   │   ├── rds/
│   │   ├── ecs-service/
│   │   ├── s3-bucket/
│   │   ├── alb/
│   │   └── secrets/
│   ├── environments/
│   │   ├── dev/
│   │   └── prod/
│   └── main.tf
├── docker-compose.yml     # Local dev
└── .github/
    └── workflows/
        └── ci.yml
```

### ECS Task Definitions

```
Service: familyvault-frontend
  Image: ECR/familyvault-frontend:latest
  CPU: 512  Memory: 1024
  Port: 3000
  Health check: GET / → 200

Service: familyvault-backend
  Image: ECR/familyvault-backend:latest
  CPU: 1024  Memory: 2048
  Port: 8000
  Health check: GET /health → 200
  Env (from Secrets Manager):
    DATABASE_URL, GOOGLE_OAUTH_*, PLAID_*, OPENAI_API_KEY,
    APP_ENCRYPTION_MASTER_KEY, INTERNAL_HMAC_SECRET

Service: familyvault-agent (Hermes)
  Image: ECR/familyvault-agent:latest
  CPU: 512  Memory: 1024
  No port (outbound only)
  Env (from Secrets Manager):
    VAULT_API_URL, INTERNAL_HMAC_SECRET, GMAIL_CREDENTIALS,
    GOOGLE_DRIVE_CREDENTIALS, PLAID_*
```

### CI/CD Pipeline

```
On push to main:
  1. Lint + typecheck (Next.js + FastAPI)
  2. Unit tests (pytest + jest)
  3. Integration tests (Testcontainers for DB)
  4. Docker build + push to ECR (all 3 services)
  5. Terraform plan (dev)
  6. Deploy to dev (ECS rolling update)
  7. Smoke tests vs dev
  8. ── Manual approval gate ──
  9. Terraform plan (prod)
  10. Deploy to prod (blue/green ECS)
  11. Post-deploy health checks
```

### Background Worker Schedule

| Job | Trigger | Schedule |
|-----|---------|----------|
| Plaid balance sync | Hermes cron | Nightly 2 AM PT |
| Net worth snapshot | FastAPI cron | Nightly 3 AM PT |
| Valuation staleness check | FastAPI cron | Weekly Monday 6 AM |
| Drive change poll (fallback) | Hermes cron | Every 15 min |
| Gmail subscription renewal | Hermes cron | Every 6 days |
| Pending migration expiry | FastAPI cron | Daily |
| Document embedding retry | Hermes cron | Every 30 min |

### Environment Strategy

| Environment | Purpose | Scale |
|-------------|---------|-------|
| `local` | Development (Docker Compose) | Single machine, Postgres in container |
| `dev` | AWS integration testing | Minimal Fargate, shared RDS |
| `prod` | Production | Multi-AZ RDS, reserved Fargate capacity |

---

## 20. Operational Considerations

### Data Volume Estimates

| Data Type | Initial | Annual Growth |
|-----------|---------|---------------|
| Entities | ~20 | ~2/year |
| Assets | ~30 | ~5/year |
| Accounts | ~15 | ~2/year |
| Account balance history | ~15 × 365 | ~5,500/year |
| Net worth snapshots | 52 (weekly) | ~52/year |
| Documents | ~200 initial | ~50/year |
| Document chunks | ~20,000 initial | ~5,000/year |
| Email events (Phase 3) | — | ~300/year |
| Notifications | — | ~500/year |
| Audit log entries | — | ~15,000/year |
| Pending migrations | — | ~20/year |

RDS sizing: `db.t4g.medium` (dev), `db.t4g.large` (prod) — adequate for 5+ years at this scale.

### Cost Estimates (Monthly, Prod)

| Service | Est. Monthly |
|---------|-------------|
| RDS t4g.large (Multi-AZ) | ~$120 |
| ECS Fargate (3 services) | ~$80 |
| S3 (storage + requests) | ~$10 |
| ALB + CloudFront | ~$25 |
| Textract (OCR, Phase 3) | ~$5 |
| OpenAI API (embeddings only) | ~$5–20 |
| Plaid (dev tier → production) | ~$0–200 (check pricing) |
| Secrets Manager | ~$5 |
| CloudWatch + misc | ~$20 |
| **Total estimate** | **~$270–490/month** |

Note: ChatGPT Custom GPT queries use the user's own OpenAI subscription — no API cost to Vault.

### Monitoring & Alerting

- **Health endpoint:** `GET /health` polled by ALB target group health check
- **Worker failures:** CloudWatch alarm on ECS task exit code ≠ 0
- **Plaid item degraded:** Detected in sync, notification + SES email to owner
- **Database:** RDS CloudWatch metrics (CPU, connections, storage)
- **Application errors:** CloudWatch Logs + Insights queries on ERROR/CRITICAL
- **Audit anomaly:** > 100 audit_log entries in 10 minutes for single user → alert

### Backup & Recovery

| Scenario | Recovery | RTO |
|----------|----------|-----|
| RDS instance failure | Multi-AZ auto-failover | < 60 seconds |
| ECS task crash | ECS service auto-restart | < 2 minutes |
| Data corruption | RDS point-in-time recovery | < 4 hours |
| Region failure | Restore snapshot to new region | < 8 hours |
| Secrets compromised | Rotate in Secrets Manager → ECS redeploy | < 30 minutes |
| S3 accidental delete | S3 versioning rollback | < 15 minutes |

RPO: 24 hours (RDS daily automated backup). Target RPO upgrade to 1 hour via RDS transaction log shipping in prod.

### Key Open Questions (Resolve Before Phase 1 Build)

1. **Gmail access method for Phase 3:** Individual user OAuth (simpler, re-auth periodically) vs. service account with domain delegation (requires Google Workspace). Recommend user OAuth for personal Gmail accounts.

2. **Plaid institution tier:** Fidelity and Schwab require Plaid's higher tiers. Confirm before linking brokerage/retirement accounts. Development tier is free; production pricing depends on institution count.

3. **OpenAI embeddings data privacy:** Document text is sent to OpenAI's embeddings API. Confirm acceptable under personal use. No training on API data per OpenAI policy, but confirm if needed.

4. **ATTOM vs. Zillow vs. RentCast (Phase 2+):** Evaluate for coverage of specific property locations. ATTOM has broadest AVM API. Defer decision until Phase 2.

5. **Google Drive folder structure:** Which folder(s) does drive_indexer watch? Define upfront to avoid indexing unrelated files. Recommend a dedicated `/FamilyVault` or `/FinanceDocs` folder.

6. **Hermes deployment:** Run Hermes as a separate ECS Fargate task or co-located with FastAPI worker process? Recommend separate task for fault isolation.

---

*Document maintained by: FamilyVault system architects*
*Review cycle: Quarterly or on major architectural change*
*Version: 2.0 — Updated 2026-05-10*
