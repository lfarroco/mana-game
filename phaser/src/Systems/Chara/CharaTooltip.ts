import { Chara } from "@Systems/Chara/Chara";
import { Effect, EffectReaction, Targeting } from "@TriggerSystem/TriggerSystem";
import { hideTooltip, renderTooltip } from "Client/Components/Tooltip";
import { createDescription } from "@Systems/Chara/createDescription";
import { t } from "@i18n/i18n";
import { ABILITY_COLORS } from "@Models/Abilities";
import { getOption } from "@Models/OptionsStore";

const MS_PER_SECOND = 1000;

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
		return t("tooltip.sentence.target.all_allies_type", {
			type: targets.ofType,
			color: ABILITY_COLORS[targets.ofType],
		});
	}

	return t(key, { count: count?.toString() });
};

const isTargetPlural = (targets?: Targeting): boolean => {
	if (!targets) return true; // Default to plural "targets" if undefined? Or maybe false? "Targets" is plural.

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

const COMPACT_TARGET_MAP: Record<string, string> = {
	top_ally: "top",
	bottom_ally: "bottom",
	left_ally: "left",
	right_ally: "right",
};

const getCompactTargetDescription = (targets: Targeting, color?: string): string => {
	if (!targets) return "";
	let id: string = targets.id;
	if (COMPACT_TARGET_MAP[id]) {
		id = COMPACT_TARGET_MAP[id];
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const count = (targets as any).count;
	if (targets.id === "random_ally" && count && count > 1)
		return t("tooltip.targets.random_allies", { count, color: color || "" });
	if (targets.id === "random_enemy" && count && count > 1)
		return t("tooltip.targets.random_enemies", { count, color: color || "" });

	if (targets.id === "all_allies" && targets.ofType !== "any") {
		return t("tooltip.targets.all_allies_type", {
			type: targets.ofType,
			color: ABILITY_COLORS[targets.ofType],
		});
	}

	return t(`tooltip.targets.${id}`, { color: color || "" });
};

export const buildCompactEffectBlock = (effect: Effect, unitPower: number): string | null => {
	const amount = unitPower.toString();
	const color = ABILITY_COLORS[effect.id] || "#ffffff";
	const effectName = t(`tooltip.effects.${effect.id}`);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const targets = (effect as any).targets as Targeting | undefined;
	const targetDesc = targets ? getCompactTargetDescription(targets, color) : "";

	let effectString = "";

	switch (effect.id) {
		case "damage":
		case "heal":
		case "shield":
		case "poison":
		case "regen":
			effectString = `[color=${color}]${effectName} ${amount}[/color]`;
			break;
		case "haste":
		case "slow":
		case "charge": {
			const dur = (effect.duration / MS_PER_SECOND).toFixed(1);
			effectString = `[color=${color}]${effectName}[/color] ${dur}s`;
			break;
		}
		case "increase_power": {
			const suffix = effect.permanent ? "*" : "";
			effectString = `[color=${color}]+${effect.amount}${suffix} ${effectName}[/color]`;
			break;
		}
		case "decrease_power":
			effectString = `[color=${color}]-${effect.amount}${effect.permanent ? "*" : ""} ${t("tooltip.effects.increase_power")}[/color]`;
			break;
		case "increase_critical":
			effectString = `[color=${color}]+${effect.amount} ${t("tooltip.effects.increase_critical")}[/color]`;
			break;
		case "multiply_power":
			effectString = `[color=${color}]x${effect.multiplier} ${t("tooltip.effects.increase_power")}[/color]`;
			break;
		case "distribute_power":
			effectString = `50% [color=${color}]${t("tooltip.effects.increase_power")}[/color]`;
			break;
		case "absorb_power":
			effectString = `Absorb 50% [color=${color}]${t("tooltip.effects.increase_power")}[/color]`;
			break;
		case "on_crit":
		case "on_battle_start":
		case "on_over_heal":
			return null;
		default:
			return null;
	}

	if (targetDesc) {
		return `${effectString} -> ${targetDesc}`;
	}
	return effectString;
};

export const buildEffectBlock = (effect: Effect, unitPower: number): string | null => {
	if (getOption("compactTooltips")) {
		return buildCompactEffectBlock(effect, unitPower);
	}

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
			const dur = (effect.duration / MS_PER_SECOND).toFixed(1);
			return t("tooltip.sentence.haste", { duration: dur, target, color });
		}
		case "slow": {
			const dur = (effect.duration / MS_PER_SECOND).toFixed(1);
			return t("tooltip.sentence.slow", { duration: dur, target, color });
		}
		case "charge": {
			const dur = (effect.duration / MS_PER_SECOND).toFixed(1);
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
				amount: effect.amount.toString(),
				target,
				color,
			});
		case "increase_critical": {
			const key = isPlural
				? "tooltip.sentence.increase_critical_plural"
				: "tooltip.sentence.increase_critical";
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
			return t("tooltip.sentence.distribute_power", {
				target,
				color,
			});
		case "absorb_power":
			return t("tooltip.sentence.absorb_power", {
				target,
				color,
			});
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
	if (getOption("compactTooltips")) {
		const style = ABILITY_COLORS[reaction.effectId];
		const color = style || "#51cf66";
		const effectKey = reaction.effectId === "all" ? "any" : reaction.effectId;
		const sourceDesc = reaction.position
			? getCompactTargetDescription({ id: reaction.position } as Targeting, color)
			: t("tooltip.targets.source", { color });
		const effectName = t(`tooltip.effects.${effectKey}`);

		let triggerText = `⚡ ${effectName} (${sourceDesc})`;

		if (reaction.effectId === "on_crit") {
			triggerText = `⚡ ${t("tooltip.effects.on_crit")}`;
		} else if (reaction.effectId === "on_battle_start") {
			triggerText = `⚡ ${t("tooltip.effects.on_battle_start")}`;
		} else if (reaction.effectId === "on_over_heal") {
			triggerText = `⚡ ${t("tooltip.effects.on_over_heal")} (${sourceDesc})`;
		}

		const effectSegments = reaction.effects
			.map((e) => buildCompactEffectBlock(e, unitPower))
			.filter((e): e is string => e !== null);

		const effectText = effectSegments.join(" -> ");
		return `${triggerText} -> ${effectText}`;
	}

	const style = ABILITY_COLORS[reaction.effectId];
	const effectKey = reaction.effectId === "all" ? "any" : reaction.effectId;
	const color = style || "#51cf66";

	const sourceDesc = reaction.position
		? getPositionDescription(reaction.position)
		: t("tooltip.sentence.position.any");
	const effectName = t(`tooltip.effects.${effectKey}`);

	let triggerText = "";
	if (reaction.effectId === "on_crit") {
		triggerText = t("tooltip.sentence.trigger.on_crit", { source: sourceDesc });
	} else if (reaction.effectId === "on_battle_start") {
		triggerText = t("tooltip.sentence.trigger.on_battle_start");
	} else if (reaction.effectId === "on_over_heal") {
		triggerText = t("tooltip.sentence.trigger.on_over_heal", { source: sourceDesc });
	} else {
		triggerText = t("tooltip.sentence.trigger.default", {
			source: sourceDesc,
			effect: effectName,
			color,
		});
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
