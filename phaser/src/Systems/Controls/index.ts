import Phaser from "phaser";
import { getGameController } from "@Core/GameControllerFactory";
import { getState } from "@Models/State";
import BattlegroundScene from "@Scenes/Battleground/BattlegroundScene";
import { resolveShortcutAction, shouldIgnoreShortcutEvent } from "@Systems/Controls/shortcuts";

export function init(scene: BattlegroundScene) {
	const keyboard = scene.input.keyboard;
	if (!keyboard) {
		return;
	}

	const onKeyDown = async (event: KeyboardEvent) => {
		if (event.repeat || shouldIgnoreShortcutEvent(event)) {
			return;
		}

		const action = resolveShortcutAction(getState(), event.key);
		if (!action) {
			return;
		}

		event.preventDefault();

		const controller = getGameController();
		switch (action.type) {
			case "skipPhase":
				await controller.skipPhase();
				break;
			case "purchaseUnit":
				await controller.purchaseUnit(action.optionId);
				break;
			case "selectEncounter":
				await controller.selectEncounter(action.optionId);
				break;
			case "handleAction":
				await controller.handleAction(action.optionId);
				break;
		}
	};

	keyboard.on("keydown", onKeyDown);
	scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
		keyboard.off("keydown", onKeyDown);
	});
}
