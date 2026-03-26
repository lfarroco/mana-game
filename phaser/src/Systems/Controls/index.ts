import Phaser from "phaser";
import { getGameController } from "@Core/GameControllerFactory";
import { getState } from "@Models/State";
import BattlegroundScene from "@Scenes/Battleground/BattlegroundScene";
import {
	activateFocusedSceneButton,
	clearSceneButtonFocus,
	focusNextSceneButton,
	hasNavigableButtons,
} from "@Components/UIButton";
import {
	ControlContext,
	ControlIntent,
	resolveGamepadIntents,
	resolveKeyboardIntents,
	shouldIgnoreShortcutEvent,
	GamepadSnapshot,
} from "@Systems/Controls/intents";

type InitOptions = {
	context: ControlContext;
	onCancel?: () => void;
};

const getGamepadSnapshot = (scene: Phaser.Scene): GamepadSnapshot | null => {
	const gamepad = scene.input.gamepad?.gamepads.find((pad) => pad && pad.connected);
	if (!gamepad) {
		return null;
	}

	return {
		buttons: gamepad.buttons.map((button) => button.pressed),
		leftStickX: gamepad.leftStick.x,
		leftStickY: gamepad.leftStick.y,
	};
};

const executeShortcutAction = async (action: ControlIntent & { type: "shortcut" }) => {
	const controller = getGameController();
	switch (action.action.type) {
		case "skipPhase":
			await controller.skipPhase();
			break;
		case "purchaseUnit":
			await controller.purchaseUnit(action.action.optionId);
			break;
		case "selectEncounter":
			await controller.selectEncounter(action.action.optionId);
			break;
		case "handleAction":
			await controller.handleAction(action.action.optionId);
			break;
	}
};

const executeIntent = async (
	scene: Phaser.Scene,
	intent: ControlIntent,
	options: InitOptions
) => {
	switch (intent.type) {
		case "navigate":
			focusNextSceneButton(scene, intent.direction);
			return;
		case "confirm":
			if (hasNavigableButtons(scene)) {
				activateFocusedSceneButton(scene);
			}
			return;
		case "cancel":
			options.onCancel?.();
			return;
		case "shortcut":
			await executeShortcutAction(intent);
	}
};

export function init(scene: BattlegroundScene | Phaser.Scene, options: InitOptions) {
	const keyboard = scene.input.keyboard;
	let previousGamepadSnapshot: GamepadSnapshot | undefined;

	const onKeyDown = async (event: KeyboardEvent) => {
		if (event.repeat || shouldIgnoreShortcutEvent(event)) {
			return;
		}

		const intents = resolveKeyboardIntents(options.context, getState(), event.key);
		if (intents.length === 0) {
			return;
		}

		event.preventDefault();
		for (const intent of intents) {
			await executeIntent(scene, intent, options);
		}
	};

	keyboard?.on("keydown", onKeyDown);

	const onUpdate = async () => {
		const snapshot = getGamepadSnapshot(scene);
		if (!snapshot) {
			previousGamepadSnapshot = undefined;
			return;
		}

		const intents = resolveGamepadIntents(
			options.context,
			getState(),
			snapshot,
			previousGamepadSnapshot
		);
		previousGamepadSnapshot = snapshot;

		for (const intent of intents) {
			await executeIntent(scene, intent, options);
		}
	};

	scene.events.on(Phaser.Scenes.Events.UPDATE, onUpdate);
	scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
		keyboard?.off("keydown", onKeyDown);
		scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate);
		clearSceneButtonFocus(scene);
	});
}
