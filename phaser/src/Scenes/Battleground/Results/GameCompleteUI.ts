
import { createUIButton } from "../../../Components/UIButton";
import * as c from "@Constants/constants";
import { ResultsUIState } from "./ResultsUI";
import { vec2 } from "@Models/Geometry";
import { getCurrentScene, resetState } from "@Models/State";
import * as Chara from "@Systems/Chara/Chara";
import { Unit } from "@Models/Entities/Unit";

export function displayGameComplete(
	state: ResultsUIState,
	wins: number,
	units: Unit[]
): void {
	// Create a semi-transparent background to make text readable but keep board visible
	if (state.backgroundOverlay) {
		state.backgroundOverlay.destroy();
	}
	state.backgroundOverlay = getCurrentScene().add.rectangle(
		c.SCREEN_WIDTH / 2,
		c.SCREEN_HEIGHT / 2,
		c.SCREEN_WIDTH,
		c.SCREEN_HEIGHT,
		0x000000,
		0.7 // 70% opacity black
	);
	state.backgroundOverlay.setInteractive();
	state.backgroundOverlay.setDepth(1000);

	const centerX = c.SCREEN_WIDTH / 2;
	const centerY = c.SCREEN_HEIGHT / 2;

	// 1. Display "X Wins"
	const winsText = getCurrentScene().add
		.text(centerX, centerY - 150, `${wins} Wins`, {
			...c.titleTextConfig,
			fontSize: "64px",
			color: "#FFFFFF",
		})
		.setOrigin(0.5);
	state.resultsContainer.add(winsText);

	// 2. Determine Victory Message
	let message = "";
	let color = "#FFFFFF";

	if (wins >= 10) {
		message = "Gold Victory";
		color = "#FFD700"; // Gold
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

	const messageText = getCurrentScene().add
		.text(centerX, centerY, message, {
			...c.titleTextConfig,
			fontSize: "48px",
			color: color,
		})
		.setOrigin(0.5);
	state.resultsContainer.add(messageText);

	// 3. Continue Button
	const continueButton = createUIButton(
		"Continue",
		vec2(centerX, centerY + 150),
		async () => {
			resetState();
			getCurrentScene().game.scene.start(c.SCENE_KEYS.TITLE);
		}
	);
	state.resultsContainer.add(continueButton.container);

	renderBoard(state, units);
}

async function renderBoard(state: ResultsUIState, units: Unit[]): Promise<void> {
	for (const unit of units) {
		// Create the full Chara component with all its visual elements
		const chara = await Chara.summon(unit);
		state.resultsContainer.add(chara);
	}
}
