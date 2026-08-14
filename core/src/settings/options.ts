import type { PlayerSettings } from "./playerSettings";

/**
 * Validate persisted settings JSON into a partial PlayerSettings. Invalid or
 * missing fields are dropped; null/undefined input, unparseable JSON, and
 * non-object payloads yield null.
 */
export function parseStoredOptions(raw: string | null): Partial<PlayerSettings> | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  const valid: Partial<PlayerSettings> = {};
  if (typeof record.sound === "boolean") valid.sound = record.sound;
  if (
    typeof record.soundVolume === "number" &&
    record.soundVolume >= 0 &&
    record.soundVolume <= 1
  ) {
    valid.soundVolume = record.soundVolume;
  }
  if (typeof record.music === "boolean") valid.music = record.music;
  if (
    typeof record.musicVolume === "number" &&
    record.musicVolume >= 0 &&
    record.musicVolume <= 1
  ) {
    valid.musicVolume = record.musicVolume;
  }
  if (
    typeof record.masterVolume === "number" &&
    record.masterVolume >= 0 &&
    record.masterVolume <= 1
  ) {
    valid.masterVolume = record.masterVolume;
  }
  if (typeof record.debug === "boolean") valid.debug = record.debug;
  if (typeof record.speed === "number" && record.speed > 0) valid.speed = record.speed;
  if (["low", "medium", "high"].includes(record.particles as string))
    valid.particles = record.particles as PlayerSettings["particles"];
  if (typeof record.compactTooltips === "boolean") valid.compactTooltips = record.compactTooltips;
  return valid;
}

/** Merge a settings patch over a base, returning a new object (no mutation). */
export function mergeSettings(
  base: PlayerSettings,
  patch: Partial<PlayerSettings>,
): PlayerSettings {
  return { ...base, ...patch };
}
