# ShotSpot Public Testing SOP

Use this when ShotSpot needs a public URL for local testing without deploying.

## Preferred order

1. **Tailscale Funnel** if Tailscale is already available
2. Cloudflare Tunnel
3. ngrok

## Why Tailscale-first

- fits an existing private-network workflow
- quick to stand up on a development machine
- gives a real HTTPS URL for external callbacks and remote browser testing

## Rules

- never use `localhost` for third-party callbacks
- use a real **HTTPS** public URL
- separate web and API public URLs when providers call the API directly
- do not treat the tunnel as a production deployment

## Recommended ShotSpot mapping

- web app local port: `3000`
- api local port: `4000` (adjust if repo uses a different port)
- worker remains local; it usually does not need a public URL

## Tailscale examples

### Expose the web app

```powershell
tailscale funnel 3000
```

### Expose the API

```powershell
tailscale funnel 4000
```

If both need to be public at the same time, run them in separate terminals or use named serve/funnel configuration if supported by the local Tailscale version.

## What to point at the public URL

- browser/manual QA -> web URL
- Stripe or webhook callbacks -> API URL
- shared preview with a small test group -> web URL

## Validation checklist

Before handing a public URL to QA or a provider:
- local web/api both load successfully
- API health check passes locally
- required env vars are set
- any callback route is reachable through the tunnel URL
- the URL is HTTPS

## Coordinator notes

When announcing public test instructions to the user, include:
- which role is active
- exact local services being exposed
- which public URL maps to web vs API
- any provider config fields that must use the API URL
