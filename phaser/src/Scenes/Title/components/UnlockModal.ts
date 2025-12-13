import * as c from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { getCurrentScene } from "@Models/State";
import * as io from "@PhaserIO";
import { createUIButton } from "@Components/UIButton";
import { getCardDefinition } from "@Models/Entities/Card";
import * as Chara from "@Systems/Chara/Chara";
import { createUnitFromCardSpec } from "@Models/Entities/Unit";
import { createDescription } from "@Systems/Chara/createDescription";

const OVERLAY_ALPHA = 0.85;
const PANEL_WIDTH = 800;
const PANEL_HEIGHT = 700;

export function showUnlockModal(unitId: string): Promise<void> {
	return new Promise(async (resolve) => {
		const scene = getCurrentScene();
		const unitData = getCardDefinition(unitId);

		const overlay = scene.add.rectangle(
			c.MIDDLE_SCREEN_X,
			c.MIDDLE_SCREEN_Y,
			c.SCREEN_WIDTH,
			c.SCREEN_HEIGHT,
			0x000000,
			OVERLAY_ALPHA
		);
		overlay.setInteractive();

		const panelBg = io.BorderedRoundRect(
			vec2(c.MIDDLE_SCREEN_X, c.MIDDLE_SCREEN_Y),
			{ width: PANEL_WIDTH, height: PANEL_HEIGHT },
			20,
			0x2c3e50,
			0.95
		);

		const modalTitle = io.Title1("NEW UNIT UNLOCKED!");
		io.SetPosition(modalTitle, vec2(c.MIDDLE_SCREEN_X, c.MIDDLE_SCREEN_Y - PANEL_HEIGHT / 2 + 50));
		io.Centralize(modalTitle);

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
				container.destroy(true);
				resolve();
			}
		);

		const container = io.Container([
			overlay,
			panelBg,
			modalTitle,
			chara,
			titleText,
			descriptionText,
			confirmButton.container
		]);

		io.BringToTop(container);
	});
}
