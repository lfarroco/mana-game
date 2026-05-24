import Phaser from "phaser";
import * as Config from "@config";
import * as GameController from "@Core/GameController";
import * as Board from "@Models/Board";
import * as Chara from "@Systems/Chara/Chara";
import * as UIButton from "@Components/UIButton";
import * as BoardCursor from "@Systems/Controls/boardCursor";
import * as Encounter from "@Systems/Encounter";
import * as i18n from "@i18n/i18n";
import * as OptionsStore from "@Models/OptionsStore";
import * as Logger from "@Utils/Logger";
import * as Intents from "@Systems/Controls/intents";
import * as io from "@PhaserIO";

type InitOptions = {
	context: Intents.ControlContext;
	onCancel?: () => void;
};

type BattlegroundLayer = "board" | "encounter" | "buttons";

const logger = Logger.createLogger("Controls");

const getGamepadSnapshot = (scene: Phaser.Scene): Intents.GamepadSnapshot | null => {
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

const executeShortcutAction = async (action: Intents.ControlIntent & { type: "shortcut" }) => {
	switch (action.action.type) {
		case "skipPhase":
			await GameController.skipPhase();
			break;
		case "purchaseUnit":
			await GameController.purchaseUnit(action.action.optionId);
			break;
		case "selectEncounter":
			await GameController.selectEncounter(action.action.optionId);
			break;
		case "handleAction":
			await GameController.handleAction(action.action.optionId);
			break;
	}
};

export function init(options: InitOptions) {

	if (!Config.GAME_CONFIG.ENABLE_CONTROLLER_SUPPORT) {
		return;
	}

	const keyboard = io.scene.input.keyboard;
	let previousGamepadSnapshot: Intents.GamepadSnapshot | undefined;
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
		options.context === "battleground" ? BoardCursor.createBoardCursorController(io.scene) : null;
	let activeBattlegroundLayer: BattlegroundLayer = "board";
	const menuButtonLabel = i18n.t("ui.menu.button");
	const skipEncounterLabel = i18n.t("encounters.skip");
	const normalizeLabel = (label: string): string => label.trim().toLowerCase();
	const isInputDebugEnabled = (): boolean => {
		const optionDebug = OptionsStore.getOption("debug", false);
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

	if (options.context === "buttons" && UIButton.hasNavigableButtons(io.scene)) {
		UIButton.focusNextSceneButton(io.scene, "down");
	}

	const getAvailableBattlegroundLayers = (): BattlegroundLayer[] => {
		if (options.context !== "battleground") {
			return [];
		}

		const layers: BattlegroundLayer[] = [];
		if (boardCursor?.canInteract()) {
			layers.push("board");
		}
		if (Encounter.hasEncounterFocusTargets()) {
			layers.push("encounter");
		}
		if (UIButton.hasNavigableButtons(io.scene)) {
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
				Encounter.blurEncounterFocus();
				if (!UIButton.hasFocusedSceneButton(io.scene)) {
					UIButton.focusNextSceneButton(io.scene, "down");
				}
				return;
			case "encounter":
				UIButton.clearSceneButtonFocus(io.scene);
				Encounter.ensureEncounterFocus();
				return;
			case "board":
			default:
				UIButton.clearSceneButtonFocus(io.scene);
				Encounter.blurEncounterFocus();
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

	const executeIntent = async (intent: Intents.ControlIntent) => {
		normalizeBattlegroundLayer();
		const isBoardDragHoldActive = Boolean(keyboardDragHoldState || gamepadDragHoldState);

		switch (intent.type) {
			case "navigateButtons":
				if (options.context === "battleground") {
					activeBattlegroundLayer = "buttons";
					applyBattlegroundLayerVisualState();
				}
				UIButton.focusNextSceneButton(io.scene, intent.direction);
				return;
			case "navigateBoard":
				if (options.context === "battleground") {
					logDebug("navigateBoard intent", {
						direction: intent.direction,
						activeBattlegroundLayer,
						boardCanInteract: boardCursor?.canInteract() ?? false,
						boardCursorX: boardCursor?.getState().cursor.x,
						hasEncounterTargets: Encounter.hasEncounterFocusTargets(),
						hasFocusedEncounter: Encounter.hasFocusedEncounterTarget(),
						hasFocusedButton: UIButton.hasFocusedSceneButton(io.scene),
					});

					if (
						intent.direction === "right" &&
						boardCursor?.canInteract() &&
						boardCursor.getState().cursor.x === 2 &&
						Encounter.hasEncounterFocusTargets() &&
						!isBoardDragHoldActive
					) {
						activeBattlegroundLayer = "encounter";
						applyBattlegroundLayerVisualState();
						const focused = Encounter.hasFocusedEncounterTarget();
						logDebug("right-edge handoff: board -> encounter", {
							focused,
							encounterIndex: Encounter.getFocusedEncounterIndex(),
						});
						return;
					}

					switch (activeBattlegroundLayer) {
						case "buttons":
							if (UIButton.hasNavigableButtons(io.scene)) {
								const focusedButtonText = UIButton.getFocusedSceneButtonText(io.scene);
								if (
									intent.direction === "up" &&
									focusedButtonText &&
									normalizeLabel(focusedButtonText) === normalizeLabel(skipEncounterLabel) &&
									Encounter.hasEncounterFocusTargets()
								) {
									activeBattlegroundLayer = "encounter";
									applyBattlegroundLayerVisualState();
									Encounter.focusEncounterIndex(Encounter.getEncounterFocusCount() - 1);
									return;
								}

								if (
									intent.direction === "down" &&
									focusedButtonText &&
									normalizeLabel(focusedButtonText) === normalizeLabel(menuButtonLabel) &&
									Encounter.hasEncounterFocusTargets()
								) {
									activeBattlegroundLayer = "encounter";
									applyBattlegroundLayerVisualState();
									return;
								}

								UIButton.focusNextSceneButton(io.scene, intent.direction);
								return;
							}
							break;
						case "encounter":
							if (Encounter.hasEncounterFocusTargets()) {
								const focusedEncounterIndex = Encounter.getFocusedEncounterIndex();
								const encounterCount = Encounter.getEncounterFocusCount();

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
										if (!UIButton.focusSceneButtonByText(io.scene, menuButtonLabel)) {
											UIButton.focusNextSceneButton(io.scene, "up");
										}
										return;
									}

									if (intent.direction === "down" && focusedEncounterIndex === encounterCount - 1) {
										logDebug("edge handoff: encounter(bottom) -> skip button", {
											focusedEncounterIndex,
											hasSkipButton: UIButton.hasSceneButtonByText(io.scene, skipEncounterLabel),
										});

										if (UIButton.focusSceneButtonByText(io.scene, skipEncounterLabel)) {
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
								Encounter.navigateEncounterFocus(intent.direction);
								logDebug("encounter navigation applied", {
									afterIndex: Encounter.getFocusedEncounterIndex(),
								});
								return;
							}
							break;
						case "board":
							if (boardCursor?.canInteract()) {
								if (
									intent.direction === "right" &&
									boardCursor.getState().cursor.x === 2 &&
									Encounter.hasEncounterFocusTargets() &&
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
							if (UIButton.hasFocusedSceneButton(io.scene) && UIButton.activateFocusedSceneButton(io.scene)) {
								return;
							}
							break;
						case "encounter":
							if (await Encounter.confirmEncounterFocus()) {
								return;
							}
							break;
						case "board":
							if (boardCursor?.confirm()) {
								return;
							}
							break;
					}

					if (UIButton.hasFocusedSceneButton(io.scene) && UIButton.activateFocusedSceneButton(io.scene)) {
						return;
					}
					if (await Encounter.confirmEncounterFocus()) {
						return;
					}
					boardCursor?.confirm();
					return;
				}

				if (UIButton.hasFocusedSceneButton(io.scene)) {
					UIButton.activateFocusedSceneButton(io.scene);
				}
				return;
			case "cancel":
				if (options.context === "battleground" && activeBattlegroundLayer === "buttons") {
					UIButton.clearSceneButtonFocus(io.scene);
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
			const chara = Chara.getCharaById(boardHoldVisualState.unitId);
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
			const selectedChara = Chara.getCharaById(selectedUnitId);
			if (!boardHoldVisualState || boardHoldVisualState.unitId !== selectedUnitId) {
				boardHoldVisualState = {
					unitId: selectedUnitId,
					origin: { x: selectedChara.x, y: selectedChara.y },
				};
				io.scene.children.bringToTop(selectedChara);
			}

			const tilePosition = getBoardCursorTilePosition(boardState.cursor);
			selectedChara.setPosition(tilePosition.x, tilePosition.y);
			selectedChara.setAngle(-8);
		} catch {
			resetBoardHoldVisual();
		}
	};

	const onKeyDown = async (event: KeyboardEvent) => {
		if (event.repeat || Intents.shouldIgnoreShortcutEvent(event)) {
			return;
		}

		if (
			event.key === "Enter" &&
			options.context === "battleground" &&
			activeBattlegroundLayer === "encounter"
		) {
			const started = await Encounter.startEncounterFocusHoldAction();
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

		const intents = Intents.resolveKeyboardIntents(options.context, state, event.key);
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
			await Encounter.releaseEncounterFocusHoldAction({ boardTile });
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
			await Encounter.updateEncounterFocusHoldAction({ boardTile });
		}
		updateBoardHoldVisual();

		const snapshot = getGamepadSnapshot(io.scene);
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

		const intents = Intents.resolveGamepadIntents(
			options.context,
			state,
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

	io.scene.events.on(Phaser.Scenes.Events.UPDATE, onUpdate);
	io.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
		keyboard?.off("keydown", onKeyDown);
		keyboard?.off("keyup", onKeyUp);
		io.scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate);
		resetBoardHoldVisual();
		boardCursor?.destroy();
		UIButton.clearSceneButtonFocus(io.scene);
	});
}
