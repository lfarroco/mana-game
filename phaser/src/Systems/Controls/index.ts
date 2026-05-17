import Phaser from "phaser";
import { GAME_CONFIG } from "@config";
import { getGameController } from "@Core/GameControllerFactory";
import { getState } from "@Models/State";
import * as Board from "@Models/Board";
import { getCharaById } from "@Systems/Chara/Chara";
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
	focusEncounterIndex,
	getEncounterFocusCount,
	getFocusedEncounterIndex,
	hasFocusedEncounterTarget,
	hasEncounterFocusTargets,
	navigateEncounterFocus,
	startEncounterFocusHoldAction,
	updateEncounterFocusHoldAction,
	releaseEncounterFocusHoldAction,
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
	if (!GAME_CONFIG.ENABLE_CONTROLLER_SUPPORT) {
		return;
	}

	const keyboard = scene.input.keyboard;
	let previousGamepadSnapshot: GamepadSnapshot | undefined;
	let gamepadDragHoldState:
		| {
			initialCursor: Vec2;
			hasMovedCursor: boolean;
		}
		| undefined;
	let keyboardDragHoldState:
		| {
			initialCursor: Vec2;
			hasMovedCursor: boolean;
		}
		| undefined;
	let keyboardEncounterHoldActive = false;
	let boardHoldVisualState:
		| {
			unitId: string;
			origin: Vec2;
		}
		| undefined;
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
			applyBattlegroundLayerVisualState();
		}
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
		const isBoardDragHoldActive = Boolean(keyboardDragHoldState || gamepadDragHoldState);

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
						hasEncounterFocusTargets() &&
						!isBoardDragHoldActive
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
									intent.direction === "up" &&
									focusedButtonText &&
									normalizeLabel(focusedButtonText) === normalizeLabel(skipEncounterLabel) &&
									hasEncounterFocusTargets()
								) {
									activeBattlegroundLayer = "encounter";
									applyBattlegroundLayerVisualState();
									focusEncounterIndex(getEncounterFocusCount() - 1);
									return;
								}

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

								if (intent.direction === "left" && boardCursor?.canInteract()) {
									activeBattlegroundLayer = "board";
									applyBattlegroundLayerVisualState();
									boardCursor.moveToRightmostColumn();
									logDebug("edge handoff: encounter(left) -> board rightmost column", {
										focusedEncounterIndex,
										boardCursorX: boardCursor.getState().cursor.x,
										boardCursorY: boardCursor.getState().cursor.y,
									});
									return;
								}

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
									hasEncounterFocusTargets() &&
									!isBoardDragHoldActive
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

	const getBoardCursorTilePosition = (tile: Vec2): Vec2 => {
		const position = Board.getSlotPosition(tile.y * 3 + tile.x, true);
		return { x: position.x, y: position.y };
	};

	const resetBoardHoldVisual = () => {
		if (!boardHoldVisualState) {
			return;
		}

		try {
			const chara = getCharaById(boardHoldVisualState.unitId);
			chara.setAngle(0);
			chara.setPosition(boardHoldVisualState.origin.x, boardHoldVisualState.origin.y);
		} catch {
			// Ignore transient lifecycle race where chara was already destroyed.
		}

		boardHoldVisualState = undefined;
	};

	const updateBoardHoldVisual = () => {
		if (!boardCursor?.canInteract()) {
			resetBoardHoldVisual();
			return;
		}

		const boardState = boardCursor.getState();
		const isHoldActive = Boolean(keyboardDragHoldState || gamepadDragHoldState);
		if (!isHoldActive || !boardState.selectedUnitId) {
			resetBoardHoldVisual();
			return;
		}

		const selectedUnitId = boardState.selectedUnitId;
		try {
			const selectedChara = getCharaById(selectedUnitId);
			if (!boardHoldVisualState || boardHoldVisualState.unitId !== selectedUnitId) {
				boardHoldVisualState = {
					unitId: selectedUnitId,
					origin: { x: selectedChara.x, y: selectedChara.y },
				};
				scene.children.bringToTop(selectedChara);
			}

			const tilePosition = getBoardCursorTilePosition(boardState.cursor);
			selectedChara.setPosition(tilePosition.x, tilePosition.y);
			selectedChara.setAngle(-8);
		} catch {
			resetBoardHoldVisual();
		}
	};

	const onKeyDown = async (event: KeyboardEvent) => {
		if (event.repeat || shouldIgnoreShortcutEvent(event)) {
			return;
		}

		if (
			event.key === "Enter" &&
			options.context === "battleground" &&
			activeBattlegroundLayer === "encounter"
		) {
			const started = await startEncounterFocusHoldAction();
			if (started) {
				keyboardEncounterHoldActive = true;
				event.preventDefault();
				return;
			}
		}

		const shouldTrackKeyboardDragHold =
			event.key === "Enter" &&
			options.context === "battleground" &&
			activeBattlegroundLayer === "board" &&
			boardCursor?.canInteract();
		const wasBoardUnitSelected = shouldTrackKeyboardDragHold
			? Boolean(boardCursor?.getState().selectedUnitId)
			: false;

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
			const cursorBefore = boardCursor?.getState().cursor;
			await executeIntent(intent);
			if (intent.type === "navigateBoard" && keyboardDragHoldState && boardCursor && cursorBefore) {
				const cursorAfter = boardCursor.getState().cursor;
				if (
					cursorAfter.x !== keyboardDragHoldState.initialCursor.x ||
					cursorAfter.y !== keyboardDragHoldState.initialCursor.y
				) {
					keyboardDragHoldState.hasMovedCursor = true;
				}
			}
		}

		if (shouldTrackKeyboardDragHold && !wasBoardUnitSelected && boardCursor) {
			const boardState = boardCursor.getState();
			if (boardState.selectedUnitId) {
				keyboardDragHoldState = {
					initialCursor: { ...boardState.cursor },
					hasMovedCursor: false,
				};
			}
		}
	};

	const onKeyUp = async (event: KeyboardEvent) => {
		if (event.key === "Enter" && keyboardEncounterHoldActive && options.context === "battleground") {
			event.preventDefault();
			const boardTile =
				activeBattlegroundLayer === "board" && boardCursor?.canInteract()
					? boardCursor.getState().cursor
					: null;
			await releaseEncounterFocusHoldAction({ boardTile });
			keyboardEncounterHoldActive = false;
			return;
		}

		if (
			event.key !== "Enter" ||
			!keyboardDragHoldState ||
			options.context !== "battleground" ||
			activeBattlegroundLayer !== "board" ||
			!boardCursor?.canInteract()
		) {
			return;
		}

		event.preventDefault();
		const boardState = boardCursor.getState();
		if (keyboardDragHoldState.hasMovedCursor && boardState.selectedUnitId) {
			resetBoardHoldVisual();
			boardCursor.confirm();
		} else {
			resetBoardHoldVisual();
		}
		keyboardDragHoldState = undefined;
	};

	keyboard?.on("keydown", onKeyDown);
	keyboard?.on("keyup", onKeyUp);

	const onUpdate = async () => {
		normalizeBattlegroundLayer();
		boardCursor?.refresh();

		if (keyboardEncounterHoldActive) {
			const boardTile =
				activeBattlegroundLayer === "board" && boardCursor?.canInteract()
					? boardCursor.getState().cursor
					: null;
			await updateEncounterFocusHoldAction({ boardTile });
		}
		updateBoardHoldVisual();

		const snapshot = getGamepadSnapshot(scene);
		if (!snapshot) {
			gamepadDragHoldState = undefined;
			previousGamepadSnapshot = undefined;
			return;
		}

		let skipConfirmIntent = false;
		if (options.context === "battleground" && boardCursor?.canInteract()) {
			const wasActionPressed = previousGamepadSnapshot?.buttons[0] ?? false;
			const isActionPressed = snapshot.buttons[0] ?? false;

			if (isActionPressed && !wasActionPressed && activeBattlegroundLayer === "board") {
				const boardState = boardCursor.getState();
				if (!boardState.selectedUnitId && boardCursor.confirm()) {
					const nextBoardState = boardCursor.getState();
					if (nextBoardState.selectedUnitId) {
						gamepadDragHoldState = {
							initialCursor: { ...nextBoardState.cursor },
							hasMovedCursor: false,
						};
						skipConfirmIntent = true;
					}
				}
			}

			if (isActionPressed && gamepadDragHoldState) {
				const cursor = boardCursor.getState().cursor;
				if (
					cursor.x !== gamepadDragHoldState.initialCursor.x ||
					cursor.y !== gamepadDragHoldState.initialCursor.y
				) {
					gamepadDragHoldState.hasMovedCursor = true;
				}
			}

			if (!isActionPressed && wasActionPressed && gamepadDragHoldState) {
				const boardState = boardCursor.getState();
				if (gamepadDragHoldState.hasMovedCursor && boardState.selectedUnitId) {
					resetBoardHoldVisual();
					boardCursor.confirm();
				} else {
					resetBoardHoldVisual();
				}
				gamepadDragHoldState = undefined;
			}
		}

		const intents = resolveGamepadIntents(
			options.context,
			getState(),
			snapshot,
			previousGamepadSnapshot
		);
		previousGamepadSnapshot = snapshot;
		const filteredIntents =
			skipConfirmIntent && gamepadDragHoldState
				? intents.filter((intent) => intent.type !== "confirm")
				: intents;

		if (filteredIntents.length > 0) {
			logDebug("gamepad intents resolved", { intents: filteredIntents });
		}

		for (const intent of filteredIntents) {
			await executeIntent(intent);
			if (
				intent.type === "navigateBoard" &&
				activeBattlegroundLayer === "board" &&
				keyboardDragHoldState &&
				boardCursor
			) {
				const cursor = boardCursor.getState().cursor;
				if (
					cursor.x !== keyboardDragHoldState.initialCursor.x ||
					cursor.y !== keyboardDragHoldState.initialCursor.y
				) {
					keyboardDragHoldState.hasMovedCursor = true;
				}
			}
		}
	};

	scene.events.on(Phaser.Scenes.Events.UPDATE, onUpdate);
	scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
		keyboard?.off("keydown", onKeyDown);
		keyboard?.off("keyup", onKeyUp);
		scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate);
		resetBoardHoldVisual();
		boardCursor?.destroy();
		clearSceneButtonFocus(scene);
	});
}
