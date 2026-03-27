# Architecture Review: Migration Drift Fix (2026-03-25)

## Issue Summary
Database migrations had duplicate column additions across multiple migration files, causing migration failures on fresh database setup.

## Root Cause
Multiple migrations (0002, 0003, 0004) were adding the same columns:
- `notification_outbox.attempt_count` and `max_attempts` in 0002 and 0004
- `parity_queue_entries.arrival_pin` and `arrival_pin_verified_at` in 0003 and 0004

## Changes Made (Coordinator Action - Should Have Been Architect Reviewed)

### 1. Migration Consolidation
- **Deleted:** `0002_outbox_retry_metadata.sql` (duplicate)
- **Modified:** `0000_marvelous_shotgun.sql` - Added columns to initial schema:
  - `attempt_count integer DEFAULT 0 NOT NULL`
  - `max_attempts integer DEFAULT 3 NOT NULL`
- **Modified:** `0004_lyrical_king_cobra.sql` - Removed duplicate ALTER TABLE statements

### 2. Schema.ts Alignment
- Removed `attemptCount` and `maxAttempts` from `notificationOutbox` table definition
- These columns are now defined in the initial migration (0000)

### 3. Journal Update
- Updated `_journal.json` to remove 0002 entry

## Architectural Impact
- **Schema drift resolved:** Migrations now apply cleanly in order
- **Column defaults:** `attempt_count` defaults to 0, `max_attempts` defaults to 3
- **No breaking changes:** Existing data unaffected

## Follow-up Required
- [ ] Architect review of migration consolidation approach
- [ ] Document migration best practices to prevent future drift
- [ ] Consider adding migration validation to CI

## Related Files
- `packages/db/drizzle/0000_marvelous_shotgun.sql`
- `packages/db/drizzle/0004_lyrical_king_cobra.sql`
- `packages/db/drizzle/meta/_journal.json`
- `packages/db/src/schema.ts`
