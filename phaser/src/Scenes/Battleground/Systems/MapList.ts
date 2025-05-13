import { Adventure, adventures } from "../../../Models/Adventure";
import { getState } from "../../../Models/State";
import { create, Flyout } from "../../../Systems/Flyout";
import { defaultTextConfig, SCREEN_HEIGHT, SCREEN_WIDTH } from "../constants";
import * as ProgressBar from "./ProgressBar";
import { createButton } from "./UIManager";
import { runAdventure } from "./WaveManager";

export async function renderMapButton(scene: Phaser.Scene) {

	console.log("renderMapButton");

	const flyout = await create(scene, "World Map")
	const container = scene.add.container(0, 0);
	flyout.add(container);

	scene.add.image(
		...[

			SCREEN_WIDTH - 120,
			SCREEN_HEIGHT - 330
		],
		"icon/map")
		.setOrigin(0.5)
		.setDisplaySize(230, 230)
		.setInteractive()
		.on("pointerup", () => handleButtonClicked(container, flyout)());

}

const handleButtonClicked = (container: Container, flyout: Flyout) => async () => {

	if (flyout.isOpen) {
		await flyout.slideOut();
		return;
	}

	render(container.scene, container, flyout);

	await flyout.slideIn();
}

export function render(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, flyout: Flyout) {

	console.log("renderMapList");

	parent.removeAll(true);

	// each row has 5 maps

	Object.values(adventures).forEach((adventure, index) => {

		const x = 100 + (index % 5) * 200;
		const y = 100 + Math.floor(index / 5) * 200;

		const icon = scene.add.image(x, y, adventure.icon).setOrigin(0).setScale(0.5);

		icon.setInteractive();

		parent.add(icon);

		icon.on("pointerup", renderMapInfo(scene, parent, flyout, adventure));

	});

}

const renderMapInfo = (scene: Scene, parent: Container, flyout: Flyout, adventure: Adventure) => async () => {

	console.log("renderMapInfo", adventure);

	parent.removeAll(true);


	const icon = scene.add.image(
		300,
		300,
		adventure.icon,
	).setOrigin(0.5).setScale(1);
	parent.add(icon);

	const text = `
		Name: ${adventure.name}
		Description: ${adventure.description}
		`;

	const textDisplay = scene.add.text(100, 420, text, defaultTextConfig);
	parent.add(textDisplay);

	const embarkButton = createButton(
		"Embark",
		500, SCREEN_HEIGHT - 400,
		handleEmbarkButtonClicked(flyout, adventure)
	);

	parent.add(embarkButton);

	const backButton = createButton(
		"Back",
		500, SCREEN_HEIGHT - 200,
		() => {
			console.log("Back button clicked");
			render(scene, parent, flyout);
		}
	);
	parent.add(backButton);

}

const handleEmbarkButtonClicked = (flyout: Flyout, adv: Adventure) => async () => {

	console.log("Embark button clicked");

	let adventure = { ...adv };

	await flyout.slideOut();

	ProgressBar.createProgressBar(adventure);

	const state = getState();
	state.battleData.units = state.gameData.player.units
		.filter(u => u.hp > 0)
		.map(u => ({ ...u }));

	const result = await runAdventure(adventure)

	if (result === "success") {

		console.log("Adventure completed successfully");

	}

	if (result === "failure") {

		console.log("Adventure failed");

	}

	ProgressBar.destroyProgressBar();

}
