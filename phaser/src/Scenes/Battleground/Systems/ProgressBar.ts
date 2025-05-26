import Phaser from "phaser";
import { scene } from "./UIManager";
import { Adventure } from "../../../Models/Adventure";

let container: Phaser.GameObjects.Container;
let bar: Phaser.GameObjects.Graphics;
let barBg: Phaser.GameObjects.Graphics;
let circles: Phaser.GameObjects.Graphics;
const barWidth = 1500;
const barHeight = 20;
const barX = 50;
const barY = 50;
const bgColor = 0x000000;
const bgAlpha = 0.5;
const fillColor = 0xeaeaea;
const fillAlpha = 1;

export function createProgressBar(adventure: Adventure) {
	container = scene.add.container(0, 0);
	barBg = scene.add.graphics();
	barBg.fillStyle(bgColor, bgAlpha);
	barBg.fillRect(barX, barY, barWidth, barHeight);

	bar = scene.add.graphics();

	circles = scene.add.graphics();

	container.add([barBg, bar, circles]);

	updateProgressBar(adventure);
}

export function destroyProgressBar() {
	container.removeAll(true);
}

export function updateProgressBar(
	adventure: Adventure,
) {
	bar.clear();
	bar.fillStyle(fillColor, fillAlpha);
	bar.fillRect(
		barX,
		barY,
		((adventure.currentWave) / adventure.waves.length) * barWidth,
		barHeight
	);

	circles.clear();

	const colorCurrent = 0xff0000;
	const colorFuture = 0xeaeaea;
	const colorPast = 0x000000;

	new Array(adventure.waves.length)
		.map((_, i: number) => {
			const x = barX + (i / adventure.waves.length) * barWidth;
			const y = barY + barHeight / 2;

			circles.fillStyle(
				(i === adventure.currentWave) ? colorCurrent :
					(i >= adventure.currentWave) ? colorFuture :
						colorPast,
				1
			);
			circles.fillCircle(
				x, y,
				10
			);

			const wave = adventure.waves[i - 1];

			if (wave?.icon) {
				const icon = scene.add.image(
					x, y + 100,
					`${wave.icon}`
				).setOrigin(0.5).setDisplaySize(100, 100);
				container.add(icon);
			}
		});

}
