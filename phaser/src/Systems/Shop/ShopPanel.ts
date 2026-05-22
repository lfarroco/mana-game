import { vec2 } from "@Models/Geometry";
import * as c from "@Constants/constants";
import { Button, createUIButton } from "@Components/UIButton";
import { tween } from "@Utils/animation";
import * as AudioManager from "@Systems/AudioManager";
import { Container } from "@PhaserIO";
import { resetEncounterFocusTargets } from "@Systems/Encounter";
import { getCurrentScene } from "@Models/State";
import * as constants from "@Constants/constants";

export let container: Container;
export let nextRoundButton: Button;
export const onNextRoundClicked: (() => void) | null = null;

export const create = (nextRoundCallback: (() => void) | null) => {
	container?.destroy();
	resetEncounterFocusTargets();

	container = Container();

	container.setY(c.SCREEN_HEIGHT * -1);

	if (!nextRoundCallback) return;

	const nextRoundBtn = createUIButton({
		text: "Skip",
		position: vec2(
			constants.BATTLEGROUND_BUTTON_X,
			c.SCREEN_HEIGHT - constants.BATTLEGROUND_BUTTON_MARGIN_BOTTOM
		),
		callback: nextRoundCallback,
	});

	container.add(nextRoundBtn.container);
	nextRoundButton = nextRoundBtn;
};

export const isVisible = () => Boolean(container) && container.y > c.SCREEN_HEIGHT * -1;

export const slideIn = async () => {
	getCurrentScene().tweens.killTweensOf(container);
	AudioManager.playSoundEffect("sfx_ui_modalwindow_swoosh_enter");
	await tween({ targets: [container], y: 0 });
};

export const slideOut = async () => {
	getCurrentScene().tweens.killTweensOf(container);
	AudioManager.playSoundEffect("sfx_ui_modalwindow_swoosh_exit");
	await tween({ targets: [container], y: c.SCREEN_HEIGHT * -1 });
	container.removeAll(true);
	resetEncounterFocusTargets();
};

export const bringChildToTop = (child: Phaser.GameObjects.GameObject): void => {
	container.bringToTop(child);
};

export const removeChild = (child: Phaser.GameObjects.GameObject, destroy: boolean = false) => {
	container.remove(child, destroy);
};
