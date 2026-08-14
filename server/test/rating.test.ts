/**
 * Unit tests for the rating service — wins-based deltas ported from the
 * retired Supabase backend (`multiplayer-rating.ts`, deleted in Phase 3).
 */
/// <reference types="jest" />

import {
  applyRatingDelta,
  getMultiplayerRatingDelta,
  getMultiplayerVictoryTier,
} from "../src/services/rating";

describe("getMultiplayerVictoryTier", () => {
  it("returns null below the bronze threshold (0-4 wins)", () => {
    expect(getMultiplayerVictoryTier(0)).toBeNull();
    expect(getMultiplayerVictoryTier(4)).toBeNull();
  });

  it("returns bronze at 5-7 wins", () => {
    expect(getMultiplayerVictoryTier(5)).toBe("bronze");
    expect(getMultiplayerVictoryTier(7)).toBe("bronze");
  });

  it("returns silver at 8-9 wins", () => {
    expect(getMultiplayerVictoryTier(8)).toBe("silver");
    expect(getMultiplayerVictoryTier(9)).toBe("silver");
  });

  it("returns gold at 10+ wins", () => {
    expect(getMultiplayerVictoryTier(10)).toBe("gold");
    expect(getMultiplayerVictoryTier(15)).toBe("gold");
  });

  it("normalizes negative and non-integer wins", () => {
    expect(getMultiplayerVictoryTier(-3)).toBeNull();
    expect(getMultiplayerVictoryTier(9.9)).toBe("silver"); // floored to 9
    expect(getMultiplayerVictoryTier(10.1)).toBe("gold"); // floored to 10
  });
});

describe("getMultiplayerRatingDelta", () => {
  it("ports the gold/silver/bronze/default deltas", () => {
    expect(getMultiplayerRatingDelta(0)).toBe(1); // default
    expect(getMultiplayerRatingDelta(4)).toBe(1); // default
    expect(getMultiplayerRatingDelta(5)).toBe(2); // bronze
    expect(getMultiplayerRatingDelta(7)).toBe(2); // bronze
    expect(getMultiplayerRatingDelta(8)).toBe(4); // silver
    expect(getMultiplayerRatingDelta(9)).toBe(4); // silver
    expect(getMultiplayerRatingDelta(10)).toBe(6); // gold
    expect(getMultiplayerRatingDelta(15)).toBe(6); // gold
  });
});

describe("applyRatingDelta", () => {
  it("adds the wins-based delta to the current rating", () => {
    expect(applyRatingDelta({ currentRating: 1000, wins: 10 })).toBe(1006);
    expect(applyRatingDelta({ currentRating: 1000, wins: 8 })).toBe(1004);
    expect(applyRatingDelta({ currentRating: 1000, wins: 5 })).toBe(1002);
    expect(applyRatingDelta({ currentRating: 1000, wins: 3 })).toBe(1001);
    expect(applyRatingDelta({ currentRating: 1234, wins: 4 })).toBe(1235);
  });

  it("clamps negative current ratings to 0", () => {
    expect(applyRatingDelta({ currentRating: -50, wins: 10 })).toBe(6);
  });

  it("floors non-integer wins before tiering", () => {
    expect(applyRatingDelta({ currentRating: 1000, wins: 9.9 })).toBe(1004); // 9 → silver
  });
});
