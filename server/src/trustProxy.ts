/**
 * Reverse-proxy ranges the server trusts when resolving the real client IP
 * (the Express `trust proxy` setting — see app.ts).
 *
 * WHY THIS LIST EXISTS
 * --------------------
 * The production topology has TWO hops in front of the Node process:
 *
 *   player ──https──▶ Cloudflare edge ──https──▶ Caddy (127.0.0.1) ──▶ :8787
 *
 * Each hop appends the client IP it saw to the `X-Forwarded-For` chain, so by
 * the time the request reaches the Node server it looks like:
 *
 *   X-Forwarded-For: [player-ip, cf-edge-ip]     (peer = Caddy on loopback)
 *
 * Express resolves `req.ip` as the RIGHTMOST chain entry that is NOT in the
 * `trust proxy` list. If we only trusted `loopback` (Caddy), the rightmost
 * untrusted entry would be the Cloudflare edge IP — meaning every player
 * behind the same Cloudflare PoP would share ONE auth rate-limit bucket
 * (POST /auth/steam and /auth/itch are capped at MANA_AUTH_RATE_LIMIT_MAX per
 * IP), and a few dozen logins on a PoP would start returning 429 to everyone.
 *
 * So in addition to `loopback` we trust Cloudflare's published edge ranges:
 * Express then walks past the CF edge IP to the real player IP, restoring
 * per-player rate limiting.
 *
 * SECURITY — WHY THIS IS NOT A SPOOFING VECTOR
 * --------------------------------------------
 * The rightmost untrusted hop always wins. A client that fabricates
 * `X-Forwarded-For` gets Caddy's appended real socket IP as the LAST entry;
 * that IP is neither loopback nor Cloudflare, so it is used as req.ip. The
 * only way an address in this list becomes req.ip is to actually connect from
 * one — i.e. genuine Cloudflare traffic. (Direct access to :8787 must stay
 * firewalled so attackers cannot reach the server outside Caddy/Cloudflare —
 * the droplet's ufw only exposes 22/80/443.)
 *
 * WHEN CLOUDFLARE CHANGES RANGES
 * ------------------------------
 * The authoritative list lives at:
 *   https://www.cloudflare.com/ips-v4   and   https://www.cloudflare.com/ips-v6
 * Refresh this file when Cloudflare announces range changes. A stale range
 * degrades gracefully (players behind that PoP fall back to a shared bucket —
 * a rate-limit nuisance, not a security issue). Last verified: 2026-08-21.
 */
export const TRUSTED_PROXY_RANGES: readonly string[] = [
  "loopback",
  // --- Cloudflare edge IPv4 ranges (https://www.cloudflare.com/ips-v4) ---
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "172.64.0.0/13",
  "131.0.72.0/22",
  // --- Cloudflare edge IPv6 ranges (https://www.cloudflare.com/ips-v6) ---
  "2400:cb00::/32",
  "2606:4700::/32",
  "2803:f800::/32",
  "2405:b500::/32",
  "2405:8100::/32",
  "2a06:98c0::/29",
  "2c0f:f248::/32",
];
