/// <reference types="jest" />

import * as Constants from "./Constants";

describe("Constants", () => {
  it("TIMEOUT_DAMAGE_START_TIME is a positive number", () => {
    expect(Constants.TIMEOUT_DAMAGE_START_TIME).toBeGreaterThan(0);
    expect(Constants.TIMEOUT_DAMAGE_START_TIME).toBe(30000);
  });

  it("MAX_PARTY_SIZE is 9", () => {
    expect(Constants.MAX_PARTY_SIZE).toBe(9);
  });

  it("FORCE_ID_PLAYER is 'PLAYER'", () => {
    expect(Constants.FORCE_ID_PLAYER).toBe("PLAYER");
  });

  it("FORCE_ID_CPU is 'CPU'", () => {
    expect(Constants.FORCE_ID_CPU).toBe("CPU");
  });

  it("MIN_REFRESH_MS is a positive number", () => {
    expect(Constants.MIN_REFRESH_MS).toBeGreaterThan(0);
    expect(Constants.MIN_REFRESH_MS).toBe(200);
  });

  it("LOSSES_TO_GAME_OVER is 4", () => {
    expect(Constants.LOSSES_TO_GAME_OVER).toBe(4);
  });

  it("STARTING_LIVES is 4", () => {
    expect(Constants.STARTING_LIVES).toBe(4);
  });
});
