import * as Geometry from "@Models/Geometry";
import * as c from "@Constants/constants";
import * as UIButton from "Client/Components/UIButton";
import * as animation from "@Utils/animation";
import * as AudioManager from "@Systems/AudioManager";
import * as Encounter from "@Systems/Encounter";
import * as constants from "@Constants/constants";

export let container: Container;

export const refresh = (
	// TODO: remove arg
	nextRoundCallback: (() => void) | null
) => {
	if (!container) {
		container = io.Container();
	}
	container.removeAll(true);
	Encounter.resetEncounterFocusTargets();

	container.setY(c.SCREEN_HEIGHT * -1);

	if (!nextRoundCallback) return;

	const nextRoundBtn = UIButton.createUIButton({
		text: "Skip",
		position: Geometry.vec2(
			constants.BATTLEGROUND_BUTTON_X,
			c.SCREEN_HEIGHT - constants.BATTLEGROUND_BUTTON_MARGIN_BOTTOM
		),
		callback: nextRoundCallback,
	});

	container.add(nextRoundBtn.container);
};

export const SlideIn = async () => {
	io.scene.tweens.killTweensOf(container);
	AudioManager.playSoundEffect("sfx_ui_modalwindow_swoosh_enter");
	await animation.tween({
		targets: [container],
		y: 0,
	});
};

export const SlideOut = async () => {
	io.scene.tweens.killTweensOf(container);
	AudioManager.playSoundEffect("sfx_ui_modalwindow_swoosh_exit");
	await animation.tween({
		targets: [container],
		y: c.SCREEN_HEIGHT * -1,
	});
	container.removeAll(true);
	Encounter.resetEncounterFocusTargets();
};

export const bringChildToTop = (child: Phaser.GameObjects.GameObject): void => {
	container.bringToTop(child);
};


