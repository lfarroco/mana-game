import { Chara, getUnit } from "./Chara";
import { buildEffectBlock, getReactionDescription } from "./CharaTooltip";

export function createDescription(chara: Chara) {
	const unit = getUnit(chara);
	const title = unit.name;

	const effectBlocks = unit.effects.map(e => buildEffectBlock(e, unit.power));
	const reactionBlocks = unit.reactions.map(r => getReactionDescription(r, unit.power));


	const powerBlock = [`[color=#c0c0c0]Power:[/color] [color=#ffd93d]${unit.power}[/color]`]
	const cdAsSeconds = (unit.cooldown / 1000).toFixed(1);
	const cdBlock = [`[color=#c0c0c0]Cooldown:[/color] [color=#ffa94d]${cdAsSeconds}s[/color]`]

	const critBlock = (unit.critical || 0) > 0 ? [`[color=#c0c0c0]Crit:[/color] [color=#ffa94d]${unit.critical}%[/color]`] : [];

	const statsBlock = [
		...powerBlock,
		...cdBlock,
		...critBlock
	].join(' | ')

	const descriptionString = [...effectBlocks, ...reactionBlocks].join('\n') || 'No special abilities';
	const description = [statsBlock, descriptionString].join('\n')

	return { title, description };
}
