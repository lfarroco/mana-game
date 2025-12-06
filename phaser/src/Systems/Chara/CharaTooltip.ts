import { Chara } from "./Chara";
import { Effect, EffectReaction, Targeting } from "../../TriggerSystem/TriggerSystem";
import { hideTooltip, renderTooltip } from "../../Components/Tooltip";
import { createDescription } from "./createDescription";
import { t } from "../../i18n/i18n";

export const buildEffectBlock = (effect: Effect, unitPower: number): string | null => {
	const withTargets = (base: string, targets?: Targeting) => {
		if (!targets) return base;
		return `${base} → [color=#e0e0e0]${getTargetDescription(targets)}[/color]`;
	};

	switch (effect.id) {
		case "damage":
			return `[color=#ff6b6b]${t("tooltip.effects.damage")}[/color] [color=#ffd93d]${unitPower}[/color]`;
		case "heal":
			return `[color=#51cf66]${t("tooltip.effects.heal")}[/color] [color=#ffd93d]${unitPower}[/color]`;
		case "shield":
			return `[color=#74c0fc]${t("tooltip.effects.shield")}[/color] [color=#ffd93d]${unitPower}[/color]`;
		case "poison":
			return `[color=#da77f2]${t("tooltip.effects.poison")}[/color] [color=#ffd93d]${unitPower}[/color] ${t("tooltip.over_time")}`;
		case "regen":
			return `[color=#8ce99a]${t("tooltip.effects.regen")}[/color] [color=#ffd93d]${unitPower}[/color] ${t("tooltip.over_time")}`;
		case "haste": {
			const dur = (effect.duration / 1000).toFixed(1);
			return withTargets(
				`[color=#91a7ff]${t("tooltip.effects.haste")}[/color] [color=#ffa94d]${dur}s[/color]`,
				effect.targets
			);
		}
		case "slow": {
			const dur = (effect.duration / 1000).toFixed(1);
			return withTargets(
				`[color=#d0bfff]${t("tooltip.effects.slow")}[/color] [color=#ffa94d]${dur}s[/color]`,
				effect.targets
			);
		}
		case "charge":
			const dur = (effect.duration / 1000).toFixed(1);
			return withTargets(
				`[color=#ffe066]${t("tooltip.effects.charge")}[/color] [color=#ffd93d]${dur}s[/color]`,
				effect.targets
			);
		case "increase_power":
			return withTargets(
				`[color=#ff8cc8]+${effect.amount}${effect.permanent ? "*" : ""}[/color]`,
				effect.targets
			);
		case "increase_critical":
			return withTargets(
				`[color=#ff8cc8]+${t("tooltip.effects.increase_critical")}[/color] [color=#ffd93d]${effect.amount}[/color]`,
				effect.targets
			);
		case "multiply_power":
			return withTargets(
				`[color=#ff8cc8]${t("tooltip.effects.multiply_power")}[/color] [color=#ffd93d]${effect.multiplier}x[/color]`,
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

const EFFECT_STYLES: Record<string, { color: string }> = {
	damage: { color: "#ff6b6b" },
	heal: { color: "#51cf66" },
	shield: { color: "#74c0fc" },
	poison: { color: "#da77f2" },
	regen: { color: "#8ce99a" },
	haste: { color: "#91a7ff" },
	slow: { color: "#d0bfff" },
	charge: { color: "#ffe066" },
	increase_power: { color: "#ff8cc8" },
	increase_critical: { color: "#ff8cc8" },
	multiply_power: { color: "#ff8cc8" },
	all: { color: "#ffffff" },
};

export const getReactionDescription = (reaction: EffectReaction, unitPower: number): string => {
	const style = EFFECT_STYLES[reaction.effectId];
	const effectKey = reaction.effectId === "all" ? "any" : reaction.effectId;
	const triggerLabel = t(`tooltip.effects.${effectKey}`);
	const triggerColor = style ? style.color : "#51cf66";

	const posDesc = reaction.position ? getPositionDescription(reaction.position) : undefined;
	const showPos = !!reaction.position && !["all", "allies"].includes(reaction.position); // only show specific relative positions

	const effectSegments = reaction.effects
		.map((e) => buildEffectBlock(e, unitPower))
		.filter((e): e is string => e !== null);

	const triggerPrefix = `⚡[color=${triggerColor}]${triggerLabel}[/color]${showPos && posDesc ? ` ([color=#c0c0c0]${posDesc.toLowerCase()}[/color])` : ""}`;

	if (effectSegments.length > 1) {
		return `${triggerPrefix} →\n    ${effectSegments.join("\n    ")}`;
	}

	return [triggerPrefix, ...effectSegments].join(" → ");
};

const getPositionDescription = (position: string): string => {
	switch (position) {
		case "all":
			return t("tooltip.position.anyone");
		case "allies":
			return t("tooltip.position.ally");
		case "enemies":
			return t("tooltip.position.enemy");
		case "row_allies":
			return t("tooltip.position.row");
		case "column_allies":
			return t("tooltip.position.column");
		case "top_ally":
			return t("tooltip.position.top");
		case "bottom_ally":
			return t("tooltip.position.bottom");
		case "left_ally":
			return t("tooltip.position.left");
		case "right_ally":
			return t("tooltip.position.right");
		default:
			return position;
	}
};

const getTargetDescription = (targets: Targeting): string => {
	if (!targets) return t("tooltip.targets.default");

	switch (targets.id) {
		case "self":
			return t("tooltip.targets.self");
		case "random_ally":
			return targets.count === 1
				? t("tooltip.targets.random_ally")
				: t("tooltip.targets.random_allies", { count: targets.count.toString() });
		case "random_enemy":
			return targets.count === 1
				? t("tooltip.targets.random_enemy")
				: t("tooltip.targets.random_enemies", { count: targets.count.toString() });
		case "row_allies":
			return t("tooltip.targets.row");
		case "column_allies":
			return t("tooltip.targets.column");
		case "all_allies":
			if (targets.ofType !== "any")
				return t("tooltip.targets.all_allies_type", { type: targets.ofType });
			else return t("tooltip.targets.all_allies");
		case "all_enemies":
			return t("tooltip.targets.all_enemies");
		case "top_ally":
			return t("tooltip.targets.top");
		case "bottom_ally":
			return t("tooltip.targets.bottom");
		case "left_ally":
			return t("tooltip.targets.left");
		case "right_ally":
			return t("tooltip.targets.right");
		case "trigger":
			return t("tooltip.targets.source");
		default:
			return t("tooltip.targets.default");
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
