import { vec2, size } from "@Models/Geometry";
import { getState } from "@Models/State";
import * as io from "@PhaserIO";

const MAX_WINS = 10;
const RECT_WIDTH = 30;
const RECT_HEIGHT = 20;
const GAP = 5;
const COLOR_GRAY = 0x808080;
const COLOR_YELLOW = 0xFFFF00;

let winRects: Phaser.GameObjects.Graphics[] = [];
let currentWins = 0;

export const WINS_DISPLAY_X = 240;
export const WINS_DISPLAY_Y = 35;

export function create() {
	const initialWins = getState().gameData.player.wins;
	currentWins = initialWins;

	const rects = createRects();
	updateRectColors(currentWins);

	const container = io.Container([...rects]);
	io.SetPosition(container, vec2(WINS_DISPLAY_X, WINS_DISPLAY_Y));

	return container;
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

export const updateWinsDisplay = (newTotalWins: number): void => {
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

export async function winsChangeAnimation(_winsDelta: number) {
	return Promise.resolve();
}
