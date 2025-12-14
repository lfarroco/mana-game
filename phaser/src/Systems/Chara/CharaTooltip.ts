import { Chara } from "./Chara";
import { Effect, EffectReaction, Targeting } from "../../TriggerSystem/TriggerSystem";
import { hideTooltip, renderTooltip } from "../../Components/Tooltip";
import { createDescription } from "./createDescription";
import { t } from "../../i18n/i18n";

const getTargetDescription = (targets: Targeting): string => {
	if (!targets) return t("tooltip.targets.default");

	let key = `tooltip.sentence.target.${targets.id}`;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const count = (targets as any).count;

	if (targets.id === "random_ally" && count && count > 1) key = "tooltip.sentence.target.random_allies";
	if (targets.id === "random_enemy" && count && count > 1) key = "tooltip.sentence.target.random_enemies";

	if (targets.id === "all_allies" && targets.ofType !== "any") {
		return t("tooltip.sentence.target.all_allies_type", { type: targets.ofType });
	}

	return t(key, { count: count?.toString() });
};

export const buildEffectBlock = (effect: Effect, unitPower: number): string | null => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const targets = (effect as any).targets as Targeting | undefined;
	const targetDesc = targets ? getTargetDescription(targets) : "";
	const coloredTarget = `[color=#e0e0e0]${targetDesc}[/color]`;
	const coloredPower = `[color=#ffd93d]${unitPower}[/color]`;

	switch (effect.id) {
		case "damage":
			return t("tooltip.sentence.damage", { amount: coloredPower, target: coloredTarget });
		case "heal":
			return t("tooltip.sentence.heal", { amount: coloredPower, target: coloredTarget });
		case "shield":
			return t("tooltip.sentence.shield", { amount: coloredPower, target: coloredTarget });
		case "poison":
			return t("tooltip.sentence.poison", { amount: coloredPower, target: coloredTarget });
		case "regen":
			return t("tooltip.sentence.regen", { amount: coloredPower, target: coloredTarget });
		case "haste": {
			const dur = (effect.duration / 1000).toFixed(1);
			return t("tooltip.sentence.haste", { duration: `[color=#ffa94d]${dur}[/color]`, target: coloredTarget });
		}
		case "slow": {
			const dur = (effect.duration / 1000).toFixed(1);
			return t("tooltip.sentence.slow", { duration: `[color=#ffa94d]${dur}[/color]`, target: coloredTarget });
		}
		case "charge": {
			const dur = (effect.duration / 1000).toFixed(1);
			return t("tooltip.sentence.charge", { duration: `[color=#ffd93d]${dur}[/color]`, target: coloredTarget });
		}
		case "increase_power":
			return t(effect.permanent ? "tooltip.sentence.increase_power_permanent" : "tooltip.sentence.increase_power", {
				amount: `[color=#ff8cc8]${effect.amount}[/color]`,
				target: coloredTarget,
			});
		case "decrease_power":
			return t("tooltip.sentence.decrease_power", {
				amount: `[color=#8a2be2]${effect.percentage}[/color]`,
				target: coloredTarget,
			});
		case "increase_critical":
			return t("tooltip.sentence.increase_critical", {
				amount: `[color=#ffd93d]${effect.amount}[/color]`,
				target: coloredTarget,
			});
		case "multiply_power":
			return t("tooltip.sentence.multiply_power", {
				amount: `[color=#ffd93d]${effect.multiplier}[/color]`,
				target: coloredTarget,
			});
		case "distribute_power":
		case "absorb_power":
		case "sacrifice_effect":
		case "re_hasted":
		case "re_slow":
		case "on_crit":
		case "every_100_damage":
		case "every_100_shield":
		case "every_100_heal":
		case "every_10_poison":
		case "every_10_regen":
		case "on_over_heal":
		case "on_battle_start":
			return null;
		default: {
			const _exhaustiveCheck: never = effect;
			return _exhaustiveCheck;
		}
	}
};

const EFFECT_STYLES: Record<string, { color: string }> = {
	damage: { color: "#ff6b6b" },
	heal: { color: "#51cf66" },
	shield: { color: "#74c0fc" },
	poison: { color: "#da77f2" },
	regen: { color: "#8ce99a" },
	haste: { color: "#91a7ff" },
	re_hasted: { color: "#00eaff" },
	re_slow: { color: "#d2691e" },
	every_100_damage: { color: "#ff4500" },
	every_100_shield: { color: "#74c0fc" },
	every_100_heal: { color: "#51cf66" },
	every_10_poison: { color: "#da77f2" },
	every_10_regen: { color: "#8ce99a" },
	slow: { color: "#d0bfff" },
	charge: { color: "#ffe066" },
	increase_power: { color: "#ff8cc8" },
	decrease_power: { color: "#8a2be2" },
	increase_critical: { color: "#ff8cc8" },
	on_crit: { color: "#ff0000" },
	on_over_heal: { color: "#51cf66" },
	on_battle_start: { color: "#ffffff" },
	multiply_power: { color: "#ff8cc8" },
	all: { color: "#ffffff" },
};

const getPositionDescription = (position: string): string => {
	//const key = `tooltip.sentence.position.${position}`;
	// Fallback to "all" if not found is not safe, but 'all', 'allies', 'enemies' map directly.
	// We matched keys in en.json to values in TriggerSystem (presumably).
	// TriggerSystem positions: all, allies, enemies, row_allies, column_allies, top_ally, etc.
	// My keys in en.json: ally, enemy, row, column...
	// Wait, I used "row" in en.json but the code passes "row_allies".
	// I need to map "row_allies" -> "row" or update en.json keys or update this mapping.
	// I'll update the mapping here for safety.

	switch (position) {
		case "all":
			return t("tooltip.sentence.position.any");
		case "allies":
			return t("tooltip.sentence.position.ally");
		case "enemies":
			return t("tooltip.sentence.position.enemy");
		case "row_allies":
			return t("tooltip.sentence.position.row");
		case "column_allies":
			return t("tooltip.sentence.position.column");
		case "top_ally":
			return t("tooltip.sentence.position.top");
		case "bottom_ally":
			return t("tooltip.sentence.position.bottom");
		case "left_ally":
			return t("tooltip.sentence.position.left");
		case "right_ally":
			return t("tooltip.sentence.position.right");
		default:
			return position;
	}
};

export const getReactionDescription = (reaction: EffectReaction, unitPower: number): string => {
	const style = EFFECT_STYLES[reaction.effectId];
	const effectKey = reaction.effectId === "all" ? "any" : reaction.effectId;
	const triggerColor = style ? style.color : "#51cf66";

	const sourceDesc = reaction.position ? getPositionDescription(reaction.position) : t("tooltip.sentence.position.any");
	const effectName = t(`tooltip.effects.${effectKey}`);

	let triggerText = "";
	if (reaction.effectId === "on_crit") {
		triggerText = t("tooltip.sentence.trigger.on_crit", { source: sourceDesc });
	} else if (reaction.effectId === "on_battle_start") {
		triggerText = t("tooltip.sentence.trigger.on_battle_start");
	} else if (reaction.effectId === "on_over_heal") {
		triggerText = t("tooltip.sentence.trigger.on_over_heal", { source: sourceDesc });
	} else {
		triggerText = t("tooltip.sentence.trigger.default", { source: sourceDesc, effect: effectName });
	}

	const coloredTrigger = `[color=${triggerColor}]${triggerText}[/color]`;

	const effectSegments = reaction.effects
		.map((e) => buildEffectBlock(e, unitPower))
		.filter((e): e is string => e !== null);

	const effectText = effectSegments.join(effectSegments.length > 1 ? "\n" : ", ");

	return t("tooltip.sentence.reaction", { trigger: coloredTrigger, effect: effectText });
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
