import { Chara } from "./Chara";
import { Effect, EffectReaction } from "../../TriggerSystem/TriggerSystem";
import { hideTooltip, renderTooltip } from "../../UI/Tooltip";

// Helper function to generate single-line effect descriptions (no internal line breaks)
// Pattern example: Haste 1s -> Top ally
const buildEffectBlock = (effect: Effect, unitPower: number): string => {
	// Common helpers
	const withTargets = (base: string, targets?: any) => {
		if (!targets) return base; // effects without explicit targets
		return `${base} → [color=#e0e0e0]${getTargetDescription(targets)}[/color]`;
	};

	switch (effect.id) {
		case "damage":
			return `[color=#ff6b6b]Damage[/color] [color=#ffd93d]${unitPower}[/color]`;
		case "heal":
			return `[color=#51cf66]Heal[/color] [color=#ffd93d]${unitPower}[/color]`;
		case "shield":
			return `[color=#74c0fc]Shield[/color] [color=#ffd93d]${unitPower}[/color]`;
		case "poison":
			return `[color=#da77f2]Poison[/color] [color=#ffd93d]${unitPower}[/color]`;
		case "regen":
			return `[color=#8ce99a]Regen[/color] [color=#ffd93d]${unitPower}[/color]`;
		case "haste": {
			const dur = (effect.duration / 1000).toFixed(1);
			return withTargets(`[color=#91a7ff][b]Haste[/b][/color] [color=#ffa94d]${dur}s[/color]`, effect.targets);
		}
		case "slow": {
			const dur = (effect.duration / 1000).toFixed(1);
			return withTargets(`[color=#d0bfff][b]Slow[/b][/color] [color=#ffa94d]${dur}s[/color]`, effect.targets);
		}
		case "charge":
			return withTargets(`[color=#ffe066]Charge[/color] [color=#ffd93d]${effect.amount}[/color]`, effect.targets);
		case "increase_power":
			return withTargets(`[color=#ff8cc8]Increase Power[/color] [color=#ffd93d]${effect.amount}[/color]`, effect.targets);
		case "multiply_power":
			return withTargets(`[color=#ff8cc8]Multiply Power[/color] [color=#ffd93d]${effect.multiplier}x[/color]`, effect.targets);
		case "grant_gold":
			return `[color=#ffe066]Grant Gold[/color] [color=#ffd93d]${effect.amount}[/color]`;
		default: {
			const _exhaustiveCheck: never = effect;
			return _exhaustiveCheck;
		}
	}
};

// Helper function to generate single-line reaction description.
// Pattern examples:
// ⚡ Heal (bottom ally) -> Slow 2s -> Top ally
// ⚡ Heal -> Slow 2s -> Top ally (when no specific source position needed)
const getReactionDescription = (reaction: EffectReaction, unitPower: number): string => {
	const triggerOn = reaction.effectId.charAt(0).toUpperCase() + reaction.effectId.slice(1);
	// reaction.position may be undefined in malformed data – guard against it
	const posDesc = reaction.position ? getPositionDescription(reaction.position) : undefined;
	const showPos = !!reaction.position && !["all", "allies", "enemies"].includes(reaction.position); // only show specific relative positions

	// Build effect chain (each effect's own targets already appended inside buildEffectBlock)
	// For reactions we want: trigger segment -> effect label/time(s) -> (if last effect has targets and they weren't shown yet, ensure they appear)
	const effectSegments = reaction.effects.map(e => buildEffectBlock(e, unitPower));

	// Compose trigger prefix with lightning emoji (keeping original colors for text portions)
	const triggerPrefix = `⚡ [color=#51cf66]${triggerOn}[/color]${showPos && posDesc ? ` ([color=#c0c0c0]${posDesc.toLowerCase()}[/color])` : ''}`; // using heal green as main highlight for trigger label

	// Now join with arrows
	return [triggerPrefix, ...effectSegments].join(' → ');
};

// Helper function to describe position conditions
const getPositionDescription = (position: string): string => {
	switch (position) {
		case "all":
			return "Anyone";
		case "allies":
			return "Allies";
		case "enemies":
			return "Enemies";
		case "row_allies":
			return "Row allies";
		case "column_allies":
			return "Column allies";
		case "top_ally":
			return "Top ally";
		case "bottom_ally":
			return "Bottom ally";
		case "left_ally":
			return "Left ally";
		case "right_ally":
			return "Right ally";
		default:
			return position;
	}
};

// Helper function to describe targeting
const getTargetDescription = (targets: any): string => {
	if (!targets) return "Targets";

	switch (targets.id) {
		case "self":
			return "Self";
		case "random_ally":
			return targets.count === 1 ? "Random ally" : `${targets.count} random allies`;
		case "random_enemy":
			return targets.count === 1 ? "Random enemy" : `${targets.count} random enemies`;
		case "row_allies":
			return "Row allies";
		case "column_allies":
			return "Column allies";
		case "all_allies":
			return "All allies";
		case "all_enemies":
			return "All enemies";
		case "top_ally":
			return "Top ally";
		case "bottom_ally":
			return "Bottom ally";
		case "left_ally":
			return "Left ally";
		case "right_ally":
			return "Right ally";
		case "triggering_unit":
			return "Triggering unit";
		default:
			return "Targets";
	}
};

export const onCharaPointerOver = ({ chara }: { chara: Chara }): void => {

	if (!chara.active || !chara.visible) return

	const title = chara.unit.name; // Or cardDef.name

	// Build single-line effect & reaction blocks (no internal line breaks)
	const effectBlocks = chara.unit.effects.map(e => buildEffectBlock(e, chara.unit.power));
	const reactionBlocks = chara.unit.reactions.map(r => getReactionDescription(r, chara.unit.power));
	const descriptionString = [...effectBlocks, ...reactionBlocks].join('\n') || 'No special abilities';

	// 1100 -> 1.1s
	const cdAsSeconds = (chara.unit.cooldown / 1000).toFixed(1);

	// Header stats block
	const statsBlock = `[color=#c0c0c0]Power:[/color] [color=#ffd93d]${chara.unit.power}[/color]\n[color=#c0c0c0]Cooldown:[/color] [color=#ffa94d]${cdAsSeconds}s[/color]`;
	const description = `${statsBlock}\n\n${descriptionString}`;

	// Calculate absolute position of the Chara
	// Chara's x,y is its center relative to its parent (scene or a container like flyout).
	// We need its world coordinates.
	const worldMatrix = chara.getWorldTransformMatrix();
	const charaWorldX = worldMatrix.tx;
	const charaWorldY = worldMatrix.ty;

	// Position tooltip to the right of the Chara.
	const TOOLTIP_OFFSET_X = 400;
	const tooltipX = charaWorldX + chara.displayWidth + TOOLTIP_OFFSET_X;
	// Anchor tooltip to the top of the character (not its vertical center) so background sits higher.
	// Add a small extra offset so the tooltip doesn't overlap the unit.
	const CHAR_TOP = charaWorldY - chara.displayHeight / 2;
	const EXTRA_OFFSET = -20; // raise tooltip a bit further
	const tooltipY = CHAR_TOP + EXTRA_OFFSET;

	renderTooltip(tooltipX, tooltipY, title, description);
}

export const onCharaPointerOut = (): void => {
	hideTooltip();
}