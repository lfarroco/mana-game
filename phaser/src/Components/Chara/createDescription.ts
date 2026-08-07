import { Chara, getUnit } from "@Components/Chara/Chara";
import { getName, t } from "@i18n/i18n";
import { buildEffectBlock, getReactionDescription } from "@Components/Chara/CharaTooltip";

const MS_PER_SECOND = 1000;

export function createDescription(chara: Chara) {
	const unit = getUnit(chara);
	const rankNames = [t("rank.bronze"), t("rank.silver"), t("rank.gold"), t("rank.platinum")];
	const rankName = rankNames[unit.rank - 1] || unit.rank.toString();
	const title = `${getName(unit.cardId)} (${rankName})`;

	const effectBlocks = unit.effects
		.map((e) => buildEffectBlock(e, unit.power))
		.filter((e): e is string => e !== null)
		.map((str) => "- " + str[0].toUpperCase() + str.slice(1));
	const reactionBlocks = unit.reactions
		.map((r) => getReactionDescription(r, unit.power))
		.map((str) => "- " + str);

	const cdAsSeconds = (unit.cooldown / MS_PER_SECOND).toFixed(1);
	const cdBlock = [
		`[color=#c0c0c0]${t("description.cooldown")}[/color] [color=#ffa94d]${cdAsSeconds}s[/color]`,
	];

	const critBlock =
		(unit.critical || 0) > 0
			? [`[color=#c0c0c0]${t("description.crit")}[/color] [color=#ffa94d]${unit.critical}%[/color]`]
			: [];

	const statsBlock = [...cdBlock, ...critBlock].join(" | ");

	const descriptionString =
		[...effectBlocks, ...reactionBlocks].join("\n") || t("description.noAbilities");
	const description = [statsBlock, descriptionString].join("\n");

	return { title, description };
}
