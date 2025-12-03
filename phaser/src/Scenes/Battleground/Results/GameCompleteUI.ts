import { createUIButton } from "../../../Components/UIButton";
import * as c from "@Constants/constants";
import { size, vec2 } from "@Models/Geometry";
import { getCurrentScene, resetState } from "@Models/State";
import * as Chara from "@Systems/Chara/Chara";
import { Unit } from "@Models/Entities/Unit";
import { playMusic } from "@Systems/AudioManager";
import * as AchievementSystem from "@Systems/AchievementSystem";
import { deleteSavedData } from "../../../Game/effects/deleteSavedData";
import {
	getVictoryTier,
	END_GAME_MESSAGES,
	INFINITE_MODE_THRESHOLD,
	RESULTS_FONT_SIZES,
	RESULTS_PANEL
} from "./ResultsConfig";
import * as io from "@PhaserIO";
import { createCombatStatsPanels } from "./CombatStatsTable";

export async function displayGameComplete(
	wins: number,
	units: Unit[],
	isGameOver: boolean,
	nextPhaseCallback?: () => void
): Promise<Phaser.GameObjects.Container> {
	deleteSavedData();

	playMusic("music_playmode", true, 1000);

	// Panel dimensions and positioning
	const panelWidth = 800;
	const panelHeight = 700;
	const panelX = c.MIDDLE_SCREEN_X + 400;
	const panelY = c.MIDDLE_SCREEN_Y;

	const { message, color } = getVictoryTier(wins, isGameOver);

	const playerCore = units.find((unit) => unit.isCore);
	if (playerCore && wins >= 5) {
		AchievementSystem.checkVictoryAchievements(wins, playerCore.cardId);
	}

	const subtitleText = (isGameOver && wins > INFINITE_MODE_THRESHOLD)
		? END_GAME_MESSAGES.infinite(wins)
		: END_GAME_MESSAGES.standard;

	// Render units first
	for (const unit of units) {
		await Chara.summon(unit);
	}

	// Button definitions
	const buttonDefinitions: Array<[string, () => Promise<void>]> = [
		[
			"NEW RUN",
			async () => {
				resetState();
				getCurrentScene().scene.restart();
			}
		],
		[
			"MAIN MENU",
			async () => {
				resetState();
				getCurrentScene().game.scene.start(c.SCENE_KEYS.TITLE);
			}
		]
	];

	if (wins >= INFINITE_MODE_THRESHOLD && nextPhaseCallback && !isGameOver) {
		buttonDefinitions.push([
			"INFINITE MODE",
			async () => {
				const { slideOut } = await import("./ResultsUI");
				await slideOut();
				() => { }
			}
		]);
	}

	// Map button definitions to containers
	const buttons = buttonDefinitions.map(
		([label, callback], i) =>
			createUIButton(
				label,
				vec2(panelX, panelY + 50 + i * 100),
				callback
			).container
	);

	// Create combat stats panels
	const { playerPanel, cpuPanel } = createCombatStatsPanels(units, panelX, panelY);

	// Create container with all elements
	const container = io.Container([
		io.BorderedRoundRect(
			vec2(panelX, panelY),
			size(panelWidth, panelHeight),
			RESULTS_PANEL.borderRadius,
			RESULTS_PANEL.backgroundColor,
			RESULTS_PANEL.backgroundAlpha
		),
		[
			() => io.Text(`${wins} Wins`, {
				...c.titleTextConfig,
				fontSize: RESULTS_FONT_SIZES.titleExtraLarge,
				color: "#FFFFFF",
			}),
			(text) => io.SetPosition(text, vec2(panelX, panelY - 250)),
			(text) => io.Centralize(text),
		],
		[
			() => io.Title1(message).setColor(color),
			(title) => io.SetPosition(title, vec2(panelX, panelY - 150)),
			(title) => io.Centralize(title),
		],
		[
			() => io.Label(subtitleText),
			(label) => io.SetPosition(label, vec2(panelX, panelY - 50)),
			(label) => io.Centralize(label),
		],
		playerPanel,
		cpuPanel,
		...buttons,
	]);

	return container;
}
