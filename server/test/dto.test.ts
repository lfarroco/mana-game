/**
 * Unit tests for request DTO parsing/validation.
 */
/// <reference types="jest" />

import {
  parsePlayerId,
  parseCreateSessionBody,
  parseActionDispatchBody,
} from "../src/dto";
import { ApiError } from "../src/errors";

describe("parsePlayerId", () => {
  it("returns a trimmed non-empty string", () => {
    expect(parsePlayerId(" player-1 ")).toBe("player-1");
  });

  it("rejects missing or invalid values", () => {
    for (const bad of [undefined, null, "", "  ", 42, {}]) {
      expect(() => parsePlayerId(bad)).toThrow(ApiError);
    }
  });
});

describe("parseCreateSessionBody", () => {
  it("rejects a missing or empty body", () => {
    expect(() => parseCreateSessionBody({})).toThrow(ApiError);
    expect(() => parseCreateSessionBody(undefined)).toThrow(ApiError);
  });

  it("accepts a known crystal id", () => {
    expect(parseCreateSessionBody({ crystalId: "critical_crystal" })).toEqual({
      crystalId: "critical_crystal",
    });
  });

  it("rejects unknown crystals", () => {
    expect(() => parseCreateSessionBody({ crystalId: "nope" })).toThrow(
      ApiError,
    );
  });

  it("parses queueType alongside crystalId", () => {
    expect(
      parseCreateSessionBody({
        crystalId: "mana_crystal",
        queueType: "ranked",
      }),
    ).toEqual({ crystalId: "mana_crystal", queueType: "ranked" });
  });

  it("rejects an invalid queueType", () => {
    expect(() =>
      parseCreateSessionBody({ crystalId: "mana_crystal", queueType: "uber" }),
    ).toThrow(ApiError);
  });
});

describe("parseActionDispatchBody", () => {
  it("rejects a missing action", () => {
    expect(() => parseActionDispatchBody({})).toThrow(ApiError);
    expect(() => parseActionDispatchBody(undefined)).toThrow(ApiError);
  });

  it("rejects unknown action types", () => {
    expect(() => parseActionDispatchBody({ action: { type: "nope" } })).toThrow(
      ApiError,
    );
  });

  it("parses simple actions", () => {
    expect(
      parseActionDispatchBody({ action: { type: "skip" } }).action,
    ).toEqual({ type: "skip" });
    expect(
      parseActionDispatchBody({ action: { type: "start_combat" } }).action,
    ).toEqual({ type: "start_combat" });
  });

  it("passes through clientActionId", () => {
    const parsed = parseActionDispatchBody({
      action: { type: "skip" },
      clientActionId: "abc-123",
    });
    expect(parsed.clientActionId).toBe("abc-123");
  });

  it("requires fields on parameterized actions", () => {
    expect(() =>
      parseActionDispatchBody({ action: { type: "recruit_unit" } }),
    ).toThrow(ApiError);
    expect(() =>
      parseActionDispatchBody({ action: { type: "select_encounter" } }),
    ).toThrow(ApiError);
    expect(() =>
      parseActionDispatchBody({ action: { type: "update_team" } }),
    ).toThrow(ApiError);
    expect(() =>
      parseActionDispatchBody({ action: { type: "apply_orb" } }),
    ).toThrow(ApiError);
  });

  it("accepts well-formed parameterized actions", () => {
    expect(
      parseActionDispatchBody({
        action: { type: "recruit_unit", unitId: "u1", targetSlot: [0, 0] },
      }).action,
    ).toEqual({ type: "recruit_unit", unitId: "u1", targetSlot: [0, 0] });

    expect(
      parseActionDispatchBody({
        action: { type: "recruit_unit", unitId: "u1", targetSlot: null },
      }).action,
    ).toEqual({ type: "recruit_unit", unitId: "u1", targetSlot: null });

    expect(
      parseActionDispatchBody({
        action: { type: "update_team", team: { units: [] } },
      }).action,
    ).toEqual({ type: "update_team", team: { units: [] } });
  });
});
