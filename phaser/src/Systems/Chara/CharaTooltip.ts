import { Chara } from "./Chara";
import { Effect, EffectReaction, Targeting } from "../../TriggerSystem/TriggerSystem";
import { hideTooltip, renderTooltip } from "../../Components/Tooltip";
import { createDescription } from "./createDescription";
import { t } from "../../i18n/i18n";
import { ABILITY_COLORS } from "@Models/Abilities";

const getTargetDescription = (targets: Targeting): string => {
	if (!targets) return t("tooltip.targets.default");

	let key = `tooltip.sentence.target.${targets.id}`;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const count = (targets as any).count;

	if (targets.id === "random_ally" && count && count > 1)
		key = "tooltip.sentence.target.random_allies";
	if (targets.id === "random_enemy" && count && count > 1)
		key = "tooltip.sentence.target.random_enemies";

	if (targets.id === "all_allies" && targets.ofType !== "any") {
		return t("tooltip.sentence.target.all_allies_type", { type: targets.ofType, color: ABILITY_COLORS[targets.ofType] });
	}

	return t(key, { count: count?.toString() });
};

const isTargetPlural = (targets?: Targeting): boolean => {
	if (!targets) return true; // Default to plural "targets" if undefined? Or maybe false? "Targets" is plural.
	// But undefined targets usually means implicit, but let's see. logic above says "Targets" default.

	switch (targets.id) {
		case "self":
		case "strongest_ally":
		case "weakest_ally":
		case "strongest_enemy":
		case "weakest_enemy":
		case "trigger":
		case "top_ally":
		case "bottom_ally":
		case "left_ally":
		case "right_ally":
			return false;
		case "random_ally":
		case "random_enemy":
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			return ((targets as any).count || 1) > 1;
		case "all_allies":
		case "all_enemies":
		case "row_allies":
		case "column_allies":
			return true;
		default:
			return true;
	}
};

export const buildEffectBlock = (effect: Effect, unitPower: number): string | null => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const targets = (effect as any).targets as Targeting | undefined;
	const target = targets ? getTargetDescription(targets) : "";
	const isPlural = isTargetPlural(targets);

	const amount = unitPower.toString();
	const color = ABILITY_COLORS[effect.id];

	switch (effect.id) {
		case "damage":
			return t("tooltip.sentence.damage", { amount, target, color });
		case "heal":
			return t("tooltip.sentence.heal", { amount, target, color });
		case "shield":
			return t("tooltip.sentence.shield", { amount, target, color });
		case "poison":
			return t("tooltip.sentence.poison", { amount, target, color });
		case "regen":
			return t("tooltip.sentence.regen", { amount, target, color });
		case "haste": {
			const dur = (effect.duration / 1000).toFixed(1);
			return t("tooltip.sentence.haste", { duration: dur, target, color });
		}
		case "slow": {
			const dur = (effect.duration / 1000).toFixed(1);
			return t("tooltip.sentence.slow", { duration: dur, target, color });
		}
		case "charge": {
			const dur = (effect.duration / 1000).toFixed(1);
			return t("tooltip.sentence.charge", { duration: dur, target, color });
		}
		case "increase_power": {
			const key = effect.permanent
				? isPlural
					? "tooltip.sentence.increase_power_permanent_plural"
					: "tooltip.sentence.increase_power_permanent"
				: isPlural
					? "tooltip.sentence.increase_power_plural"
					: "tooltip.sentence.increase_power";
			return t(key, {
				amount: effect.amount.toString(),
				target,
				color,
			});
		}
		case "decrease_power":
			return t("tooltip.sentence.decrease_power", {
				amount: effect.percentage.toString(),
				target,
				color,
			});
		case "increase_critical": {
			const key = isPlural ? "tooltip.sentence.increase_critical_plural" : "tooltip.sentence.increase_critical";
			return t(key, {
				amount: effect.amount.toString(),
				target,
				color,
			});
		}
		case "multiply_power":
			return t("tooltip.sentence.multiply_power", {
				amount: effect.multiplier.toString(),
				target,
				color,
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
	const style = ABILITY_COLORS[reaction.effectId];
	const effectKey = reaction.effectId === "all" ? "any" : reaction.effectId;
	const color = style || "#51cf66";

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
		triggerText = t("tooltip.sentence.trigger.default", { source: sourceDesc, effect: effectName, color });
	}

	const coloredTrigger = triggerText;

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
