/// <reference types="jest" />

import { defaultSettings } from "./playerSettings";

describe("PlayerSettings", () => {
  it("returns the documented defaults", () => {
    expect(defaultSettings()).toEqual({
      sound: true,
      soundVolume: 0.6,
      music: true,
      musicVolume: 0.4,
      masterVolume: 1,
      debug: false,
      speed: 4,
      particles: "medium",
      compactTooltips: false,
    });
  });
});
