import {
  DEFAULT_PLAYER_RATING,
  applyRatingDelta,
  getMultiplayerRatingDelta,
  getMultiplayerVictoryTier,
} from "./Rating";

describe("getMultiplayerVictoryTier", () => {
  it("returns null below the bronze threshold", () => {
    expect(getMultiplayerVictoryTier(0)).toBeNull();
    expect(getMultiplayerVictoryTier(4)).toBeNull();
  });

  it("returns bronze/silver/gold at the thresholds", () => {
    expect(getMultiplayerVictoryTier(5)).toBe("bronze");
    expect(getMultiplayerVictoryTier(7)).toBe("bronze");
    expect(getMultiplayerVictoryTier(8)).toBe("silver");
    expect(getMultiplayerVictoryTier(9)).toBe("silver");
    expect(getMultiplayerVictoryTier(10)).toBe("gold");
    expect(getMultiplayerVictoryTier(25)).toBe("gold");
  });
});

describe("getMultiplayerRatingDelta", () => {
  it("awards the wins-tier bonus", () => {
    expect(getMultiplayerRatingDelta(10)).toBe(6);
    expect(getMultiplayerRatingDelta(8)).toBe(4);
    expect(getMultiplayerRatingDelta(5)).toBe(2);
    expect(getMultiplayerRatingDelta(0)).toBe(1);
  });
});

describe("applyRatingDelta", () => {
  it("adds the delta to the current rating", () => {
    expect(
      applyRatingDelta({ currentRating: DEFAULT_PLAYER_RATING, wins: 10 }),
    ).toBe(DEFAULT_PLAYER_RATING + 6);
  });
});
