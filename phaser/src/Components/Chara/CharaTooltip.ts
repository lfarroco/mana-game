import { Chara } from "@Components/Chara/Chara";
import { hideTooltip, renderTooltip } from "@Components/Tooltip/Tooltip";
import { createDescription } from "@Components/Chara/createDescription";
import { t } from "@i18n/i18n";
import { getSettings } from "@Models/OptionsStore";
import type { Effect, EffectReaction } from "@game/Models";
import * as Descriptions from "@game/descriptions/descriptions";

export const buildEffectBlock = (effect: Effect, unitPower: number): string | null =>
	Descriptions.buildEffectBlock(effect, unitPower, t, getSettings().compactTooltips);

export const buildCompactEffectBlock = (effect: Effect, unitPower: number): string | null =>
	Descriptions.buildCompactEffectBlock(effect, unitPower, t);

export const getReactionDescription = (reaction: EffectReaction, unitPower: number): string =>
	Descriptions.getReactionDescription(reaction, unitPower, t, getSettings().compactTooltips);

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
