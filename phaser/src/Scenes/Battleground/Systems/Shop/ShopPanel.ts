import { vec2 } from "@Models/Geometry";
import * as c from "@Constants/constants";
import { Button, createUIButton } from "@Components/UIButton";
import { tween } from "@Utils/animation";
import * as AudioManager from "@Systems/AudioManager";
import { Container } from "@PhaserIO";

const NEXT_ROUND_BUTTON_X = c.SCREEN_WIDTH - 260;
const NEXT_ROUND_BUTTON_Y = c.SCREEN_HEIGHT - 50;

export let container: Container;
export let nextRoundButton: Button;
export let onNextRoundClicked: (() => void) | null = null;

export const create = (nextRoundCallback: (() => void) | null) => {
	container?.destroy();

	container = Container();

	container.setY(c.SCREEN_HEIGHT * -1);

	if (!nextRoundCallback) return;

	const nextRoundBtn = createUIButton(
		"Skip",
		vec2(NEXT_ROUND_BUTTON_X, NEXT_ROUND_BUTTON_Y),
		nextRoundCallback
	);

	container.add(nextRoundBtn.container);
	nextRoundButton = nextRoundBtn;
};

export const slideIn = async () => {
	AudioManager.playSoundEffect("sfx_ui_modalwindow_swoosh_enter");
	await tween({ targets: [container], y: 0 });
};

export const slideOut = async () => {
	AudioManager.playSoundEffect("sfx_ui_modalwindow_swoosh_exit");
	await tween({ targets: [container], y: c.SCREEN_HEIGHT * -1 });
	container.removeAll(true);
};

export const bringChildToTop = (child: Phaser.GameObjects.GameObject): void => {
	container.bringToTop(child);
};

export const removeChild = (child: Phaser.GameObjects.GameObject, destroy: boolean = false) => {
	container.remove(child, destroy);
};
