/**
 * Steam Web API client — validates `GetAuthTicketForWebApi` tickets.
 *
 * Calls ISteamUserAuth/AuthenticateUserTicket/v1 on the partner endpoint with
 * the publisher Web API key (server secret — never client-side). A valid
 * ticket yields the user's 64-bit steamid64, which the auth service turns
 * into a player (docs/auth.md).
 *
 * `fetch` is injectable so tests can mock the Steam Web API; no Steam client
 * is ever required to test the server half of auth.
 */

import { ApiError } from "../errors";
import type { Authenticator, ProviderIdentity } from "./authService";

/** Partner endpoint for AuthenticateUserTicket (publisher-key domain). */
export const STEAM_AUTHENTICATE_URL =
  "https://partner.steam-api.com/ISteamUserAuth/AuthenticateUserTicket/v1/";

/**
 * Fixed identity string passed to `getAuthTicketForWebApi` on the client and
 * echoed in the auth request. Ties a ticket to this server. Keep in sync with
 * the Electron client (plan.md task 12).
 */
export const STEAM_IDENTITY = "mana-game-v1";

/** steamid64 is exactly 17 digits. */
const STEAMID_PATTERN = /^\d{17}$/;

export type SteamTicketInput = {
  /** Hex string of the binary ticket (GetAuthTicketForWebApi → Ticket.getBytes()). */
  ticket: string;
  /** Must match the client-side identity (STEAM_IDENTITY). */
  identity: string;
  /** Must be in the configured app-id allowlist (MANA_STEAM_APP_IDS). */
  appId: number;
};

export type SteamAuthClient = {
  /** Validate a web-api ticket; returns the steamid64 on success. */
  validateTicket(input: SteamTicketInput): Promise<{ steamId: string }>;
  /** Authenticator for authService.login("steam", …). */
  authenticator: Authenticator;
};

type SteamAuthResponse = {
  response?: {
    params?: {
      result?: string;
      steamid?: string;
    };
  };
};

export function createSteamAuthClient(deps: {
  /** Publisher Web API key (MANA_STEAM_WEB_API_KEY). */
  webApiKey: string;
  /** App-id allowlist (MANA_STEAM_APP_IDS). */
  appIds: number[];
  /**
   * AuthenticateUserTicket endpoint (MANA_STEAM_API_URL). Defaults to the
   * partner endpoint, which requires a **publisher** Web API key. Set to
   * `https://api.steampowered.com/ISteamUserAuth/AuthenticateUserTicket/v1/`
   * when only a standard Web API key is available (rate-limited).
   */
  url?: string;
  /** Injectable fetch — defaults to global fetch; mocked in tests. */
  fetch?: typeof globalThis.fetch;
}): SteamAuthClient {
  const { webApiKey, appIds } = deps;
  const endpointUrl = deps.url ?? STEAM_AUTHENTICATE_URL;
  const doFetch = deps.fetch ?? globalThis.fetch.bind(globalThis);

  if (!webApiKey) {
    throw new Error(
      "MANA_STEAM_WEB_API_KEY is not configured — cannot validate Steam tickets",
    );
  }

  async function validateTicket(
    input: SteamTicketInput,
  ): Promise<{ steamId: string }> {
    if (input.identity !== STEAM_IDENTITY) {
      throw new ApiError(
        401,
        "invalid_identity",
        "Identity does not match the configured Steam identity for this server",
      );
    }

    if (!appIds.includes(input.appId)) {
      throw new ApiError(
        401,
        "invalid_steam_ticket",
        `Ticket appId ${input.appId} is not in the configured allowlist`,
      );
    }

    const params = new URLSearchParams({
      key: webApiKey,
      appid: String(input.appId),
      ticket: input.ticket,
      identity: input.identity,
    });

    let res: Response;
    try {
      res = await doFetch(`${endpointUrl}?${params.toString()}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new ApiError(
        502,
        "internal_error",
        `Steam Web API request failed: ${message}`,
      );
    }

    // Steam returns non-200 (e.g. 401/403) for invalid/expired tickets and for
    // key/permission problems ("Access is denied"). Log the full upstream
    // detail server-side (never the key) so operators can tell a bad ticket
    // from a bad key; the wire message includes Steam's body snippet too.
    if (!res.ok) {
      const detail = await steamErrorSnippet(res);
      console.error(
        "[steamAuth] AuthenticateUserTicket failed:",
        JSON.stringify({
          endpoint: endpointUrl,
          status: res.status,
          contentType: res.headers?.get?.("content-type") ?? "unknown",
          detail: detail || "(empty body)",
        }),
      );
      throw new ApiError(
        401,
        "invalid_steam_ticket",
        `Steam rejected the ticket (HTTP ${res.status}${detail})`,
      );
    }

    let body: SteamAuthResponse;
    try {
      body = (await res.json()) as SteamAuthResponse;
    } catch {
      throw new ApiError(
        401,
        "invalid_steam_ticket",
        "Steam Web API returned a non-JSON response",
      );
    }

    const steamId = body.response?.params?.steamid;
    if (typeof steamId !== "string" || !STEAMID_PATTERN.test(steamId)) {
      throw new ApiError(
        401,
        "invalid_steam_ticket",
        "Steam Web API did not return a valid 17-digit steamid",
      );
    }

    return { steamId };
  }

  async function authenticate(credential: unknown): Promise<ProviderIdentity> {
    const raw = isRecord(credential) ? credential : {};
    const { ticket, identity, appId, displayName } = raw;

    if (
      typeof ticket !== "string" ||
      ticket === "" ||
      typeof identity !== "string" ||
      identity === "" ||
      typeof appId !== "number"
    ) {
      throw new ApiError(
        401,
        "invalid_steam_ticket",
        "Steam credential requires non-empty string ticket and identity, and a numeric appId",
      );
    }

    const { steamId } = await validateTicket({
      ticket,
      identity,
      appId,
    });

    return {
      providerId: steamId,
      displayName: typeof displayName === "string" ? displayName : undefined,
    };
  }

  return {
    validateTicket,
    authenticator: { provider: "steam", authenticate },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** First 200 chars of Steam's error body, for diagnostics (or ""). */
async function steamErrorSnippet(res: Response): Promise<string> {
  try {
    const body = (await res.text()).trim();
    return body ? `: ${body.slice(0, 200)}` : "";
  } catch {
    return "";
  }
}
