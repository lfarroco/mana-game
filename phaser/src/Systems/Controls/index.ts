import Phaser from "phaser";
import { getGameController } from "@Core/GameControllerFactory";
import { getState } from "@Models/State";
import BattlegroundScene from "@Scenes/Battleground/BattlegroundScene";
import {
	activateFocusedSceneButton,
	clearSceneButtonFocus,
	focusSceneButtonByText,
	focusNextSceneButton,
	getFocusedSceneButtonText,
	hasSceneButtonByText,
	hasFocusedSceneButton,
	hasNavigableButtons,
} from "@Components/UIButton";
import { createBoardCursorController } from "@Systems/Controls/boardCursor";
import {
	blurEncounterFocus,
	confirmEncounterFocus,
	ensureEncounterFocus,
	getEncounterFocusCount,
	getFocusedEncounterIndex,
	hasFocusedEncounterTarget,
	hasEncounterFocusTargets,
	navigateEncounterFocus,
} from "@Systems/Encounter";
import { t } from "@i18n/i18n";
import { getOption } from "@Models/OptionsStore";
import { createLogger } from "@Utils/Logger";
import {
	ControlContext,
	ControlIntent,
	GamepadSnapshot,
	resolveGamepadIntents,
	resolveKeyboardIntents,
	shouldIgnoreShortcutEvent,
} from "@Systems/Controls/intents";

type InitOptions = {
	context: ControlContext;
	onCancel?: () => void;
};

type BattlegroundLayer = "board" | "encounter" | "buttons";

const logger = createLogger("Controls");

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

export function init(scene: BattlegroundScene | Phaser.Scene, options: InitOptions) {
	const keyboard = scene.input.keyboard;
	let previousGamepadSnapshot: GamepadSnapshot | undefined;
	const boardCursor =
		options.context === "battleground" ? createBoardCursorController(scene) : null;
	let activeBattlegroundLayer: BattlegroundLayer = "board";
	const menuButtonLabel = t("ui.menu.button");
	const skipEncounterLabel = t("encounters.skip");
	const normalizeLabel = (label: string): string => label.trim().toLowerCase();
	const isInputDebugEnabled = (): boolean => {
		const optionDebug = getOption("debug", false);
		if (optionDebug) {
			return true;
		}

		if (typeof window === "undefined") {
			return false;
		}

		const queryDebug = new URLSearchParams(window.location.search).get("inputDebug");
		if (queryDebug === "1" || queryDebug === "true") {
			return true;
		}

		try {
			const storageDebug = window.localStorage.getItem("mana_input_debug");
			return storageDebug === "1" || storageDebug === "true";
		} catch {
			return false;
		}
	};
	const logDebug = (message: string, meta?: unknown) => {
		if (!isInputDebugEnabled()) {
			return;
		}
		logger.info(`[input-debug] ${message}`, meta);
	};

	if (options.context === "buttons" && hasNavigableButtons(scene)) {
		focusNextSceneButton(scene, "down");
	}

	const getAvailableBattlegroundLayers = (): BattlegroundLayer[] => {
		if (options.context !== "battleground") {
			return [];
		}

		const layers: BattlegroundLayer[] = [];
		if (boardCursor?.canInteract()) {
			layers.push("board");
		}
		if (hasEncounterFocusTargets()) {
			layers.push("encounter");
		}
		if (hasNavigableButtons(scene)) {
			layers.push("buttons");
		}

		return layers;
	};

	const applyBattlegroundLayerVisualState = () => {
		if (options.context !== "battleground") {
			return;
		}

		boardCursor?.setVisualActive(activeBattlegroundLayer === "board");

		switch (activeBattlegroundLayer) {
			case "buttons":
				blurEncounterFocus();
				if (!hasFocusedSceneButton(scene)) {
					focusNextSceneButton(scene, "down");
				}
				return;
			case "encounter":
				clearSceneButtonFocus(scene);
				ensureEncounterFocus();
				return;
			case "board":
			default:
				clearSceneButtonFocus(scene);
				blurEncounterFocus();
		}
	};

	const normalizeBattlegroundLayer = () => {
		if (options.context !== "battleground") {
			return;
		}

		const available = getAvailableBattlegroundLayers();
		if (available.length === 0) {
			activeBattlegroundLayer = "board";
			return;
		}

		if (!available.includes(activeBattlegroundLayer)) {
			activeBattlegroundLayer = available[0];
		}

		applyBattlegroundLayerVisualState();
	};

	const cycleBattlegroundLayer = () => {
		if (options.context !== "battleground") {
			return;
		}

		const available = getAvailableBattlegroundLayers();
		if (available.length === 0) {
			return;
		}

		const currentIndex = available.indexOf(activeBattlegroundLayer);
		const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % available.length;
		activeBattlegroundLayer = available[nextIndex];
		applyBattlegroundLayerVisualState();
	};

	const executeIntent = async (intent: ControlIntent) => {
		normalizeBattlegroundLayer();

		switch (intent.type) {
			case "navigateButtons":
				if (options.context === "battleground") {
					activeBattlegroundLayer = "buttons";
					applyBattlegroundLayerVisualState();
				}
				focusNextSceneButton(scene, intent.direction);
				return;
			case "navigateBoard":
				if (options.context === "battleground") {
					logDebug("navigateBoard intent", {
						direction: intent.direction,
						activeBattlegroundLayer,
						boardCanInteract: boardCursor?.canInteract() ?? false,
						boardCursorX: boardCursor?.getState().cursor.x,
						hasEncounterTargets: hasEncounterFocusTargets(),
						hasFocusedEncounter: hasFocusedEncounterTarget(),
						hasFocusedButton: hasFocusedSceneButton(scene),
					});

					if (
						intent.direction === "right" &&
						boardCursor?.canInteract() &&
						boardCursor.getState().cursor.x === 2 &&
						hasEncounterFocusTargets()
					) {
						activeBattlegroundLayer = "encounter";
						applyBattlegroundLayerVisualState();
						const focused = hasFocusedEncounterTarget();
						logDebug("right-edge handoff: board -> encounter", {
							focused,
							encounterIndex: getFocusedEncounterIndex(),
						});
						return;
					}

					switch (activeBattlegroundLayer) {
						case "buttons":
							if (hasNavigableButtons(scene)) {
								const focusedButtonText = getFocusedSceneButtonText(scene);
								if (
									intent.direction === "down" &&
									focusedButtonText &&
									normalizeLabel(focusedButtonText) === normalizeLabel(menuButtonLabel) &&
									hasEncounterFocusTargets()
								) {
									activeBattlegroundLayer = "encounter";
									applyBattlegroundLayerVisualState();
									return;
								}

								focusNextSceneButton(scene, intent.direction);
								return;
							}
							break;
						case "encounter":
							if (hasEncounterFocusTargets()) {
								const focusedEncounterIndex = getFocusedEncounterIndex();
								const encounterCount = getEncounterFocusCount();

								if (focusedEncounterIndex !== null && encounterCount > 0) {
									if (intent.direction === "up" && focusedEncounterIndex === 0) {
										activeBattlegroundLayer = "buttons";
										applyBattlegroundLayerVisualState();
										logDebug("edge handoff: encounter(top) -> menu button", {
											focusedEncounterIndex,
										});
										if (!focusSceneButtonByText(scene, menuButtonLabel)) {
											focusNextSceneButton(scene, "up");
										}
										return;
									}

									if (intent.direction === "down" && focusedEncounterIndex === encounterCount - 1) {
										logDebug("edge handoff: encounter(bottom) -> skip button", {
											focusedEncounterIndex,
											hasSkipButton: hasSceneButtonByText(scene, skipEncounterLabel),
										});

										if (focusSceneButtonByText(scene, skipEncounterLabel)) {
											activeBattlegroundLayer = "buttons";
											applyBattlegroundLayerVisualState();
										}
										return;
									}
								}

								logDebug("encounter navigation", {
									direction: intent.direction,
									beforeIndex: focusedEncounterIndex,
								});
								navigateEncounterFocus(intent.direction);
								logDebug("encounter navigation applied", {
									afterIndex: getFocusedEncounterIndex(),
								});
								return;
							}
							break;
						case "board":
							if (boardCursor?.canInteract()) {
								if (
									intent.direction === "right" &&
									boardCursor.getState().cursor.x === 2 &&
									hasEncounterFocusTargets()
								) {
									activeBattlegroundLayer = "encounter";
									applyBattlegroundLayerVisualState();
									return;
								}

								boardCursor.move(intent.direction);
								return;
							}
							break;
					}
				}
				boardCursor?.move(intent.direction);
				return;
			case "cycleLayer":
				cycleBattlegroundLayer();
				return;
			case "confirm":
				if (options.context === "battleground") {
					switch (activeBattlegroundLayer) {
						case "buttons":
							if (hasFocusedSceneButton(scene) && activateFocusedSceneButton(scene)) {
								return;
							}
							break;
						case "encounter":
							if (await confirmEncounterFocus()) {
								return;
							}
							break;
						case "board":
							if (boardCursor?.confirm()) {
								return;
							}
							break;
					}

					if (hasFocusedSceneButton(scene) && activateFocusedSceneButton(scene)) {
						return;
					}
					if (await confirmEncounterFocus()) {
						return;
					}
					boardCursor?.confirm();
					return;
				}

				if (hasFocusedSceneButton(scene)) {
					activateFocusedSceneButton(scene);
				}
				return;
			case "cancel":
				if (options.context === "battleground" && activeBattlegroundLayer === "buttons") {
					clearSceneButtonFocus(scene);
					activeBattlegroundLayer = "board";
					applyBattlegroundLayerVisualState();
					return;
				}
				if (boardCursor?.cancel()) {
					return;
				}
				options.onCancel?.();
				return;
			case "shortcut":
				await executeShortcutAction(intent);
		}
	};

	const onKeyDown = async (event: KeyboardEvent) => {
		if (event.repeat || shouldIgnoreShortcutEvent(event)) {
			return;
		}

		const intents = resolveKeyboardIntents(options.context, getState(), event.key);
		if (intents.length === 0) {
			return;
		}

		logDebug("keyboard intents resolved", {
			key: event.key,
			intents,
		});

		event.preventDefault();
		for (const intent of intents) {
			await executeIntent(intent);
		}
	};

	keyboard?.on("keydown", onKeyDown);

	const onUpdate = async () => {
		normalizeBattlegroundLayer();
		boardCursor?.refresh();

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

		if (intents.length > 0) {
			logDebug("gamepad intents resolved", { intents });
		}

		for (const intent of intents) {
			await executeIntent(intent);
		}
	};

	scene.events.on(Phaser.Scenes.Events.UPDATE, onUpdate);
	scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
		keyboard?.off("keydown", onKeyDown);
		scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate);
		boardCursor?.destroy();
		clearSceneButtonFocus(scene);
	});
}
