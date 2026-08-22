/// <reference types="jest" />

import { getAchievementId, getAchievementUnlocks } from "./achievements";
import { getVictoryTier } from "./victoryTier";

describe("getVictoryTier", () => {
  it("returns null below the bronze threshold", () => {
    expect(getVictoryTier(0)).toBeNull();
    expect(getVictoryTier(4)).toBeNull();
  });

  it("returns bronze for 5-7 wins", () => {
    expect(getVictoryTier(5)).toBe("bronze");
    expect(getVictoryTier(7)).toBe("bronze");
  });

  it("returns silver for 8-9 wins", () => {
    expect(getVictoryTier(8)).toBe("silver");
    expect(getVictoryTier(9)).toBe("silver");
  });

  it("returns gold for 10+ wins", () => {
    expect(getVictoryTier(10)).toBe("gold");
    expect(getVictoryTier(15)).toBe("gold");
  });
});

describe("getAchievementId", () => {
  it("builds the achievement id from crystal and tier", () => {
    expect(getAchievementId("mana_crystal", "gold")).toBe("GOLD_MANA_CRYSTAL");
    expect(getAchievementId("critical_crystal", "silver")).toBe(
      "SILVER_CRITICAL_CRYSTAL",
    );
  });
});

describe("getAchievementUnlocks", () => {
  const enabled = { enableAchievements: true };
  const disabled = { enableAchievements: false };

  it("returns [] when achievements are disabled", () => {
    expect(getAchievementUnlocks(10, "mana_crystal", disabled)).toEqual([]);
  });

  it("returns [] below the bronze threshold", () => {
    expect(getAchievementUnlocks(3, "mana_crystal", enabled)).toEqual([]);
  });

  it("unlocks bronze at 5 wins", () => {
    expect(getAchievementUnlocks(5, "mana_crystal", enabled)).toEqual([
      "BRONZE_MANA_CRYSTAL",
    ]);
  });

  it("unlocks bronze + silver at 8 wins", () => {
    expect(getAchievementUnlocks(8, "mana_crystal", enabled)).toEqual([
      "BRONZE_MANA_CRYSTAL",
      "SILVER_MANA_CRYSTAL",
    ]);
  });

  it("unlocks all tiers at 10 wins", () => {
    expect(getAchievementUnlocks(10, "quickstone", enabled)).toEqual([
      "BRONZE_QUICKSTONE",
      "SILVER_QUICKSTONE",
      "GOLD_QUICKSTONE",
    ]);
  });

  it("returns [] for a non-eligible crystal", () => {
    expect(getAchievementUnlocks(10, "unknown_crystal", enabled)).toEqual([]);
  });
});
