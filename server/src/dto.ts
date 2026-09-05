/**
 * Request DTO parsing and validation for the HTTP API.
 *
 * Pure functions: they throw ApiError with a 4xx status on invalid input.
 * Core stays the source of truth for domain validation (e.g. card ids);
 * this layer only guards the wire boundary.
 */

import { ApiError } from "./errors";
import * as Card from "@game/Entities/Card";
import type { Action } from "@game/types/action";

export type CreateSessionRequest = {
  crystalId: string;
  queueType?: "casual" | "ranked";
};

export type ActionDispatchRequest = {
  action: Action;
  clientActionId?: string;
};

export type AuthSteamRequest = {
  /** Hex string of the binary ticket from GetAuthTicketForWebApi. */
  ticket: string;
  /** Identity string passed to getAuthTicketForWebApi (must match STEAM_IDENTITY). */
  identity: string;
  /** Steam app id (must be in MANA_STEAM_APP_IDS). */
  appId: number;
  /** Steam persona from the client (unverified — docs/auth.md). */
  displayName?: string;
};

export type AuthItchRequest = {
  /** itch.io OAuth access token (implicit flow) — validated server-side. */
  token: string;
};

export type AuthGoogleRequest = {
  /** Google OIDC ID token (implicit flow) — validated server-side. */
  idToken: string;
};

export type UpdateDisplayNameRequest = {
  /** The player's chosen display name (validated server-side). */
  displayName: string;
};

/**
 * Longest accepted itch.io token. OAuth access keys are short API keys; the
 * itch-app-injected JWT variant is longer — 8KB bounds both while still
 * rejecting pathological payloads at the wire boundary.
 */
export const MAX_ITCH_TOKEN_LENGTH = 8192;

/** Steam web-api tickets are hex-encoded binary; reject anything else. */
const HEX_TICKET_PATTERN = /^[0-9a-fA-F]+$/;

const KNOWN_ACTION_TYPES = new Set([
  "skip",
  "apply_orb",
  "increase_core_max_life",
  "upgrade_core_power",
  "decrease_core_cooldown",
  "discard_unit",
  "recruit_unit",
  "update_team",
  "start_combat",
  "end_combat",
  "select_encounter",
  "victory",
]);

/**
 * Parse and shape-validate the POST /auth/steam body.
 *
 * Wire-boundary only: semantic checks (identity allowlist, app-id allowlist,
 * Steam ticket validity) happen in the steamAuth service.
 */
export function parseAuthSteamBody(body: unknown): AuthSteamRequest {
  const raw = asRecord(body);

  const ticket = raw.ticket;
  if (typeof ticket !== "string" || !HEX_TICKET_PATTERN.test(ticket)) {
    throw new ApiError(
      400,
      "invalid_steam_ticket",
      "ticket is required and must be a hex string",
    );
  }

  const identity = raw.identity;
  if (typeof identity !== "string" || identity.trim() === "") {
    throw new ApiError(
      400,
      "invalid_identity",
      "identity is required and must be a non-empty string",
    );
  }

  const appId = raw.appId;
  if (typeof appId !== "number" || !Number.isInteger(appId) || appId <= 0) {
    throw new ApiError(
      400,
      "invalid_steam_ticket",
      "appId is required and must be a positive integer",
    );
  }

  const displayName =
    typeof raw.displayName === "string" ? raw.displayName : undefined;

  return { ticket, identity, appId, displayName };
}

/**
 * Parse and shape-validate the POST /auth/itch body.
 *
 * Wire-boundary only: the token's validity is checked by the itchAuth service
 * against api.itch.io/profile.
 */
export function parseAuthItchBody(body: unknown): AuthItchRequest {
  const raw = asRecord(body);

  const token = raw.token;
  if (typeof token !== "string" || token.trim() === "") {
    throw new ApiError(
      400,
      "invalid_itch_token",
      "token is required and must be a non-empty string",
    );
  }
  if (token.length > MAX_ITCH_TOKEN_LENGTH) {
    throw new ApiError(
      400,
      "invalid_itch_token",
      `token exceeds the maximum length of ${MAX_ITCH_TOKEN_LENGTH} characters`,
    );
  }

  return { token };
}

/**
 * Longest accepted Google ID token. Google ID tokens are JWTs of a few KB;
 * 16KB bounds them with headroom while rejecting pathological payloads at
 * the wire boundary.
 */
export const MAX_GOOGLE_ID_TOKEN_LENGTH = 16384;

/**
 * Parse and shape-validate the POST /auth/google body.
 *
 * Wire-boundary only: the token's validity (audience, issuer, signature) is
 * checked by the googleAuth service against Google's tokeninfo endpoint.
 */
export function parseAuthGoogleBody(body: unknown): AuthGoogleRequest {
  const raw = asRecord(body);

  const idToken = raw.idToken;
  if (typeof idToken !== "string" || idToken.trim() === "") {
    throw new ApiError(
      400,
      "invalid_google_token",
      "idToken is required and must be a non-empty string",
    );
  }
  if (idToken.length > MAX_GOOGLE_ID_TOKEN_LENGTH) {
    throw new ApiError(
      400,
      "invalid_google_token",
      `idToken exceeds the maximum length of ${MAX_GOOGLE_ID_TOKEN_LENGTH} characters`,
    );
  }

  return { idToken };
}

/**
 * Longest accepted display name on the wire. The semantic limit is
 * `MAX_DISPLAY_NAME_LENGTH` in playerService (24 chars after trim); this
 * bounds the wire payload well above that so a pathological body is rejected
 * before it reaches the service.
 */
export const MAX_DISPLAY_NAME_WIRE_LENGTH = 100;

/**
 * Parse and shape-validate the PATCH /api/v1/players/me body.
 *
 * Wire-boundary only: the name must be a non-empty string that isn't
 * pathologically long. The semantic rules (trimmed length, control
 * characters, the 30-day cooldown) live in `playerService.updateDisplayName`.
 */
/**
 * Ranking page size: the lobby renders 20 rows per page. The cap bounds a
 * single response while still allowing larger clients to fetch more.
 */
export const DEFAULT_RANKING_PAGE_SIZE = 20;
export const MAX_RANKING_PAGE_SIZE = 50;

export type RankingQueryRequest = {
  page: number;
  pageSize: number;
};

/**
 * Parse the `GET /api/v1/players/ranking` query string. Both params are
 * optional (`page` defaults to 1, `pageSize` to 20); non-integer or
 * out-of-range values (`page < 1`, `pageSize < 1` or above the max) are
 * rejected with 400 `invalid_request`. A repeated param uses its first value.
 */
export function parseRankingQuery(query: unknown): RankingQueryRequest {
  const raw = asRecord(query);
  return {
    page: parsePositiveInt(raw.page, 1, "page", Number.MAX_SAFE_INTEGER),
    pageSize: parsePositiveInt(
      raw.pageSize,
      DEFAULT_RANKING_PAGE_SIZE,
      "pageSize",
      MAX_RANKING_PAGE_SIZE,
    ),
  };
}

/** Parse an optional positive-integer query param (absent/"" = default). */
function parsePositiveInt(
  value: unknown,
  defaultValue: number,
  name: string,
  max: number,
): number {
  if (value === undefined || value === "") return defaultValue;
  const text = Array.isArray(value) ? value[0] : value;
  const parsed =
    typeof text === "number"
      ? text
      : typeof text === "string"
        ? Number(text)
        : NaN;
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
    throw new ApiError(
      400,
      "invalid_request",
      `${name} must be an integer between 1 and ${max}`,
    );
  }
  return parsed;
}

export function parseUpdateDisplayNameBody(
  body: unknown,
): UpdateDisplayNameRequest {
  const raw = asRecord(body);

  const displayName = raw.displayName;
  if (typeof displayName !== "string" || displayName.trim() === "") {
    throw new ApiError(
      400,
      "invalid_display_name",
      "displayName is required and must be a non-empty string",
    );
  }
  if (displayName.length > MAX_DISPLAY_NAME_WIRE_LENGTH) {
    throw new ApiError(
      400,
      "invalid_display_name",
      `displayName exceeds the maximum length of ${MAX_DISPLAY_NAME_WIRE_LENGTH} characters`,
    );
  }

  return { displayName };
}

export function parseCreateSessionBody(body: unknown): CreateSessionRequest {
  const raw = asRecord(body);

  // queueType: optional, must be 'casual' or 'ranked'
  let queueType: "casual" | "ranked" | undefined;
  if (raw.queueType !== undefined) {
    if (raw.queueType !== "casual" && raw.queueType !== "ranked") {
      throw new ApiError(
        400,
        "invalid_queue_type",
        "queueType must be 'casual' or 'ranked'",
      );
    }
    queueType = raw.queueType;
  }

  // crystalId: required — every run starts with a core crystal; a session
  // without one cannot fight (empty team crashes combat simulation).
  if (typeof raw.crystalId !== "string" || raw.crystalId === "") {
    throw new ApiError(
      400,
      "invalid_crystal_id",
      "crystalId is required and must be a non-empty string",
    );
  }
  const isCore = Card.getCores().some((c) => c.id === raw.crystalId);
  if (!isCore) {
    throw new ApiError(
      400,
      "invalid_crystal_id",
      `Unknown crystal: ${raw.crystalId}`,
    );
  }

  return { crystalId: raw.crystalId, queueType };
}

export function parseActionDispatchBody(body: unknown): ActionDispatchRequest {
  const raw = asRecord(body);

  if (!isRecord(raw.action)) {
    throw new ApiError(
      400,
      "invalid_action",
      "Missing or invalid action (expected an object)",
    );
  }

  const action = raw.action;
  const type = action.type;
  if (typeof type !== "string" || !KNOWN_ACTION_TYPES.has(type)) {
    throw new ApiError(
      400,
      "invalid_action_type",
      `Unknown action type: ${String(type)}`,
    );
  }

  validateActionFields(type, action);

  const clientActionId =
    typeof raw.clientActionId === "string" ? raw.clientActionId : undefined;

  return { action: action as unknown as Action, clientActionId };
}

function validateActionFields(
  type: string,
  action: Record<string, unknown>,
): void {
  const requireString = (field: string): void => {
    const value = action[field];
    if (typeof value !== "string" || value === "") {
      throw new ApiError(
        400,
        "invalid_action",
        `${type} requires a non-empty '${field}' string`,
      );
    }
  };

  switch (type) {
    case "apply_orb":
      requireString("orbId");
      requireString("targetUnitId");
      break;
    case "discard_unit":
      requireString("unitId");
      break;
    case "recruit_unit":
      requireString("unitId");
      if (!isPositionOrNull(action.targetSlot)) {
        throw new ApiError(
          400,
          "invalid_action",
          "recruit_unit requires targetSlot as [x, y] or null",
        );
      }
      break;
    case "select_encounter":
      requireString("encounterId");
      break;
    case "update_team": {
      const team = action.team;
      if (!isRecord(team) || !Array.isArray(team.units)) {
        throw new ApiError(
          400,
          "invalid_action",
          "update_team requires a team object with a units array",
        );
      }
      break;
    }
    default:
      break;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositionOrNull(value: unknown): boolean {
  return (
    value === null ||
    (Array.isArray(value) &&
      value.length === 2 &&
      value.every((n) => typeof n === "number"))
  );
}
