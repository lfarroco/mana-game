import Phaser from "phaser";
import { scene } from "./UIManager";
import { pipe } from 'fp-ts/lib/function';
import * as A from 'fp-ts/lib/Array';
import { range } from "fp-ts/lib/NonEmptyArray";

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

export function createProgressBar(value: number, maxValue: number) {
	barBg = scene.add.graphics();
	barBg.fillStyle(bgColor, bgAlpha);
	barBg.fillRect(barX, barY, barWidth, barHeight);

	bar = scene.add.graphics();

	circles = scene.add.graphics();

	updateProgressBar(value, maxValue);
}

export function destroyProgressBar() {
	bar.destroy();
	barBg.destroy();
	circles.destroy();
}

export function updateProgressBar(
	value: number,
	maxValue: number,
	current: number = 1
) {
	bar.clear();
	bar.fillStyle(fillColor, fillAlpha);
	bar.fillRect(
		barX,
		barY,
		Math.max(0, ((value - 1) / maxValue) * barWidth),
		barHeight
	);

	circles.clear();

	const colorCurrent = 0xff0000;
	const colorFuture = 0xeaeaea;
	const colorPast = 0x000000;

	pipe(
		range(1, maxValue + 1),
		A.map((i: number) => {
			circles.fillStyle(
				(i === current) ? colorCurrent :
					(i >= current) ? colorFuture :
						colorPast,
				1
			);
			circles.fillCircle(
				barX + ((i - 1) * barWidth) / maxValue,
				barY + barHeight / 2,
				10
			);
		}),
	);
}
