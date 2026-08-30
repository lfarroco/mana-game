/**
 * Google auth client — validates a Google **ID token** (OIDC, from the
 * Google sign-in redirect flow) and extracts the verified Google account id.
 *
 * The Android/web client runs Google's OAuth 2.0 implicit `id_token` flow
 * (`response_type=id_token&scope=openid profile email`) and sends the JWT
 * here. The server validates it against Google's tokeninfo endpoint
 * (`GET https://oauth2.googleapis.com/tokeninfo?id_token=…`) and requires:
 *
 *   - `aud` — the token's audience — to equal our configured OAuth client id
 *     (a token minted for someone else's client is rejected),
 *   - `iss` — the issuer — to be `accounts.google.com` (Google ID tokens),
 *   - `sub` — the Google user id — a non-empty string (our `providerId`),
 *   - `exp` — not yet expired (defense in depth; tokeninfo already rejects
 *     expired tokens with a non-2xx).
 *
 * The display name comes from the token's `name` claim — **server-verified**
 * (like itch.io's username, stronger than Steam's client-supplied persona).
 *
 * NOTE: tokeninfo is the simple, rate-limited validation path (mirrors the
 * Steam/itch fetch-based services and is fully mockable in tests). The
 * production-grade upgrade is verifying the JWT signature against Google's
 * public certs/JWKS — parked as a future hardening step; the provider
 * abstraction does not change.
 *
 * `fetch` is injectable so tests mock Google; no Google account or client
 * secret is ever needed to test the server half of auth.
 */

import { ApiError } from "../errors";
import type { Authenticator, ProviderIdentity } from "./authService";

/** Google ID-token verification endpoint (tokeninfo). */
export const GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";

/** Issuers accepted for Google ID tokens (the tokeninfo `iss` claim). */
export const GOOGLE_ISSUERS: readonly string[] = [
  "https://accounts.google.com",
  "accounts.google.com",
];

type TokenInfoResponse = {
  /** Google OAuth client id the token was minted for — MUST match ours. */
  aud?: unknown;
  iss?: unknown;
  /** Google account id — the stable provider id for the player. */
  sub?: unknown;
  /** Verified display name (Google profile name). */
  name?: unknown;
  /** Expiry as Unix seconds. */
  exp?: unknown;
};

export type GoogleAuthClient = {
  /** Validate an ID token; returns the Google account id + verified name. */
  validateIdToken(
    idToken: string,
  ): Promise<{ googleId: string; name?: string }>;
  /** Authenticator for authService.login("google", …). */
  authenticator: Authenticator;
};

export function createGoogleAuthClient(deps: {
  /**
   * Google OAuth client id (public — ships in the client; never a secret).
   * Required: the token's `aud` claim must match it exactly.
   */
  clientId: string;
  /** tokeninfo endpoint override (tests). */
  url?: string;
  /** Injectable fetch — defaults to global fetch; mocked in tests. */
  fetch?: typeof globalThis.fetch;
}): GoogleAuthClient {
  const endpointUrl = deps.url ?? GOOGLE_TOKENINFO_URL;
  const doFetch = deps.fetch ?? globalThis.fetch.bind(globalThis);

  async function validateIdToken(
    idToken: string,
  ): Promise<{ googleId: string; name?: string }> {
    let res: Response;
    try {
      res = await doFetch(
        `${endpointUrl}?id_token=${encodeURIComponent(idToken)}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new ApiError(
        502,
        "internal_error",
        `Google tokeninfo request failed: ${message}`,
      );
    }

    if (!res.ok) {
      // Log the upstream detail server-side (never the token) so operators can
      // tell a bad token from an upstream outage.
      const detail = await googleErrorSnippet(res);
      console.error(
        "[googleAuth] tokeninfo failed:",
        JSON.stringify({
          status: res.status,
          contentType: res.headers?.get?.("content-type") ?? "unknown",
          detail: detail || "(empty body)",
        }),
      );
      throw new ApiError(
        401,
        "invalid_google_token",
        `Google rejected the ID token (HTTP ${res.status}${detail})`,
      );
    }

    let body: TokenInfoResponse;
    try {
      body = (await res.json()) as TokenInfoResponse;
    } catch {
      throw new ApiError(
        401,
        "invalid_google_token",
        "Google tokeninfo returned a non-JSON response",
      );
    }

    if (body.aud !== deps.clientId) {
      throw new ApiError(
        401,
        "invalid_google_token",
        "Google ID token audience does not match this application",
      );
    }

    if (typeof body.iss !== "string" || !GOOGLE_ISSUERS.includes(body.iss)) {
      throw new ApiError(
        401,
        "invalid_google_token",
        "Google ID token has an unexpected issuer",
      );
    }

    if (typeof body.sub !== "string" || body.sub === "") {
      throw new ApiError(
        401,
        "invalid_google_token",
        "Google ID token did not return a valid subject id",
      );
    }

    if (typeof body.exp === "number" && body.exp * 1000 <= Date.now()) {
      throw new ApiError(
        401,
        "invalid_google_token",
        "Google ID token has expired",
      );
    }

    return {
      googleId: body.sub,
      name: typeof body.name === "string" ? body.name : undefined,
    };
  }

  async function authenticate(credential: unknown): Promise<ProviderIdentity> {
    const raw = isRecord(credential) ? credential : {};
    const { idToken } = raw;

    if (typeof idToken !== "string" || idToken.trim() === "") {
      throw new ApiError(
        401,
        "invalid_google_token",
        "Google credential requires a non-empty idToken string",
      );
    }

    const { googleId, name } = await validateIdToken(idToken);

    return {
      providerId: googleId,
      displayName: name,
    };
  }

  return {
    validateIdToken,
    authenticator: { provider: "google", authenticate },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** First 200 chars of Google's error body, for diagnostics (or ""). */
async function googleErrorSnippet(res: Response): Promise<string> {
  try {
    const body = (await res.text()).trim();
    return body ? `: ${body.slice(0, 200)}` : "";
  } catch {
    return "";
  }
}
