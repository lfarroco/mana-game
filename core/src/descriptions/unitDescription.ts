import type { Unit } from "../Models";
import {
  buildEffectBlock,
  getReactionDescription,
  type Translate,
} from "./descriptions";

const MS_PER_SECOND = 1000;

export function buildUnitDescription(
  unit: Unit,
  t: Translate,
  compactTooltips: boolean,
): { title: string; description: string } {
  const rankNames = [
    t("rank.bronze"),
    t("rank.silver"),
    t("rank.gold"),
    t("rank.platinum"),
  ];
  // Ranks past platinum keep the platinum name with a level (rank 5 is the
  // first level beyond platinum) instead of degrading to a bare number.
  const rankName =
    unit.rank > rankNames.length
      ? `${rankNames[rankNames.length - 1]} ${unit.rank - rankNames.length}`
      : rankNames[unit.rank - 1] || unit.rank.toString();
  const title = `${t(`card.${unit.cardId}.name`)} (${rankName})`;

  const effectBlocks = unit.effects
    .map((e) => buildEffectBlock(e, unit.power, t, compactTooltips))
    .filter((e): e is string => e !== null)
    .map((str) => "- " + str[0].toUpperCase() + str.slice(1));
  const reactionBlocks = unit.reactions
    .map((r) => getReactionDescription(r, unit.power, t, compactTooltips))
    .map((str) => "- " + str);

  const cdAsSeconds = (unit.cooldown / MS_PER_SECOND).toFixed(1);
  const cdBlock = [
    `[color=#c0c0c0]${t("description.cooldown")}[/color] [color=#ffa94d]${cdAsSeconds}s[/color]`,
  ];

  const critBlock =
    (unit.critical || 0) > 0
      ? [
          `[color=#c0c0c0]${t("description.crit")}[/color] [color=#ffa94d]${unit.critical}%[/color]`,
        ]
      : [];

  const statsBlock = [...cdBlock, ...critBlock].join(" | ");

  const descriptionString =
    [...effectBlocks, ...reactionBlocks].join("\n") ||
    t("description.noAbilities");
  const description = [statsBlock, descriptionString].join("\n");

  return { title, description };
}
