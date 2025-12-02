
import { createUIButton } from "../../../Components/UIButton";
import * as c from "@Constants/constants";
import { ResultsUIState } from "./ResultsUI";
import { vec2 } from "@Models/Geometry";
import { getCurrentScene, resetState } from "@Models/State";
import * as Chara from "@Systems/Chara/Chara";
import { Unit } from "@Models/Entities/Unit";
import { playMusic } from "@Systems/AudioManager";
import * as AchievementSystem from "@Systems/AchievementSystem";
import { deleteSavedData } from "../../../Game/effects/deleteSavedData";

export async function displayGameComplete(
	state: ResultsUIState,
	wins: number,
	units: Unit[],
	isGameOver: boolean,
	nextPhaseCallback?: () => void
): Promise<void> {
	deleteSavedData();

	playMusic("music_playmode", true, 1000);

	if (state.backgroundOverlay) {
		state.backgroundOverlay.destroy();
	}
	state.backgroundOverlay = getCurrentScene().add.rectangle(
		c.SCREEN_WIDTH / 2,
		c.SCREEN_HEIGHT / 2,
		c.SCREEN_WIDTH,
		c.SCREEN_HEIGHT,
		0x000000,
		0.7
	);
	state.backgroundOverlay.setInteractive();
	state.backgroundOverlay.setDepth(1000);

	const baseX = c.MIDDLE_SCREEN_X + 400;
	const centerY = c.MIDDLE_SCREEN_Y;

	const winsText = getCurrentScene().add
		.text(baseX, centerY - 150, `${wins} Wins`, {
			...c.titleTextConfig,
			fontSize: "64px",
			color: "#FFFFFF",
		})
		.setOrigin(0.5);
	state.resultsContainer.add(winsText);

	let message = "";
	let color = "#FFFFFF";

	if (wins >= 10) {
		if (isGameOver) {
			message = "Run Complete";
			color = "#F44336";
		} else {
			message = "Gold Victory";
			color = "#FFD700"; // Gold
		}
	} else if (wins >= 8) {
		message = "Silver Victory";
		color = "#C0C0C0"; // Silver
	} else if (wins >= 5) {
		message = "Bronze Victory";
		color = "#CD7F32"; // Bronze
	} else {
		message = "Better luck next time!";
		color = "#FFFFFF"; // White
	}

	const playerCore = units.find((unit) => unit.isCore);
	if (playerCore && wins >= 5) {
		AchievementSystem.checkVictoryAchievements(wins, playerCore.cardId);
	}

	const messageText = getCurrentScene().add
		.text(baseX, centerY, message, {
			...c.titleTextConfig,
			color,
		})
		.setOrigin(0.5);
	state.resultsContainer.add(messageText);

	let subtitleText = "Thanks for playing! Come back for more updates!";
	if (isGameOver && wins > 10) {
		subtitleText = `You defeated ${wins} teams in your journey, great job!`;
	}

	const subtitle = getCurrentScene().add
		.text(baseX, centerY + 100,
			subtitleText,
			{
				...c.titleTextConfig,
				fontSize: "24px",
			})
		.setOrigin(0.5);
	state.resultsContainer.add(subtitle);

	const continueButton = createUIButton(
		"Continue",
		vec2(baseX, centerY + 250),
		async () => {
			resetState();
			getCurrentScene().game.scene.start(c.SCENE_KEYS.TITLE);
		}
	);
	continueButton.disable();
	state.resultsContainer.add(continueButton.container);

	if (wins >= 10 && nextPhaseCallback && !isGameOver) {
		const infiniteButton = createUIButton(
			"Infinite Mode",
			vec2(baseX, centerY + 350),
			async () => {
				const { slideOut } = await import("./ResultsUI");
				await slideOut();
				nextPhaseCallback();
			}
		);
		state.resultsContainer.add(infiniteButton.container);
	}

	await renderBoard(state, units);

	continueButton.enable();
}

async function renderBoard(state: ResultsUIState, units: Unit[]): Promise<void> {
	for (const unit of units) {
		const chara = await Chara.summon(unit);
		state.resultsContainer.add(chara);
	}
}
