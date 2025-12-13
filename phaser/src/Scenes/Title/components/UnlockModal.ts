import * as c from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { getCurrentScene } from "@Models/State";
import * as io from "@PhaserIO";
import { createUIButton } from "@Components/UIButton";
import { getCardDefinition } from "@Models/Entities/Card";

const OVERLAY_ALPHA = 0.85;
const PANEL_WIDTH = 600;
const PANEL_HEIGHT = 500;

export function showUnlockModal(unitId: string): Promise<void> {
	return new Promise((resolve) => {
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

		const title = io.Title1("NEW UNIT UNLOCKED!");
		io.SetPosition(title, vec2(c.MIDDLE_SCREEN_X, c.MIDDLE_SCREEN_Y - PANEL_HEIGHT / 2 + 50));
		io.Centralize(title);

		const unitImage = scene.add.image(c.MIDDLE_SCREEN_X, c.MIDDLE_SCREEN_Y - 50, unitData.pic);
		unitImage.setScale(1.5);

		const nameText = scene.add.text(
			c.MIDDLE_SCREEN_X,
			c.MIDDLE_SCREEN_Y + 50,
			unitData.name_en, // TODO: Localize name
			{
				...c.titleTextConfig,
				fontSize: "28px",
				color: "#f1c40f",
			}
		);
		nameText.setOrigin(0.5, 0.5);

		const confirmButton = createUIButton(
			"AWESOME!",
			vec2(c.MIDDLE_SCREEN_X, c.MIDDLE_SCREEN_Y + PANEL_HEIGHT / 2 - 60),
			() => {
				container.destroy(true);
				resolve();
			}
		);

		const container = io.Container([
			overlay,
			panelBg,
			title,
			unitImage,
			nameText,
			confirmButton.container
		]);

		io.BringToTop(container);
	});
}
