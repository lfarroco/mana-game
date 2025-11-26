import { Chara } from "./Chara";
import { Effect, EffectReaction, Targeting } from "../../TriggerSystem/TriggerSystem";
import { hideTooltip, renderTooltip } from "../../Components/Tooltip";
import { createDescription } from "./createDescription";

export const buildEffectBlock = (effect: Effect, unitPower: number): string | null => {
	const withTargets = (base: string, targets?: Targeting) => {
		if (!targets) return base;
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
			return `[color=#da77f2]Poison[/color] [color=#ffd93d]${unitPower}[/color] over 10s`;
		case "regen":
			return `[color=#8ce99a]Regen[/color] [color=#ffd93d]${unitPower}[/color] over 10s`;
		case "haste": {
			const dur = (effect.duration / 1000).toFixed(1);
			return withTargets(
				`[color=#91a7ff]Haste[/color] [color=#ffa94d]${dur}s[/color]`,
				effect.targets
			);
		}
		case "slow": {
			const dur = (effect.duration / 1000).toFixed(1);
			return withTargets(
				`[color=#d0bfff]Slow[/color] [color=#ffa94d]${dur}s[/color]`,
				effect.targets
			);
		}
		case "charge":
			const dur = (effect.duration / 1000).toFixed(1);
			return withTargets(
				`[color=#ffe066]Charge[/color] [color=#ffd93d]${dur}s[/color]`,
				effect.targets
			);
		case "increase_power":
			return withTargets(
				`[color=#ff8cc8]+${effect.amount}${effect.permanent ? "*" : ""}[/color]`,
				effect.targets
			);
		case "increase_critical":
			return withTargets(
				`[color=#ff8cc8]+Crit[/color] [color=#ffd93d]${effect.amount}[/color]`,
				effect.targets
			);
		case "multiply_power":
			return withTargets(
				`[color=#ff8cc8]Multiply Power[/color] [color=#ffd93d]${effect.multiplier}x[/color]`,
				effect.targets
			);
		case "distribute_power":
		case "absorb_power":
		case "sacrifice_effect":
			return null;
		default: {
			const _exhaustiveCheck: never = effect;
			return _exhaustiveCheck;
		}
	}
};

const EFFECT_STYLES: Record<string, { label: string; color: string }> = {
	damage: { label: "Damage", color: "#ff6b6b" },
	heal: { label: "Heal", color: "#51cf66" },
	shield: { label: "Shield", color: "#74c0fc" },
	poison: { label: "Poison", color: "#da77f2" },
	regen: { label: "Regen", color: "#8ce99a" },
	haste: { label: "Haste", color: "#91a7ff" },
	slow: { label: "Slow", color: "#d0bfff" },
	charge: { label: "Charge", color: "#ffe066" },
	increase_power: { label: "Power", color: "#ff8cc8" },
	increase_critical: { label: "Critical", color: "#ff8cc8" },
	multiply_power: { label: "Multiply Power", color: "#ff8cc8" },
	all: { label: "Any", color: "#ffffff" },
};

export const getReactionDescription = (reaction: EffectReaction, unitPower: number): string => {
	const style = EFFECT_STYLES[reaction.effectId];
	const triggerLabel = style ? style.label : reaction.effectId.charAt(0).toUpperCase() + reaction.effectId.slice(1);
	const triggerColor = style ? style.color : "#51cf66";

	const posDesc = reaction.position ? getPositionDescription(reaction.position) : undefined;
	const showPos = !!reaction.position && !["all", "allies"].includes(reaction.position); // only show specific relative positions

	const effectSegments = reaction.effects
		.map((e) => buildEffectBlock(e, unitPower))
		.filter((e): e is string => e !== null);

	const triggerPrefix = `[color=${triggerColor}]${triggerLabel}[/color]${showPos && posDesc ? ` ([color=#c0c0c0]${posDesc.toLowerCase()}[/color])` : ""}`;

	if (effectSegments.length > 1) {
		return `${triggerPrefix} →\n    ${effectSegments.join("\n    ")}`;
	}

	return [triggerPrefix, ...effectSegments].join(" → ");
};

const getPositionDescription = (position: string): string => {
	switch (position) {
		case "all":
			return "Anyone";
		case "allies":
			return "Ally";
		case "enemies":
			return "Enemy";
		case "row_allies":
			return "Row";
		case "column_allies":
			return "Column";
		case "top_ally":
			return "Top";
		case "bottom_ally":
			return "Bottom";
		case "left_ally":
			return "Left";
		case "right_ally":
			return "Right";
		default:
			return position;
	}
};

const getTargetDescription = (targets: Targeting): string => {
	if (!targets) return "Targets";

	switch (targets.id) {
		case "self":
			return "Self";
		case "random_ally":
			return targets.count === 1 ? "Random ally" : `${targets.count} random allies`;
		case "random_enemy":
			return targets.count === 1 ? "Random enemy" : `${targets.count} random enemies`;
		case "row_allies":
			return "Row";
		case "column_allies":
			return "Column";
		case "all_allies":
			if (targets.ofType !== "any")
				return `All allies of type ${targets.ofType}`;
			else return "All allies";
		case "all_enemies":
			return "All enemies";
		case "top_ally":
			return "Top";
		case "bottom_ally":
			return "Bottom";
		case "left_ally":
			return "Left";
		case "right_ally":
			return "Right";
		case "trigger":
			return "Source";
		default:
			return "Targets";
	}
};

export const onCharaPointerOver = (chara: Chara): void => {
	if (!chara.active || !chara.visible) return;

	const { title, description } = createDescription(chara);

	const worldMatrix = chara.getWorldTransformMatrix();
	const charaWorldX = worldMatrix.tx;
	const charaWorldY = worldMatrix.ty;

	const screenWidth = chara.scene.sys.game.config.width as number;
	const isRightSide = charaWorldX > screenWidth / 2;

	const TOOLTIP_OFFSET_X = 400;
	let tooltipX: number;

	if (isRightSide) {
		tooltipX = charaWorldX - TOOLTIP_OFFSET_X;
	} else {
		tooltipX = charaWorldX + chara.displayWidth + TOOLTIP_OFFSET_X;
	}
	const CHAR_TOP = charaWorldY - chara.displayHeight / 2;

	const EXTRA_OFFSET = -20;
	const tooltipY = CHAR_TOP + EXTRA_OFFSET;

	renderTooltip(tooltipX, tooltipY, title, description);
};

export const onCharaPointerOut = (): void => {
	hideTooltip();
};
