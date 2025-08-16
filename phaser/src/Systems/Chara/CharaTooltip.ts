import { Chara } from "./Chara";
import { Effect, EffectReaction } from "../../TriggerSystem/TriggerSystem";
import { hideTooltip, renderTooltip } from "../../UI/Tooltip";

// Helper function to generate human-readable descriptions for effects
const getEffectDescription = (effect: Effect, unitPower: number): string => {
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
		case "haste":
			return `[color=#91a7ff]Haste[/color] | Duration: [color=#ffa94d]${(effect.duration / 1000).toFixed(1)}s[/color] | Targets: [color=#e0e0e0]${getTargetDescription(effect.targets)}[/color]`;
		case "slow":
			return `[color=#d0bfff]Slow[/color] | Duration: [color=#ffa94d]${(effect.duration / 1000).toFixed(1)}s[/color] | Targets: [color=#e0e0e0]${getTargetDescription(effect.targets)}[/color]`;
		case "charge":
			return `[color=#ffe066]Charge[/color] [color=#ffd93d]${effect.amount}[/color] | Targets: [color=#e0e0e0]${getTargetDescription(effect.targets)}[/color]`;
		case "increase_power":
			return `[color=#ff8cc8]Increase Power[/color] [color=#ffd93d]${effect.amount}[/color] | Targets: [color=#e0e0e0]${getTargetDescription(effect.targets)}[/color]`;
		case "multiply_power":
			return `[color=#ff8cc8]Multiply Power[/color] [color=#ffd93d]${effect.multiplier}x[/color] | Targets: [color=#e0e0e0]${getTargetDescription(effect.targets)}[/color]`;
		case "grant_gold":
			return `[color=#ffe066]Grant Gold[/color] [color=#ffd93d]${effect.amount}[/color]`;
		default:
			// Exhaustive check - this should never be reached with proper typing
			const _exhaustiveCheck: never = effect;
			return _exhaustiveCheck;
	}
};

// Helper function to generate human-readable descriptions for reactions
const getReactionDescription = (reaction: EffectReaction, unitPower: number): string => {
	const triggerOn = reaction.effectId.charAt(0).toUpperCase() + reaction.effectId.slice(1);
	const position = getPositionDescription(reaction.position);
	const effects = reaction.effects.map(effect => getEffectDescription(effect, unitPower)).join(", ");

	return `[color=#c0c0c0]React to[/color] [color=#ffa94d]${triggerOn}[/color] | [color=#c0c0c0]From:[/color] [color=#e0e0e0]${position}[/color] | [color=#c0c0c0]Effect:[/color] ${effects}`;
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

	// Get effect descriptions
	const effectDescriptions = chara.unit.effects.map(effect => {
		return getEffectDescription(effect, chara.unit.power);
	});

	// Get reaction descriptions
	const reactionDescriptions = chara.unit.reactions.map(reaction => {
		return getReactionDescription(reaction, chara.unit.power);
	});

	// Combine all trait descriptions
	const allEffectDescriptions = [...effectDescriptions, ...reactionDescriptions];
	const descriptionString = allEffectDescriptions.length > 0
		? allEffectDescriptions.join('\n\n')
		: 'No special abilities';

	// 1100 -> 1.1s
	const cdAsSeconds = (chara.unit.cooldown / 1000).toFixed(1);

	const description = `[color=#c0c0c0]Power:[/color] [color=#ffd93d]${chara.unit.power}[/color]\n[color=#c0c0c0]Cooldown:[/color] [color=#ffa94d]${cdAsSeconds}s[/color]\n\n${descriptionString}`;

	// Calculate absolute position of the Chara
	// Chara's x,y is its center relative to its parent (scene or a container like flyout).
	// We need its world coordinates.
	const worldMatrix = chara.getWorldTransformMatrix();
	const charaWorldX = worldMatrix.tx;
	const charaWorldY = worldMatrix.ty;

	// Position tooltip to the right of the Chara.
	const TOOLTIP_OFFSET_X = 400;
	const tooltipX = charaWorldX + chara.displayWidth + TOOLTIP_OFFSET_X;
	const tooltipY = charaWorldY; // Align with chara's vertical center

	renderTooltip(tooltipX, tooltipY, title, description);
}

export const onCharaPointerOut = (): void => {
	hideTooltip();
}