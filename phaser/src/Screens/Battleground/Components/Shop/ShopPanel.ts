import * as c from "@Constants";
import * as UIButton from "@Components/Button/UIButton";
import * as animation from "@Utils/animation";
import * as AudioManager from "@Systems/AudioManager";
import * as constants from "@Constants";
import { env, makeContainer as container } from "@Env";
import { BattlegroundEvent } from "../../../../Events";

export const ShopState: { container: Container | null } = {
	container: null,
};

// TODO: long term goal: have each phase have its elements all enable after
// calling init, then events pull them into the screen as needed
export const create = () => {

	ShopState.container = container(env.scene);

	ShopState.container.on(Phaser.GameObjects.Events.DESTROY, () => {
		ShopState.container?.removeAllListeners();
		ShopState.container = null;
	});

	ShopState.container.setY(c.SCREEN_HEIGHT * -1);
};

export const addSkipButton = (): void => {
	const skipButton = UIButton.create({
		text: "Skip",
		position: [
			constants.BATTLEGROUND_BUTTON_X,
			c.SCREEN_HEIGHT - constants.BATTLEGROUND_BUTTON_MARGIN_BOTTOM
		],
		callback: () => {
			void (async () => {
				const previousPhase = env.state.session.phase;
				const { session } = await env.dispatch({ type: "skip" });
				env.updateState({ ...env.state, session });
				BattlegroundEvent.phaseFinished.emit({ previousPhase });
			})();
		}
	});

	ShopState.container?.add(skipButton.container);
}

export const SlideIn = async () => {
	AudioManager.playSoundEffect("sfx_ui_modalwindow_swoosh_enter");
	await animation.tween({
		targets: [ShopState.container!],
		y: 0,
	});
};

export const SlideOut = async () => {
	AudioManager.playSoundEffect("sfx_ui_modalwindow_swoosh_exit");
	await animation.tween({
		targets: [ShopState.container!],
		y: c.SCREEN_HEIGHT * -1,
	});
	ShopState.container?.removeAll(true);
};

export const bringToTop = (child: Phaser.GameObjects.GameObject) => ShopState.container?.bringToTop(child);

export const add = (child: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[]) => ShopState.container?.add(child);

