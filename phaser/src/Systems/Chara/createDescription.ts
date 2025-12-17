import { Chara, getUnit } from "./Chara";
import { getName, t } from "../../i18n/i18n";
import { buildEffectBlock, getReactionDescription } from "./CharaTooltip";

export function createDescription(chara: Chara) {
	const unit = getUnit(chara);
	const title = getName(unit);

	const effectBlocks = unit.effects
		.map((e) => buildEffectBlock(e, unit.power))
		.filter((e): e is string => e !== null)
		.map(str => "- " + str[0].toUpperCase() + str.slice(1))
		;
	const reactionBlocks = unit.reactions.map((r) => getReactionDescription(r, unit.power))
		.map(str => "- " + str);

	const cdAsSeconds = (unit.cooldown / 1000).toFixed(1);
	const cdBlock = [`[color=#c0c0c0]${t("description.cooldown")}[/color] [color=#ffa94d]${cdAsSeconds}s[/color]`];

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
