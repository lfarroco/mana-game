/**
 * itch.io API client — validates a player's itch.io OAuth access token.
 *
 * itch.io uses the OAuth implicit flow (no client secret): the browser obtains
 * an access token (a long-lived API key / JWT) and the server validates it
 * against `GET https://api.itch.io/profile` with `Authorization: Bearer <token>`.
 * The profile endpoint accepts both the itch-app-injected JWT and the OAuth
 * key — one endpoint validates both (docs/itchio-auth.md).
 *
 * A valid token yields the user's numeric itch.io user id plus the
 * **server-verified** username (stronger than Steam's client-supplied
 * persona), which the auth service turns into a player.
 *
 * `fetch` is injectable so tests can mock the itch.io API; no itch.io account
 * is ever required to test the server half of auth.
 */

import { ApiError } from "../errors";
import type { Authenticator, ProviderIdentity } from "./authService";

/** Profile endpoint — validates the player's own token, not a developer key. */
export const ITCH_PROFILE_URL = "https://api.itch.io/profile";

type ItchProfileResponse = {
  user?: {
    id?: unknown;
    username?: string;
  };
};

export type ItchAuthClient = {
  /** Validate an OAuth access token; returns the itch user id + username. */
  validateToken(token: string): Promise<{ userId: string; username?: string }>;
  /** Authenticator for authService.login("itch", …). */
  authenticator: Authenticator;
};

export function createItchAuthClient(deps: {
  /** api.itch.io/profile endpoint override (tests). */
  url?: string;
  /** Injectable fetch — defaults to global fetch; mocked in tests. */
  fetch?: typeof globalThis.fetch;
}): ItchAuthClient {
  const endpointUrl = deps.url ?? ITCH_PROFILE_URL;
  const doFetch = deps.fetch ?? globalThis.fetch.bind(globalThis);

  async function validateToken(
    token: string,
  ): Promise<{ userId: string; username?: string }> {
    let res: Response;
    try {
      res = await doFetch(endpointUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new ApiError(
        502,
        "internal_error",
        `itch.io API request failed: ${message}`,
      );
    }

    if (!res.ok) {
      // Log the upstream detail server-side (never the token) so operators
      // can tell a bad token from an upstream outage; the wire message
      // includes the body snippet too.
      const detail = await itchErrorSnippet(res);
      console.error(
        "[itchAuth] api.itch.io/profile failed:",
        JSON.stringify({
          status: res.status,
          contentType: res.headers?.get?.("content-type") ?? "unknown",
          detail: detail || "(empty body)",
        }),
      );
      throw new ApiError(
        401,
        "invalid_itch_token",
        `itch.io rejected the token (HTTP ${res.status}${detail})`,
      );
    }

    let body: ItchProfileResponse;
    try {
      body = (await res.json()) as ItchProfileResponse;
    } catch {
      throw new ApiError(
        401,
        "invalid_itch_token",
        "itch.io API returned a non-JSON response",
      );
    }

    const id = body.user?.id;
    if (typeof id !== "number" || !Number.isInteger(id)) {
      throw new ApiError(
        401,
        "invalid_itch_token",
        "itch.io API did not return a valid numeric user id",
      );
    }

    return {
      userId: String(id),
      username:
        typeof body.user?.username === "string"
          ? body.user.username
          : undefined,
    };
  }

  async function authenticate(credential: unknown): Promise<ProviderIdentity> {
    const raw = isRecord(credential) ? credential : {};
    const { token } = raw;

    if (typeof token !== "string" || token.trim() === "") {
      throw new ApiError(
        401,
        "invalid_itch_token",
        "itch credential requires a non-empty token string",
      );
    }

    const { userId, username } = await validateToken(token);

    return {
      providerId: userId,
      displayName: username,
    };
  }

  return {
    validateToken,
    authenticator: { provider: "itch", authenticate },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** First 200 chars of itch.io's error body, for diagnostics (or ""). */
async function itchErrorSnippet(res: Response): Promise<string> {
  try {
    const body = (await res.text()).trim();
    return body ? `: ${body.slice(0, 200)}` : "";
  } catch {
    return "";
  }
}
