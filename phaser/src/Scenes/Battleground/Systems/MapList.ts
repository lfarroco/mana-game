import { getState } from "../../../Models/State";
import { create, retractFlyout, slideFlyoutIn } from "../../../Systems/Flyout";
import { defaultTextConfig, SCREEN_HEIGHT, SCREEN_WIDTH } from "../constants";
import { ENCOUNTER_BLOBS } from "../enemyWaves";
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

export async function renderMapButton(scene: Phaser.Scene) {

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
		.on("pointerup", async () => {

			if (isOpened) {
				isOpened = false;
				await retractFlyout(flyout);
				return;
			}

			render(scene, container);

			await slideFlyoutIn(flyout);
			isOpened = true;
		});

}
export function render(scene: Phaser.Scene, parent: Phaser.GameObjects.Container) {

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

		icon.on("pointerup", () => {
			renderMapInfo(scene, parent, map);
		});

	});

}

function renderMapInfo(scene: Scene, parent: Container, map: string) {

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
		async () => {

			const state = getState();

			await retractFlyout(parent.parentContainer);

			await createWave(
				state.gameData.player.units,
			{
				generate: ENCOUNTER_BLOBS,
				current: 0,
				total: 5
			})

}
	);

parent.add(embarkButton);

const backButton = createButton(
	"Back",
	500, SCREEN_HEIGHT - 200,
	() => {
		render(scene, parent);
	}
);
parent.add(backButton);

}
