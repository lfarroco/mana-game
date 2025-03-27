import Phaser from "phaser";
import { tween } from "../../../Utils/animation";
import * as constants from "../constants";
import { getState, State } from "../../../Models/State";
import { breakLines } from "../../../utils";
import { FORCE_ID_PLAYER } from "../../../Models/Force";
import { updateUI } from "./UIManager";

let scene: Phaser.Scene;
let state: State;

export type Choice = {
	pic: string;
	title: string;
	desc: string;
	value: string;
};

export const newChoice = (pic: string, title: string, desc: string, value: string): Choice => ({
	pic,
	title,
	desc,
	value
});

const CARD_DIMENSIONS = { width: 800, height: 300 };
const BASE_X = 10;

const STYLE_CONSTANTS = {
	HOVER_SCALE: 1.05,
	HOVER_OFFSET: 10,
	ANIMATION_DURATION: 300,
	FADE_DURATION: 500,
	FADE_DELAY: 500,
	PARTICLE_COLORS: {
		DEFAULT: 0x3333ff,
		HOVER: 0x00ff00
	}
} as const;

export const init = (sceneRef: Phaser.Scene) => {
	scene = sceneRef;
	state = getState();
	// add listeners here
	//...
}

export const displayChoices = (choices: Choice[]) => new Promise<Choice>((resolve) => {

	const component = scene.add.container();

	const cards = choices.map(renderCard(
		async (choice: Choice) => {
			await tween({
				targets: [component],
				duration: 1000 / state.options.speed,
				alpha: 0,
			});

			component.destroy();

			resolve(choice);
		}
	));

	component.add(cards)

});

export const displayStore = (choices: Choice[]) => new Promise<void>((resolve) => {

	const component = scene.add.container();

	let bought = 0;

	const items: { [id: string]: number } = {
		test_item_1: 10,
		test_item_2: 20,
		test_item_3: 30,
	};

	const force = state.gameData.forces.find(f => f.id === FORCE_ID_PLAYER)!;

	const cards = choices.map(renderCard(
		async (choice: Choice, card: Phaser.GameObjects.Container) => {

			if (force.gold < items[choice.value]) {
				return;
			}

			await tween({
				targets: [card],
				duration: 1000 / state.options.speed,
				alpha: 0,
			});

			card.destroy();


			force.gold -= items[choice.value];

			updateUI();

			bought++;

			if (bought === choices.length) {
				component.destroy();
				return resolve();
			}

			if (force.gold <= 0) {
				cards.forEach((child) => {
					child.setAlpha(0.5);
				})
			}

		}
	));

	cards.forEach((card, i) => {

		if (force.gold < items[choices[i].value]) {
			(card).setAlpha(0.5);
		}

	});

	const exitBtn = scene.add.text(
		0, 0,
		"Exit",
		constants.defaultTextConfig
	);
	exitBtn.setInteractive();
	exitBtn.setOrigin(0);
	exitBtn.on("pointerup", () => {
		component.destroy();
		resolve();
	});

	component.add(exitBtn);

	component.add(cards)

});


function renderCard(
	onSelect: (choice: Choice, card: Phaser.GameObjects.Container) => void):
	(value: Choice, index: number, choices: Choice[]) => Phaser.GameObjects.Container {
	return (choice, i, choices) => {

		const spacing = (constants.SCREEN_HEIGHT - (choices.length * CARD_DIMENSIONS.height)) / (choices.length + 1);
		const x = BASE_X;
		const y = (spacing * (i + 1)) + (CARD_DIMENSIONS.height * i);
		const card = scene.add.container(x, y);

		console.log(">>>", choice)
		const pic = scene.add.image(0, 0, choice.pic)
			.setDisplaySize(CARD_DIMENSIONS.height, CARD_DIMENSIONS.height).setOrigin(0);

		const emitter = scene.add.particles(0, 0, 'white-splash-fade', {
			speed: 0,
			lifespan: { min: 400, max: 700 },
			scale: { start: 0.0, end: 0.15 },
			alpha: { start: 0.8, end: 0 },
			blendMode: 'ADD',
			tint: STYLE_CONSTANTS.PARTICLE_COLORS.DEFAULT,
			frequency: 300,
			rotate: {
				min: 0,
				max: 360
			},
			quantity: 64,
			emitZone: {
				type: 'edge',
				source: new Phaser.Geom.Rectangle(0, 0, CARD_DIMENSIONS.width, CARD_DIMENSIONS.height),
				quantity: 64
			}
		});

		card.add(emitter);

		const cardBg = scene.add.graphics();

		cardBg.fillStyle(0x333333);
		cardBg.fillRect(0, 0, CARD_DIMENSIONS.width, CARD_DIMENSIONS.height);
		cardBg.lineStyle(2, 0x000000);
		cardBg.strokeRect(0, 0, CARD_DIMENSIONS.width, CARD_DIMENSIONS.height);

		card.add(cardBg);

		card.add(pic);

		cardBg.setInteractive(new Phaser.Geom.Rectangle(0, 0, CARD_DIMENSIONS.width, CARD_DIMENSIONS.height), Phaser.Geom.Rectangle.Contains);

		cardBg.on("pointerover", () => {
			emitter.particleTint = STYLE_CONSTANTS.PARTICLE_COLORS.HOVER;
			scene.tweens.add({
				targets: card,
				scaleX: STYLE_CONSTANTS.HOVER_SCALE,
				scaleY: STYLE_CONSTANTS.HOVER_SCALE,
				x: x - STYLE_CONSTANTS.HOVER_OFFSET,
				y: y - STYLE_CONSTANTS.HOVER_OFFSET,
				duration: STYLE_CONSTANTS.ANIMATION_DURATION,
				ease: 'Power',
			});
		});

		cardBg.on("pointerout", () => {
			emitter.particleTint = STYLE_CONSTANTS.PARTICLE_COLORS.DEFAULT;
			scene.tweens.add({
				targets: card,
				scaleX: 1,
				scaleY: 1,
				x,
				y,
				duration: STYLE_CONSTANTS.ANIMATION_DURATION,
				ease: 'Power',
			});
		});

		cardBg.on("pointerup", () => onSelect(choice, card))

		const text = scene.add.text(
			CARD_DIMENSIONS.height + 20, 20,
			choice.title,
			constants.defaultTextConfig
		);
		text.setOrigin(0);

		card.add(text);

		const desc = scene.add.text(
			CARD_DIMENSIONS.height + 20, 80,
			breakLines(choice.desc, 25),
			{ ...constants.defaultTextConfig, fontSize: '40px' }
		);
		desc.setOrigin(0);

		card.add(desc);

		return card;
	};
}

