/**
 * Unit tests for request DTO parsing/validation.
 */
/// <reference types="jest" />

import {
  MAX_DISPLAY_NAME_WIRE_LENGTH,
  MAX_GOOGLE_ID_TOKEN_LENGTH,
  MAX_ITCH_TOKEN_LENGTH,
  parseAuthGoogleBody,
  parseAuthItchBody,
  parseCreateSessionBody,
  parseActionDispatchBody,
  parseAuthSteamBody,
  parseUpdateDisplayNameBody,
} from "../src/dto";
import { ApiError } from "../src/errors";

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

describe("parseAuthSteamBody", () => {
  const valid = {
    ticket: "deadbeef",
    identity: "mana-game-v1",
    appId: 3757600,
  };

  it("parses a well-formed steam auth body", () => {
    expect(parseAuthSteamBody(valid)).toEqual(valid);
  });

  it("passes through an optional displayName", () => {
    expect(parseAuthSteamBody({ ...valid, displayName: "Momo" })).toEqual({
      ...valid,
      displayName: "Momo",
    });
  });

  it("rejects a missing or malformed ticket", () => {
    for (const bad of [
      {},
      { ...valid, ticket: undefined },
      { ...valid, ticket: 42 },
      { ...valid, ticket: "" },
      { ...valid, ticket: "not-hex!" },
    ]) {
      expect(() => parseAuthSteamBody(bad)).toThrow(
        expect.objectContaining({ status: 400, code: "invalid_steam_ticket" }),
      );
    }
  });

  it("rejects a missing or empty identity", () => {
    for (const bad of [
      { ...valid, identity: undefined },
      { ...valid, identity: "" },
      { ...valid, identity: "   " },
    ]) {
      expect(() => parseAuthSteamBody(bad)).toThrow(
        expect.objectContaining({ status: 400, code: "invalid_identity" }),
      );
    }
  });

  it("rejects a missing or non-numeric appId", () => {
    for (const bad of [
      { ...valid, appId: undefined },
      { ...valid, appId: "3757600" },
      { ...valid, appId: 0 },
      { ...valid, appId: -1 },
      { ...valid, appId: 1.5 },
    ]) {
      expect(() => parseAuthSteamBody(bad)).toThrow(
        expect.objectContaining({ status: 400, code: "invalid_steam_ticket" }),
      );
    }
  });
});

describe("parseAuthItchBody", () => {
  it("parses a well-formed itch auth body", () => {
    expect(parseAuthItchBody({ token: "abc123" })).toEqual({ token: "abc123" });
  });

  it("rejects a missing, empty, or non-string token", () => {
    for (const bad of [{}, { token: undefined }, { token: 42 }, { token: "" }, { token: "   " }]) {
      expect(() => parseAuthItchBody(bad)).toThrow(
        expect.objectContaining({ status: 400, code: "invalid_itch_token" }),
      );
    }
  });

  it("rejects an over-long token", () => {
    expect(() =>
      parseAuthItchBody({ token: "x".repeat(MAX_ITCH_TOKEN_LENGTH + 1) }),
    ).toThrow(
      expect.objectContaining({ status: 400, code: "invalid_itch_token" }),
    );
  });
});

describe("parseAuthGoogleBody", () => {
  it("parses a well-formed google auth body", () => {
    expect(parseAuthGoogleBody({ idToken: "jwt.abc.123" })).toEqual({
      idToken: "jwt.abc.123",
    });
  });

  it("rejects a missing, empty, or non-string idToken", () => {
    for (const bad of [
      {},
      { idToken: undefined },
      { idToken: 42 },
      { idToken: "" },
      { idToken: "   " },
    ]) {
      expect(() => parseAuthGoogleBody(bad)).toThrow(
        expect.objectContaining({ status: 400, code: "invalid_google_token" }),
      );
    }
  });

  it("rejects an over-long idToken", () => {
    expect(() =>
      parseAuthGoogleBody({ idToken: "x".repeat(MAX_GOOGLE_ID_TOKEN_LENGTH + 1) }),
    ).toThrow(
      expect.objectContaining({ status: 400, code: "invalid_google_token" }),
    );
  });
});

describe("parseUpdateDisplayNameBody", () => {
  it("parses a well-formed display-name body", () => {
    expect(parseUpdateDisplayNameBody({ displayName: "NovaMage" })).toEqual({
      displayName: "NovaMage",
    });
  });

  it("rejects a missing, empty, or non-string displayName", () => {
    for (const bad of [
      {},
      { displayName: undefined },
      { displayName: 42 },
      { displayName: "" },
      { displayName: "   " },
    ]) {
      expect(() => parseUpdateDisplayNameBody(bad)).toThrow(
        expect.objectContaining({ status: 400, code: "invalid_display_name" }),
      );
    }
  });

  it("rejects a pathologically long displayName at the wire boundary", () => {
    expect(() =>
      parseUpdateDisplayNameBody({
        displayName: "x".repeat(MAX_DISPLAY_NAME_WIRE_LENGTH + 1),
      }),
    ).toThrow(
      expect.objectContaining({ status: 400, code: "invalid_display_name" }),
    );
  });
});
