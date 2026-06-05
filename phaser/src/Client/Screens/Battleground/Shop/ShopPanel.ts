import * as Geometry from "@Models/Geometry";
import * as c from "@Constants/constants";
import * as UIButton from "Client/Components/UIButton";
import * as animation from "@Utils/animation";
import * as AudioManager from "@Systems/AudioManager";
import * as constants from "@Constants/constants";
import * as utils from "@utils"

export const ShopState: { container: Container | null } = {
	container: null,
};

//@ts-expect-error wee
window.zz = ShopState;

export const create = () => {

	if (__DEV__) {
		utils.assert(
			ShopState.container === null,
			"ShopPanel container already exists"
		);
	}

	ShopState.container = io.Container();

	ShopState.container.on(Phaser.GameObjects.Events.DESTROY, () => {
		ShopState.container?.removeAllListeners();
		ShopState.container = null;
	});

	ShopState.container.setY(c.SCREEN_HEIGHT * -1);
};

export const addSkipButton = (callback: () => void): void => {
	const skipButton = UIButton.createUIButton({
		text: "Skip",
		position: Geometry.vec2(
			constants.BATTLEGROUND_BUTTON_X,
			c.SCREEN_HEIGHT - constants.BATTLEGROUND_BUTTON_MARGIN_BOTTOM
		),
		callback,
	});

	ShopState.container?.add(skipButton.container);
}

export const SlideIn = async () => {
	//io.scene.tweens.killTweensOf(container);
	AudioManager.playSoundEffect("sfx_ui_modalwindow_swoosh_enter");
	await animation.tween({
		targets: [ShopState.container!],
		y: 0,
	});
};

export const SlideOut = async () => {
	//io.scene.tweens.killTweensOf(container);
	AudioManager.playSoundEffect("sfx_ui_modalwindow_swoosh_exit");
	await animation.tween({
		targets: [ShopState.container!],
		y: c.SCREEN_HEIGHT * -1,
	});
	ShopState.container?.removeAll(true);
};

export const bringChildToTop = (child: Phaser.GameObjects.GameObject): void => {
	ShopState.container?.bringToTop(child);
};


