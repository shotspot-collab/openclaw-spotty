# Launch Methods & Setup SOP

## Purpose
Keep ShotSpot local dev launch behavior consistent and stable on this machine.

## General rules
- Use the standard `dev` scripts only for active interactive development.
- Use the single-run scripts for detached/background runs.
- Do not run the API in `tsx watch` mode when starting it detached.
- If a server is already bound to a port, stop the old listener before starting a new one.

## Recommended launch modes

### Web
- **Interactive dev:** `pnpm --dir apps/web dev`
- **Detached/background:** `pnpm --dir apps/web dev` is acceptable if the process manager keeps it alive and port conflicts are handled

### API
- **Interactive dev:** `pnpm --dir apps/api dev`
- **Detached/background/stable:** `pnpm --dir apps/api start:tsx`
- **Do not use** `dev` / `tsx watch` for detached API launches

### Worker
- Start separately only when needed
- Keep it out of the default web/api browser testing loop unless notifications/retention are being validated

## Restart checklist
1. Check which process is listening on the port.
2. Stop the old listener cleanly.
3. Start the service with the correct mode:
   - API: `start:tsx`
   - Web: standard dev command is fine for interactive work
4. Confirm the port is listening again.
5. Confirm the expected route returns the right status.

## Troubleshooting

### API on 4000 keeps dying
Likely causes:
- started with `tsx watch`/`dev` in detached mode
- port 4000 still occupied by an older process
- startup catch block exits on `EADDRINUSE`

Fix:
- kill the old process
- restart API with `pnpm --dir apps/api start:tsx`

### Photographer dashboard says session cannot be verified
Check in this order:
1. Browser is on the public app URL
2. Photographer login cookie exists
3. Requests use `/api/photographers/...`
4. API is actually running on 4000 and not in a restart loop

## Notes
- Keep the API stable first; many browser auth issues are actually caused by the API restarting or returning 404/502.
- When in doubt, verify localhost `4000` before debugging the browser.
