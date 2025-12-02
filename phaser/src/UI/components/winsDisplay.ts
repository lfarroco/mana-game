import { vec2, size } from "@Models/Geometry";
import { getState, getCurrentScene } from "@Models/State";
import * as io from "@PhaserIO";
import { images } from "../../assets";

const MAX_WINS = 10;
const RECT_WIDTH = 30;
const RECT_HEIGHT = 20;
const GAP = 5;
const COLOR_GRAY = 0x808080;
const COLOR_YELLOW = 0xFFFF00;
const COLOR_BRONZE = 0xCD7F32;
const COLOR_SILVER = 0xC0C0C0;
const COLOR_GOLD = 0xFFD700;
const CIRCLE_RADIUS = 10;

let winRects: Phaser.GameObjects.Graphics[] = [];
let currentWins = 0;
let mainContainer: Phaser.GameObjects.Container | null = null;

export const WINS_DISPLAY_X = 240;
export const WINS_DISPLAY_Y = 35;

export function create() {
	const initialWins = getState().gameData.player.wins;
	currentWins = initialWins;

	const rects = createRects();
	const indicators = createBonusIndicators();
	updateRectColors(currentWins);

	mainContainer = io.Container([...rects, ...indicators]);
	io.SetPosition(mainContainer, vec2(WINS_DISPLAY_X, WINS_DISPLAY_Y));

	return mainContainer;
}

function createRects(): Phaser.GameObjects.Graphics[] {
	winRects = [];

	for (let i = 0; i < MAX_WINS; i++) {
		const rect = io.Rectangle(vec2(0, 0), size(RECT_WIDTH, RECT_HEIGHT), COLOR_GRAY);

		const xOffset = i * (RECT_WIDTH + GAP);
		io.SetPosition(rect, vec2(xOffset, 0));

		winRects.push(rect);
	}

	return winRects;
}

function createBonusIndicators(): Phaser.GameObjects.Graphics[] {
	const indicators: Phaser.GameObjects.Graphics[] = [];
	const bonuses = [
		{ index: 4, color: COLOR_BRONZE },
		{ index: 7, color: COLOR_SILVER },
		{ index: 9, color: COLOR_GOLD },
	];

	for (const bonus of bonuses) {
		const xOffset = bonus.index * (RECT_WIDTH + GAP) + RECT_WIDTH / 2;
		const yOffset = RECT_HEIGHT + 15;

		const circle = io.Circle(vec2(xOffset, yOffset), CIRCLE_RADIUS, bonus.color);
		indicators.push(circle);
	}

	return indicators;
}

export const updateWinsDisplay = (newTotalWins: number): void => {
	if (newTotalWins > currentWins) {
		for (let i = currentWins; i < newTotalWins; i++) {
			playWinEffect(i);
		}
	}
	currentWins = newTotalWins;
	updateRectColors(currentWins);
};

function updateRectColors(wins: number) {
	for (let i = 0; i < winRects.length; i++) {
		const rect = winRects[i];
		rect.clear();

		const color = i < wins ? COLOR_YELLOW : COLOR_GRAY;

		rect.fillStyle(color, 0.7);
		rect.fillRect(0, 0, RECT_WIDTH, RECT_HEIGHT);
	}
}

function playWinEffect(index: number) {
	if (!mainContainer) {
		throw new Error("mainContainer is null");
	}

	if (index >= winRects.length) {
		return;
	}

	// TODO: play sound effect (plim)

	const scene = getCurrentScene();
	const rect = winRects[index];

	const x = rect.x + RECT_WIDTH / 2;
	const y = rect.y + RECT_HEIGHT / 2;

	const particles = scene.add.particles(x, y, images.light_pillar.key, {
		lifespan: 300,
		scale: { start: 0.3, end: 1.2 },
		alpha: { start: 1, end: 0 },
		speed: { min: 50, max: 100 },
		quantity: 3,
		frequency: 30,
		rotate: { min: 0, max: 360 },
		blendMode: "ADD",
		tint: COLOR_YELLOW,
		emitZone: {
			type: "edge",
			source: new Phaser.Geom.Circle(0, 0, 5),
			quantity: 4,
			yoyo: false,
		},
	});

	mainContainer.add(particles);

	scene.time.delayedCall(300, () => {
		particles.stop();
	});

	scene.time.delayedCall(600, () => {
		particles.destroy();
	});
}

export async function winsChangeAnimation(_winsDelta: number) {
	return Promise.resolve();
}
