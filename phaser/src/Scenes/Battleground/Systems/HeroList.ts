import { jobs } from "../../../Models/Job";
import { create, retractFlyout, slideFlyoutIn } from "../../../Systems/Flyout";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "../constants";

export async function renderHeroButton(scene: Phaser.Scene) {

	let isOpened = false;

	const flyout = await create(scene, "Heroes")
	const container = scene.add.container(0, 0);
	flyout.add(container);

	scene.add.image(
		...[

			SCREEN_WIDTH - 120,
			SCREEN_HEIGHT - 530
		],
		"charas/nameless")
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

	parent.removeAll(true);

	//const state = getState();

	let page = 0;

	const update = () => {

		parent.removeAll(true);

		jobs.slice(page * 15, (page + 1) * 15)
			.forEach((job, index) => {

				const x = 100 + (index % 3) * 200;
				const y = 100 + Math.floor(index / 5) * 200;

				const icon = scene.add.image(x, y, `charas/${job.id}`)
					.setOrigin(0)
					.setDisplaySize(180, 180);

				parent.add(icon);
			});

		const nextPage = scene.add.image(400, 700, "ui/button")
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
		const prevPage = scene.add.image(100, 700, "ui/button")
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
