import { createUIButton } from "../../../Components/UIButton";
import * as c from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
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

export async function displayGameComplete(
	wins: number,
	units: Unit[],
	isGameOver: boolean,
	nextPhaseCallback?: () => void
): Promise<void> {
	deleteSavedData();

	playMusic("music_playmode", true, 1000);

	const backgroundOverlay = getCurrentScene().add.rectangle(
		c.SCREEN_WIDTH / 2,
		c.SCREEN_HEIGHT / 2,
		c.SCREEN_WIDTH,
		c.SCREEN_HEIGHT,
		RESULTS_PANEL.overlayColor,
		RESULTS_PANEL.overlayAlpha
	);
	backgroundOverlay.setInteractive();

	const baseX = c.MIDDLE_SCREEN_X + 400;
	const centerY = c.MIDDLE_SCREEN_Y;

	getCurrentScene().add
		.text(baseX, centerY - 150, `${wins} Wins`, {
			...c.titleTextConfig,
			fontSize: RESULTS_FONT_SIZES.titleExtraLarge,
			color: "#FFFFFF",
		})
		.setOrigin(0.5);
	const { message, color } = getVictoryTier(wins, isGameOver);

	const playerCore = units.find((unit) => unit.isCore);
	if (playerCore && wins >= 5) {
		AchievementSystem.checkVictoryAchievements(wins, playerCore.cardId);
	}

	io.Title1(message)
		.setColor(color)
		.setPosition(baseX, centerY)
		.setOrigin(0.5);

	const subtitleText = (isGameOver && wins > INFINITE_MODE_THRESHOLD)
		? END_GAME_MESSAGES.infinite(wins)
		: END_GAME_MESSAGES.standard;

	io.Label(subtitleText)
		.setPosition(baseX, centerY + 100)
		.setOrigin(0.5);

	for (const unit of units) {
		await Chara.summon(unit);
	}

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
				nextPhaseCallback();
			}
		]);
	}

	buttonDefinitions.map(
		([label, callback], i) =>
			createUIButton(
				label,
				vec2(baseX, centerY + 250 + i * 100),
				callback
			)
	);

}
