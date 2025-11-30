import * as c from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { getState } from "@Models/State";
import { getCurrentScene } from "@Models/State";
import * as io from "@PhaserIO";

const MAX_LIVES = 4;
const GREEN_HEART = "💚";
const GRAY_HEART = "🖤";

let heartElements: Phaser.GameObjects.Text[] = [];
let currentLives = MAX_LIVES;
let containerElement: Phaser.GameObjects.Container | null = null;

export const getContainerBounds = (): Phaser.Geom.Rectangle | null => {
	return containerElement ? containerElement.getBounds() : null;
};

export const updateLivesDisplay = (newTotalLives: number): void => {
	// Only animate when lives decrease
	if (newTotalLives < currentLives) {
		const livesLost = currentLives - newTotalLives;

		// Animate hearts from right to left
		for (let i = 0; i < livesLost; i++) {
			const heartIndex = currentLives - 1 - i;
			if (heartIndex >= 0 && heartIndex < heartElements.length) {
				const heart = heartElements[heartIndex];
				const scene = getCurrentScene();

				// Change the heart to black with a tween
				scene.tweens.add({
					targets: heart,
					tint: 0x000000,
					duration: 500,
					ease: 'Power2',
					onStart: () => {
						heart.setText(GRAY_HEART);
					}
				});
			}
		}
	}

	currentLives = newTotalLives;
};

export const LIVES_DISPLAY_X = 60;
export const LIVES_DISPLAY_Y = 50;

export function create() {
	const initialLives = getState().gameData.player.lives;
	currentLives = initialLives;

	const hearts = createHearts();

	const container = io.Container([...hearts]);
	io.SetPosition(container, vec2(LIVES_DISPLAY_X, LIVES_DISPLAY_Y));

	containerElement = container;

	return container;
}

function createHearts(): Phaser.GameObjects.Text[] {
	heartElements = [];

	for (let i = 0; i < MAX_LIVES; i++) {
		const isAlive = i < currentLives;
		const heartIcon = isAlive ? GREEN_HEART : GRAY_HEART;

		const heart = io.Text(heartIcon, {
			...c.titleTextConfig,
			fontSize: "36px",
			color: "#ffffff",
		});

		if (!isAlive) {
			heart.setTint(0x000000);
		}

		const xOffset = i * 40;
		io.SetPosition(heart, vec2(xOffset, 0));
		io.Centralize(heart);

		heartElements.push(heart);
	}

	return heartElements;
}

