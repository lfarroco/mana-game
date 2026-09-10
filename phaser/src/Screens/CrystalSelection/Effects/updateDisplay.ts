import * as i18n from "@i18n/i18n";
import * as cloudsBg from "../../Title/Components/cloudsBg";
import {
	PAGINATION_DOT_ACTIVE_ALPHA,
	PAGINATION_DOT_COLOR,
	PAGINATION_DOT_INACTIVE_ALPHA,
} from "../Components/paginationDots";
import type BBCodeText from "phaser3-rex-plugins/plugins/gameobjects/tagtext/bbcodetext/BBCodeText";
import type { CardDefinition } from "@game/Models";
import { getColorPresetForCrystal } from "@game/data/crystalPresentation";
import { buildCrystalDescription } from "@game/descriptions/crystalDescription";
import { getSettings } from "@Models/OptionsStore";

const CLOUD_BG_ANIMATION_DURATION = 1500;
const CLOUD_BG_ANIMATION_EASE = "Sine.InOut";

/**
 * The crystal-display objects the screen builds once and then mutates as the
 * selection changes. Passed explicitly instead of looked up by a framework
 * element id (the raw-scene replacement for `findTrackedById`).
 */
export type CrystalDisplayRefs = {
	sprite: Phaser.GameObjects.Image;
	nameText: Phaser.GameObjects.Text;
	descText: BBCodeText;
	dots: Phaser.GameObjects.Arc[];
};

/** Refresh the crystal display (sprite, name, description, dots, background). */
export function updateDisplay(
	crystals: CardDefinition[],
	currentIndex: number,
	refs: CrystalDisplayRefs
): void {
	const crystal = crystals[currentIndex];
	if (!crystal) return;

	refs.sprite.setTexture(crystal.pic);

	refs.nameText.setText(i18n.getName(crystal.id));
	refs.nameText.setOrigin(0.5);

	refs.descText.setText(buildCrystalDescription(crystal, i18n.t, getSettings().compactTooltips));

	refs.dots.forEach((dot, i) => {
		dot.setFillStyle(
			PAGINATION_DOT_COLOR,
			i === currentIndex ? PAGINATION_DOT_ACTIVE_ALPHA : PAGINATION_DOT_INACTIVE_ALPHA
		);
	});

	const bg = cloudsBg.getCloudsBg();
	if (bg) {
		const preset = getColorPresetForCrystal(crystal.id);
		bg.tweenToPreset(preset, CLOUD_BG_ANIMATION_DURATION, CLOUD_BG_ANIMATION_EASE);
	}
}
