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

export function parsePlayerId(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ApiError(
      400,
      "invalid_player_id",
      "Missing or invalid X-Player-Id header",
    );
  }
  return value.trim();
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
