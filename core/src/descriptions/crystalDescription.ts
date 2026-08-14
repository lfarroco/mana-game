import type { CardDefinition } from "../Models";
import { buildEffectBlock, getReactionDescription, type Translate } from "./descriptions";

export function buildCrystalDescription(
  crystal: CardDefinition,
  t: Translate,
  compactTooltips: boolean,
): string {
  const power = crystal.power || 0;

  const effectBlocks = crystal.effects
    .map((e) => buildEffectBlock(e, power, t, compactTooltips))
    .filter((e): e is string => e !== null)
    .map((str) => "- " + str[0].toUpperCase() + str.slice(1));

  const reactionBlocks = crystal.reactions
    .map((r) => getReactionDescription(r, power, t, compactTooltips))
    .map((str) => "- " + str);

  const cdAsSeconds = ((crystal.cooldown || 0) / 1000).toFixed(1);
  const statsBlock = `[color=#c0c0c0]${t("crystalSelection.cooldown")}[/color] [color=#ffa94d]${cdAsSeconds}s[/color]`;

  const lifeBlock = crystal.life
    ? ` | [color=#c0c0c0]${t("crystalSelection.life")}[/color] [color=#51cf66]${crystal.life}[/color]`
    : "";

  const allEffects = [...effectBlocks, ...reactionBlocks].join("\n");

  return `${statsBlock}${lifeBlock}\n\n${allEffects || t("crystalSelection.noAbilities")}`;
}
