# Honeypot

The React + TypeScript dashboard lives in [`dashboard/`](dashboard/).
It reports attack telemetry from the team's Cloudflare security Worker.

```bash
cd dashboard
npm ci
npm run dev
```

Select **View demo** for fictional sample events. Connect live stats using
[the dashboard setup instructions](dashboard/README.md).
Detection, origin proxying, decoy generation, and logging run in the separate
security Worker; this app displays its results.
