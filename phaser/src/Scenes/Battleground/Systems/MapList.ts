import { getState } from "../../../Models/State";
import { create, retractFlyout, slideFlyoutIn } from "../../../Systems/Flyout";
import { defaultTextConfig, SCREEN_HEIGHT, SCREEN_WIDTH } from "../constants";
import { ENCOUNTER_BLOBS } from "../enemyWaves";
import * as ProgressBar from "./ProgressBar";
import { createButton } from "./UIManager";
import { createWave } from "./WaveManager";

type MapInfo = {
	name: string;
	description: string;
	encounter: string;
	loot: string;
}

const mapInfo: { [id: string]: MapInfo } = {
	"forest_entrance": {
		name: "Forest Entrance",
		description: "A dark and mysterious forest entrance.",
		encounter: "You encounter a wild beast.",
		loot: "You find a treasure chest.",
	},
}

let hasClicked_debug = false;

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

	setTimeout(() => {
		if (hasClicked_debug) return;
		handleButtonClicked(isOpened, container)();
		hasClicked_debug = true;
	}, 500);

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

	const maps = [
		"forest_entrance",
		"forest_entrance",
	];

	// each row has 5 maps

	maps.forEach((map, index) => {

		const x = 100 + (index % 5) * 200;
		const y = 100 + Math.floor(index / 5) * 200;

		const icon = scene.add.image(x, y, `icon/${map}`).setOrigin(0).setScale(0.5);

		icon.setInteractive();

		parent.add(icon);

		icon.on("pointerup", renderMapInfo(scene, parent, map));

	});

	setTimeout(() => renderMapInfo(scene, parent, maps[0])(), 500);

}

const renderMapInfo = (scene: Scene, parent: Container, map: string) => async () => {

	console.log("renderMapInfo", map);

	parent.removeAll(true);

	const info = mapInfo[map];

	if (!info) return;

	const icon = scene.add.image(
		300,
		300,
		`icon/${map}`
	).setOrigin(0.5).setScale(1);
	parent.add(icon);

	const text = `
		Name: ${info.name}
		Description: ${info.description}
		Encounter: ${info.encounter}
		`;

	const textDisplay = scene.add.text(100, 420, text, defaultTextConfig);
	parent.add(textDisplay);

	const embarkButton = createButton(
		"Embark",
		500, SCREEN_HEIGHT - 400,
		handleEmbarkButtonClicked(parent)
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

	setTimeout(() => {
		handleEmbarkButtonClicked(parent)();
	}, 500);

}

const handleEmbarkButtonClicked = (parent: Container) => async () => {

	console.log("Embark button clicked");

	const state = getState();

	await retractFlyout(parent.parentContainer);

	ProgressBar.createProgressBar();

	await createWave(
		state.gameData.player.units,
		{
			generate: ENCOUNTER_BLOBS,
			current: 0,
			total: 15
		})

	ProgressBar.destroyProgressBar();

}
