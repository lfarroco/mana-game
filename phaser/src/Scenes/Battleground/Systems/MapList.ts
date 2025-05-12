import { Adventure, adventures } from "../../../Models/Adventure";
import { getState } from "../../../Models/State";
import { create, retractFlyout, slideFlyoutIn } from "../../../Systems/Flyout";
import { defaultTextConfig, SCREEN_HEIGHT, SCREEN_WIDTH } from "../constants";
import * as ProgressBar from "./ProgressBar";
import { createButton } from "./UIManager";
import { processWaves } from "./WaveManager";

export async function renderMapButton(scene: Phaser.Scene) {

	console.log("renderMapButton");

	let isOpened = false;

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
		.on("pointerup", () => handleButtonClicked(isOpened, container)());

}

const handleButtonClicked = (isOpened: boolean, container: Container) => async () => {

	if (isOpened) {
		isOpened = false;
		await retractFlyout(container.parentContainer);
		return;
	}

	render(container.scene, container);

	await slideFlyoutIn(container.parentContainer);
	isOpened = true;
}

export function render(scene: Phaser.Scene, parent: Phaser.GameObjects.Container) {

	console.log("renderMapList");

	parent.removeAll(true);

	// each row has 5 maps

	Object.values(adventures).forEach((adventure, index) => {

		const x = 100 + (index % 5) * 200;
		const y = 100 + Math.floor(index / 5) * 200;

		const icon = scene.add.image(x, y, adventure.icon).setOrigin(0).setScale(0.5);

		icon.setInteractive();

		parent.add(icon);

		icon.on("pointerup", renderMapInfo(scene, parent, adventure));

	});

}

const renderMapInfo = (scene: Scene, parent: Container, adventure: Adventure) => async () => {

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
		handleEmbarkButtonClicked(parent, adventure)
	);

	parent.add(embarkButton);

	const backButton = createButton(
		"Back",
		500, SCREEN_HEIGHT - 200,
		() => {
			console.log("Back button clicked");
			render(scene, parent);
		}
	);
	parent.add(backButton);

}

const handleEmbarkButtonClicked = (parent: Container, adv: Adventure) => async () => {

	console.log("Embark button clicked");

	let adventure = { ...adv };

	const state = getState();

	await retractFlyout(parent.parentContainer);

	ProgressBar.createProgressBar(adventure);

	await processWaves(
		state.gameData.player.units,
		adventure,
	)

	console.log("... adv done!!")

	ProgressBar.destroyProgressBar();

}
