import * as c from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { getCurrentScene } from "@Models/State";
import { createUIButton } from "@Components/UIButton";
import { getCardDefinition } from "@Models/Entities/Card";
import * as Chara from "@Systems/Chara/Chara";
import { createUnitFromCardSpec } from "@Models/Entities/Unit";
import { createDescription } from "@Systems/Chara/createDescription";
import { createModal } from "@Components/Modal";

const PANEL_WIDTH = 800;
const PANEL_HEIGHT = 700;

export function showUnlockModal(unitId: string): Promise<void> {
	return new Promise(async (resolve) => {
		const unitData = getCardDefinition(unitId);

		const modal = createModal({
			width: PANEL_WIDTH,
			height: PANEL_HEIGHT,
			title: "NEW UNIT UNLOCKED!",
		});

		const dummy = createUnitFromCardSpec("dummy", unitData, undefined, "")

		const chara = await Chara.create(dummy);

		chara.setPosition(c.MIDDLE_SCREEN_X, c.MIDDLE_SCREEN_Y - 180);

		const { title, description } = createDescription(chara);

		const titleText = getCurrentScene().add
			.text(c.MIDDLE_SCREEN_X, chara.y + 180, title, c.titleTextConfig)
			.setOrigin(0.5);

		const descriptionText = getCurrentScene().add
			.rexBBCodeText(
				c.MIDDLE_SCREEN_X,
				titleText.y + 40,
				description)
			.setFontSize(30)
			.setWrapMode(1)
			.setFontFamily("Arimo")
			.setOrigin(0.5, 0);

		const confirmButton = createUIButton(
			"AWESOME!",
			vec2(c.MIDDLE_SCREEN_X, descriptionText.y + descriptionText.height + 60),
			() => {
				modal.close();
			}
		);

		modal.container.add([
			chara,
			titleText,
			descriptionText,
			confirmButton.container
		]);

		await modal.onClose;
		resolve();
	});
}
