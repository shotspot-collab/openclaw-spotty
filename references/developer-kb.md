# Developer Knowledge Base: Common Issues & Fixes

## Database Migration Issues

### Issue: "Column already exists" During Migration

**Symptoms:**
```
DrizzleQueryError: column "attempt_count" of relation "notification_outbox" already exists
```

**Root Causes:**
1. Duplicate column additions across multiple migration files
2. Migration drift between schema.ts and SQL files
3. Manual database changes not reflected in migrations

**Resolution Steps:**
1. Check all migration files for duplicate ALTER TABLE statements:
   ```bash
   grep -r "ADD COLUMN" packages/db/drizzle/
   ```

2. Consolidate duplicates into the earliest appropriate migration

3. Update schema.ts to match the consolidated state

4. Reset journal if needed:
   ```sql
   -- Check current state
   SELECT * FROM drizzle.__drizzle_migrations;
   
   -- Reset if needed (nuclear option for local dev)
   DROP DATABASE shotspot;
   CREATE DATABASE shotspot;
   ```

**Prevention:**
- Run `pnpm db:migrate:check` before committing migrations
- Never manually edit migration files after they've been applied
- Use `pnpm db:migrate:generate` for all schema changes

---

## Environment Setup

### Issue: DATABASE_URL Not Found

**Symptoms:**
```
Error: Please provide required params for Postgres driver: [x] url: ''
```

**Fix:**
Ensure `.env.local` at repo root contains:
```bash
DATABASE_URL=postgresql://shotspot:shotspot@localhost:5432/shotspot
```

And package.json scripts use dotenv-cli:
```json
"db:migrate:apply": "dotenv-cli -e .env.local -- drizzle-kit migrate"
```

---

## Dev Server Startup

### Current Working Configuration

**Prerequisites:**
- Docker running with Postgres container
- `.env.local` with DATABASE_URL
- dotenv-cli installed (`pnpm add -D -w dotenv-cli`)

**Start commands:**
```bash
# All services (will fail on worker due to syntax error)
pnpm dev

# Just API + Web (recommended for testing)
npx turbo run dev --filter=@shotspot/api --filter=@shotspot/web
```

**Known Issues:**
- Worker has syntax error in `retention.mjs` (escaped backticks)
- Fix pending: change `\`` to `` ` `` for template literals

---

## Migration Best Practices

1. **Generate, don't write:** Always use `pnpm db:migrate:generate`
2. **Check before commit:** Run `pnpm db:migrate:check`
3. **Test on fresh DB:** Reset and re-run migrations before PR
4. **One change per migration:** Don't bundle unrelated schema changes
5. **Never modify applied migrations:** Create new migrations for fixes

---

*Last updated: 2026-03-25*
