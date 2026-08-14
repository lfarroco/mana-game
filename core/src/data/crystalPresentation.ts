export type CrystalColorPresetKey =
  "nebula" | "sunset" | "forest" | "aurora" | "sea";

export function getColorPresetForCrystal(
  crystalId: string,
): CrystalColorPresetKey {
  const colorMap: Record<string, CrystalColorPresetKey> = {
    mana_crystal: "nebula",
    critical_crystal: "sunset",
    protective_crystal: "sunset",
    growth_crystal: "forest",
    purple_crystal: "aurora",
    quickstone: "sea",
  };

  return colorMap[crystalId] || "nebula";
}
