import * as i18n from "@i18n/i18n";
import * as cloudsBg from "../../../Screens/Title/Components/cloudsBg";
import * as paginationDots from "../Components/paginationDots";
import { CardDefinition } from "@game/Models";
import { findTrackedById } from "@mana/framework";
import { getColorPresetForCrystal } from "@game/data/crystalPresentation";
import { buildCrystalDescription } from "@game/descriptions/crystalDescription";
import { getSettings } from "@Models/OptionsStore";
import { CRYSTAL_IDS, paginationDotId } from "../ids";

const CLOUD_BG_ANIMATION_DURATION = 1500;
const CLOUD_BG_ANIMATION_EASE = "Sine.InOut";

// TODO: recreate the phase, instead of updating elements
// will allow not relying on element ids

export function updateDisplay(crystals: CardDefinition[], currentIndex: number) {
	const crystal = crystals[currentIndex];

	const sprite = findTrackedById<Phaser.GameObjects.Image>(CRYSTAL_IDS.sprite);
	if (sprite) sprite.setTexture(crystal.pic);

	const nameText = findTrackedById<Phaser.GameObjects.Text>(CRYSTAL_IDS.name);
	if (nameText) {
		nameText.setText(i18n.getName(crystal.id));
		nameText.setOrigin(0.5);
	}

	const descText = findTrackedById<
		import("phaser3-rex-plugins/plugins/gameobjects/tagtext/bbcodetext/BBCodeText").default
	>(CRYSTAL_IDS.description);
	if (descText) {
		descText.setText(buildCrystalDescription(crystal, i18n.t, getSettings().compactTooltips));
	}

	// Pagination dots
	for (let i = 0; i < crystals.length; i++) {
		const dot = findTrackedById<Phaser.GameObjects.Arc>(paginationDotId(i));
		if (dot) {
			dot.setFillStyle(
				paginationDots.PAGINATION_DOT_COLOR,
				i === currentIndex
					? paginationDots.PAGINATION_DOT_ACTIVE_ALPHA
					: paginationDots.PAGINATION_DOT_INACTIVE_ALPHA
			);
		}
	}

	const bg = cloudsBg.getCloudsBg();
	if (bg) {
		const preset = getColorPresetForCrystal(crystal.id);
		bg.tweenToPreset(preset, CLOUD_BG_ANIMATION_DURATION, CLOUD_BG_ANIMATION_EASE);
	}
}
