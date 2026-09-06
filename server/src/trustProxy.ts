/**
 * Reverse-proxy trust for the Express `trust proxy` setting (see app.ts).
 *
 * Production topology is the Firebase backend (docs/firebase-backend.md) —
 * the Cloudflare → Caddy chain is gone (`api.manabattle.com` retired):
 *
 *   player ──https──▶ Google frontend ──▶ function instance
 *
 * A single trusted hop, so the setting is the hop count `1`: Express skips
 * the frontend hop and `req.ip` is the client IP the frontend appended,
 * which is what the auth rate limiter keys on. A hop count (unlike `true`)
 * stays spoof-resistant — a client that prepends a fake `X-Forwarded-For`
 * entry is still keyed by the real appended IP — and it keeps
 * `express-rate-limit`'s trust-proxy validation happy.
 *
 * Local dev (`npm run dev`, supertest) connects directly with at most one
 * `X-Forwarded-For` entry, so the same setting resolves correctly there too.
 *
 * If production logs ever show `req.ip` as a Google-internal address for all
 * traffic, the frontend is appending an extra hop — bump this to 2.
 */
export const TRUST_PROXY_HOPS = 1;
