import { playerForce } from "../../../Models/Force";
import { jobs } from "../../../Models/Job";
import { makeUnit } from "../../../Models/Unit";
import { createCard } from "../../../Systems/Chara/Chara";
import { create, retractFlyout, slideFlyoutIn } from "../../../Systems/Flyout";
import { SCREEN_HEIGHT, SCREEN_WIDTH, TILE_HEIGHT, TILE_WIDTH } from "../constants";

export async function renderHeroButton(scene: Phaser.Scene) {

	let isOpened = false;

	const flyout = await create(scene, "Heroes")
	const container = scene.add.container(0, 0);
	flyout.add(container);

	const button = scene.add.image(
		...[

			SCREEN_WIDTH + 800,
			SCREEN_HEIGHT - 560
		],
		"charas/nameless")
		.setOrigin(0.5)
		.setDisplaySize(230, 230)
		.setInteractive()
		.on("pointerup", () => handleButtonClicked(isOpened, container)());

	container.add(button);

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

	parent.removeAll(true);

	//const state = getState();

	let page = 0;

	const update = () => {

		parent.removeAll(true);

		jobs.slice(page * 15, (page + 1) * 15)
			.forEach((job, index) => {


				const chara = createCard({
					...makeUnit(playerForce.id, job.id)
				});

				const x = 160 + (index % 3) * TILE_WIDTH + ((index % 3) * 20);
				const y = 220 + Math.floor(index / 5) * TILE_HEIGHT + ((Math.floor(index / 5) * 20));

				chara.container.setPosition(x, y);

				parent.add(chara.container);
			});

		const nextPage = scene.add.image(400, 900, "ui/button")
			.setOrigin(0)
			.setDisplaySize(100, 100)
			.setInteractive()
			.setAlpha(page < Math.ceil(jobs.length / 15) - 1 ? 1 : 0.5)
			.on("pointerup", () => {
				if (page >= Math.ceil(jobs.length / 15) - 1) return;
				page++;
				if (page >= Math.ceil(jobs.length / 15)) {
					page = 0;
				}
				update();
			});
		const prevPage = scene.add.image(100, 900, "ui/button")
			.setOrigin(0)
			.setDisplaySize(100, 100)
			.setInteractive()
			.setAlpha(page > 0 ? 1 : 0.5)
			.on("pointerup", () => {
				if (page === 0) return;

				page--;
				if (page < 0) {
					page = Math.ceil(jobs.length / 15) - 1;
				}
				update();
			});

		parent.add([nextPage, prevPage]);
	}

	update();

}
