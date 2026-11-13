# Aegis Edge

Aegis Edge is a three-stage Cloudflare deception pipeline:

1. **Fingerprint and score** requests at the edge using Cloudflare metadata, user-agent signals, canary paths, injection signatures, bot score, and a KV-backed request counter.
2. **Proxy legitimate traffic** to `ORIGIN_URL` while routing suspicious traffic to a stateful AI decoy. When `ORIGIN_URL` is not configured, a small local catalog response is returned for demos.
3. **Record attacks** in D1 and expose the last 25 events through `/_aegis/stats` for a SOC dashboard.

The root URL serves the dark-mode SOC dashboard from `public/index.html`. It polls `/_aegis/stats` every two seconds and displays threat totals, attacker locations, trigger badges, and the decoy payload.

## Setup

```powershell
npm install
npx wrangler kv namespace create THREAT_KV
npx wrangler d1 create aegis-telemetry
```

Replace the placeholder IDs in `wrangler.toml` with the IDs returned by Wrangler. Apply the schema locally or remotely:

```powershell
npx wrangler d1 migrations apply aegis-telemetry --local
npx wrangler d1 migrations apply aegis-telemetry
```

For local development, copy `.dev.vars.example` to `.dev.vars` and set `ORIGIN_URL` only when a protected origin is available:

```powershell
npm run dev
```

The default threat threshold is 50 and can be changed with `THREAT_THRESHOLD`. Set `ORIGIN_URL` as a Wrangler secret or dashboard variable in deployed environments; do not commit credentials or origin URLs containing credentials.

The decoy uses Cloudflare Workers AI model `@cf/google/gemma-4-26b-a4b-it`. The previously used `@cf/meta/llama-3.1-8b-instruct` model was deprecated and causes Workers AI error 5028.

## Demo

Run the request simulator against a local or deployed worker:

```powershell
node scripts/attack_sim.mjs http://localhost:8787
# Or use the deployment URL:
$env:BASE_URL="https://aegis-edge.example.workers.dev"; node scripts/attack_sim.mjs
curl http://localhost:8787/_aegis/stats
```

The simulator sends canary-path, SQL injection, traversal, and automated-client traffic. Suspicious requests receive a cached, endpoint-specific JSON response with HTTP 200 while the event is written asynchronously to D1.

The simulator intentionally uses safe demo paths, a normal browser user-agent, and the `X-Aegis-Demo: 1` header. It does not spoof Cloudflare-managed headers such as `CF-Connecting-IP`; Cloudflare supplies those at the edge. It sends requests sequentially so Cloudflare does not mistake a demo burst for an upstream attack. Real SQL injection, traversal, `.env`, and admin probes can be blocked by Cloudflare before they reach the Worker and therefore will not appear in D1. The simulator prints how many requests reached Aegis versus were blocked upstream.

## Validation

```powershell
npm test
npm run typecheck
```
