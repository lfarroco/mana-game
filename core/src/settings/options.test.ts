/// <reference types="jest" />

import { mergeSettings, parseStoredOptions } from "./options";
import { defaultSettings } from "./playerSettings";

describe("parseStoredOptions", () => {
  it("returns null for null or empty input", () => {
    expect(parseStoredOptions(null)).toBeNull();
    expect(parseStoredOptions("")).toBeNull();
  });

  it("returns null for unparseable JSON", () => {
    expect(parseStoredOptions("{not valid json")).toBeNull();
  });

  it("returns null for non-object payloads (arrays)", () => {
    expect(parseStoredOptions("[1, 2, 3]")).toBeNull();
    expect(parseStoredOptions("42")).toBeNull();
    expect(parseStoredOptions('"hello"')).toBeNull();
  });

  it("preserves a valid full object field-for-field", () => {
    const full = defaultSettings();
    expect(parseStoredOptions(JSON.stringify(full))).toEqual(full);
  });

  it("drops each invalid field value while valid siblings survive", () => {
    const result = parseStoredOptions(
      JSON.stringify({
        sound: "yes",
        soundVolume: 1.5,
        music: false,
        musicVolume: 0.25,
        masterVolume: 2,
        debug: true,
        speed: 0,
        particles: "ultra",
        compactTooltips: "no",
      }),
    );
    expect(result).toEqual({ music: false, musicVolume: 0.25, debug: true });
  });

  it("drops out-of-range negative values while valid siblings survive", () => {
    const result = parseStoredOptions(
      JSON.stringify({
        soundVolume: -0.1,
        masterVolume: -1,
        speed: -3,
        sound: true,
      }),
    );
    expect(result).toEqual({ sound: true });
  });

  it("returns only the valid fields of a partial object", () => {
    expect(parseStoredOptions(JSON.stringify({ speed: 2, sound: true }))).toEqual({
      speed: 2,
      sound: true,
    });
    expect(parseStoredOptions(JSON.stringify({ music: false }))).toEqual({
      music: false,
    });
    expect(parseStoredOptions(JSON.stringify({ unknownField: "x" }))).toEqual({});
  });

  it("keeps boundary values that are valid (0 and 1 volumes, speed above 0)", () => {
    const result = parseStoredOptions(
      JSON.stringify({
        soundVolume: 0,
        musicVolume: 1,
        masterVolume: 0.5,
        speed: 0.1,
      }),
    );
    expect(result).toEqual({
      soundVolume: 0,
      musicVolume: 1,
      masterVolume: 0.5,
      speed: 0.1,
    });
  });
});

describe("mergeSettings", () => {
  it("merges a patch over the base", () => {
    const base = defaultSettings();
    const merged = mergeSettings(base, { speed: 2, music: false });
    expect(merged.speed).toBe(2);
    expect(merged.music).toBe(false);
    expect(merged.sound).toBe(base.sound);
    expect(merged.particles).toBe(base.particles);
  });

  it("does not mutate either input", () => {
    const base = defaultSettings();
    const baseSnapshot = { ...base };
    const patch = { speed: 2, music: false };
    const merged = mergeSettings(base, patch);
    expect(base).toEqual(baseSnapshot);
    expect(merged).not.toBe(base);
    expect(merged).not.toBe(patch);
  });
});
