import { Chara, getUnit } from "./Chara";
import { buildEffectBlock, getReactionDescription } from "./CharaTooltip";

export function createDescription(chara: Chara) {
	const unit = getUnit(chara);
	const title = unit.name;

	const effectBlocks = unit.effects.map(e => buildEffectBlock(e, unit.power));
	const reactionBlocks = unit.reactions.map(r => getReactionDescription(r, unit.power));
	const descriptionString = [...effectBlocks, ...reactionBlocks].join('\n') || 'No special abilities';

	const cdAsSeconds = (unit.cooldown / 1000).toFixed(1);

	const statsBlock = `[color=#c0c0c0]Power:[/color] [color=#ffd93d]${unit.power}[/color] | [color=#c0c0c0]Cooldown:[/color] [color=#ffa94d]${cdAsSeconds}s[/color]`;
	const description = `${statsBlock}\n\n${descriptionString}`;

	return { title, description };
}
