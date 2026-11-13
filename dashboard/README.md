# Honeypot security console

React, TypeScript, and Tailwind CSS on the team's existing Cloudflare Vite app.
It requests `/_aegis/stats` immediately and every 3 seconds. Requests time out
after 8 seconds, never overlap, and are aborted on cleanup.

## Run

Use Node 22.12 or later:

```bash
npm ci
npm run dev
```

Without a connected security Worker, the app shows a connection error and no fake
live metrics. **View demo** displays fictional sample events and pauses polling;
**Use live API** reconnects. This dashboard reports attacks. The team's separate
security Worker performs detection, origin proxying, decoy generation, and logging.

## Connect live stats

Add a service binding in `wrangler.jsonc`, replacing the service name with the
team's deployed security Worker name (not the dashboard's own name):

```jsonc
"services": [{ "binding": "HONEYPOT", "service": "your-honeypot-worker" }]
```

The included same-origin proxy calls that service's `/_aegis/stats` endpoint
without browser cookies or query parameters. It returns 503 when unconfigured
and 502 when unreachable; all responses disable caching. The route patterns in
`assets.run_worker_first` keep stats requests out of the SPA fallback. For local
service binding development, run both Workers using matching service names.

Alternatively copy `.env.example` to `.env.local`, set
`VITE_STATS_URL=https://your-honeypot.workers.dev/_aegis/stats`, and restart Vite.
The external Worker must allow the dashboard origin through CORS. `VITE_*`
values are public build-time configuration; never put credentials there.
Protect live security telemetry with the team's access control, such as
Cloudflare Access. This change does not implement an authentication system.

References: Cloudflare [asset routing](https://developers.cloudflare.com/workers/static-assets/binding/)
and [HTTP service bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/http/).

## API contract

The endpoint can return a raw array:

```json
[{ "id": 1, "timestamp": "2026-11-12T19:31:04Z", "ip": "192.0.2.42", "country": "DE", "method": "GET", "path": "/admin/config", "reason": "Probed restricted path", "decoy_served": "{\"records\": []}" }]
```

For the all-time counter use `{ "intercepted": [...], "total": 12482 }`.
`total` (or `count`) must be a nonnegative integer at least as large as the feed.
The security Worker can obtain this with `SELECT COUNT(*) FROM attack_logs`.
Without a total the dashboard displays the loaded-feed count, clearly labeled
as a recent-feed count, rather than inventing an all-time value.

All fields above are required, and IDs must be unique. Timestamps accept ISO
values and D1's UTC `YYYY-MM-DD HH:MM:SS`. Events are sorted newest first.
Malformed responses show an error and retain the last valid data. Chart,
country, and decoy metrics describe only the loaded events. Reasons and payloads
render as escaped text. Select **View payload** to inspect a decoy; Escape closes
the dialog and restores keyboard focus.

## Verify

```bash
npm run build   # TypeScript check and production client/Worker bundles
npm run lint
npm test        # Seven Node tests for the stats proxy
```

For headless browser regression tests, install Python test dependencies:

```bash
python -m pip install -r tests/requirements.txt
python -m playwright install chromium
```

In one terminal run `npm run dev -- --host 127.0.0.1 --port 5177 --strictPort`.
In another terminal run `npm run test:e2e`. Set `DASHBOARD_TEST_URL` to use another
port. Tests cover the actual unconfigured Worker route, API formats, exact polling,
outages/recovery, invalid responses, demo cleanup, mobile layout, keyboard
interaction, and text injection. Screenshots go in the ignored root `test-results/`.

## Cloudflare

The existing `npm run deploy` command is preserved. Use `dashboard` as the project
root in the existing Cloudflare project; the plugin builds frontend assets and
the dashboard Worker. Connect the security Worker before expecting live data.
This change does not create or deploy Cloudflare projects, D1, KV, or Workers AI.
