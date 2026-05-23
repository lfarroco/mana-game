import { getName } from "@i18n/i18n";
import * as io from "@PhaserIO";
import { getCloudsBg } from "../../Title/components/cloudsBg";
import * as _ from "../CrystalSelectionScene";

export function updateDisplay() {
	const crystal = _.state.crystals[_.state.currentIndex];

	_.state.crystalSprite.setTexture(crystal.pic);

	_.state.crystalName.setText(getName(crystal.id));
	io.Centralize(_.state.crystalName);

	const description = _.buildCrystalDescription(crystal);
	_.state.descriptionText.setText(description);

	_.state.paginationDots.forEach((dot, i) => {
		dot.setFillStyle(
			_.PAGINATION_DOT_COLOR,
			i === _.state.currentIndex ? _.PAGINATION_DOT_ACTIVE_ALPHA : _.PAGINATION_DOT_INACTIVE_ALPHA
		);
	});

	const bg = getCloudsBg();
	if (bg) {
		const preset = _.getColorPresetForCrystal(crystal.id);
		bg.tweenToPreset(preset, _.CLOUD_BG_ANIMATION_DURATION, _.CLOUD_BG_ANIMATION_EASE);
	}
}
