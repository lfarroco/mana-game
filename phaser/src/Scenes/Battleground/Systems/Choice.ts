import Phaser from "phaser";
import { tween } from "../../../Utils/animation";
import * as constants from "../constants";
import { breakLines, pickRandom } from "../../../utils";
import { getItem, Item } from "../../../Models/Item";
import { playerForce } from "../../../Models/Force";
import { images } from "../../../assets";

export let scene: Phaser.Scene;

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

export const CARD_DIMENSIONS = { width: 800, height: 300 };
export const BASE_X = 10;

const STYLE_CONSTANTS = {
	HOVER_SCALE: 1.05,
	HOVER_OFFSET: 10,
	ANIMATION_DURATION: 300,
	FADE_DURATION: 500,
	FADE_DELAY: 500,
	PARTICLE_COLORS: {
		DEFAULT: 0x3333ff,
		HOVER: 0x00ff00
	},
	CARD_FILL: 0x333333,
	CARD_STROKE_WIDTH: 2,
	CARD_STROKE_COLOR: 0x000000
} as const;

export const init = (sceneRef: Phaser.Scene) => {
	scene = sceneRef;
}

export const displayChoices = (choices: Choice[]) => new Promise<Choice>(async (resolve) => {

	const component = scene.add.container();

	const promises = choices.map(renderChoiceCard(
		async (choice: Choice) => {

			await Promise.all(cards.map(async (card, i) => {
				await tween({
					targets: [card],
					x: -CARD_DIMENSIONS.width * 1.4,
					duration: 1000,
					delay: i * 200,
				});
			}));

			component.destroy();

			resolve(choice);
		})
	);

	const cards = await Promise.all(promises);

	component.add(cards)

});

const renderChoiceCard = (
	onSelect: (choice: Choice, card: Container) => void
) => async (choice: Choice, index: number, choices: Choice[]): Promise<Container> => {

	const spacing = (constants.SCREEN_HEIGHT - (choices.length * CARD_DIMENSIONS.height)) / (choices.length + 1);
	const y = (spacing * (index + 1)) + (CARD_DIMENSIONS.height * index);

	const cardContainer = scene.add.container(-CARD_DIMENSIONS.width * 1.4, y);

	const pic = scene.add.image(0, 0, choice.pic)
		.setDisplaySize(CARD_DIMENSIONS.height, CARD_DIMENSIONS.height).setOrigin(0);

	const cardBg = scene.add.graphics();

	cardBg.fillStyle(STYLE_CONSTANTS.CARD_FILL);
	cardBg.fillRect(0, 0, CARD_DIMENSIONS.width, CARD_DIMENSIONS.height);
	cardBg.lineStyle(STYLE_CONSTANTS.CARD_STROKE_WIDTH, STYLE_CONSTANTS.CARD_STROKE_COLOR);
	cardBg.strokeRect(0, 0, CARD_DIMENSIONS.width, CARD_DIMENSIONS.height);

	const emitter = scene.add.particles(
		0, 0,
		images.white_splash_fade.key,
		{
			speed: 0,
			lifespan: { min: CARD_DIMENSIONS.width, max: CARD_DIMENSIONS.height },
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

	const text = scene.add.text(
		CARD_DIMENSIONS.height + 20, 20,
		choice.title,
		constants.titleTextConfig
	);
	text.setOrigin(0);

	const description = scene.add.text(
		CARD_DIMENSIONS.height + 20, 100,
		breakLines(choice.desc, 25),
		{ ...constants.defaultTextConfig, fontSize: '32px' }
	);
	description.setOrigin(0);

	cardContainer.add([emitter, cardBg, pic, text, description]);

	await tween({
		targets: [cardContainer],
		x: BASE_X,
		delay: index * 100,
	})

	cardBg.setInteractive(new Phaser.Geom.Rectangle(0, 0, CARD_DIMENSIONS.width, CARD_DIMENSIONS.height), Phaser.Geom.Rectangle.Contains);

	cardBg.on("pointerover", () => {
		emitter.particleTint = STYLE_CONSTANTS.PARTICLE_COLORS.HOVER;
		scene.tweens.add({
			targets: cardContainer,
			scaleX: STYLE_CONSTANTS.HOVER_SCALE,
			scaleY: STYLE_CONSTANTS.HOVER_SCALE,
			x: BASE_X - STYLE_CONSTANTS.HOVER_OFFSET,
			y: y - STYLE_CONSTANTS.HOVER_OFFSET,
			duration: STYLE_CONSTANTS.ANIMATION_DURATION,
			ease: 'Power2',
		});
	});

	cardBg.on("pointerout", () => {
		emitter.particleTint = STYLE_CONSTANTS.PARTICLE_COLORS.DEFAULT;
		scene.tweens.add({
			targets: cardContainer,
			scaleX: 1,
			scaleY: 1,
			x: BASE_X,
			y,
			duration: STYLE_CONSTANTS.ANIMATION_DURATION,
			ease: 'Power2',
		});
	});

	cardBg.on("pointerup", () => {
		cardBg.removeAllListeners();
		onSelect(choice, cardContainer);
	});

	return cardContainer;
}


export const chooseItems = (pool: [key: string, Item][]) => new Promise<Choice>(async (resolve) => {

	const choices = pickRandom(pool, 3).map(([key, item]) => newChoice(
		item.icon,
		item.name,
		item.description,
		key
	));

	const component = scene.add.container();

	const promises = choices.map(renderChoiceCard(
		async (choice: Choice, card: Container) => {

			const icon = scene.add.image(card.x, card.y, choice.pic)

			tween({
				targets: [icon],
				x: constants.SCREEN_WIDTH - 100,
				y: constants.SCREEN_HEIGHT - 100,
				scaleX: 0.3,
				scaleY: 0.3,
				alpha: 0,
				onComplete: () => {
					icon.destroy();
				}
			})

			await Promise.all(cards.map(async (c, i) => {

				if (c === card) {
					c.destroy();
					return;
				}
				await tween({
					targets: [c],
					x: -CARD_DIMENSIONS.width * 1.4,
					delay: i * 200,
				});
			}));

			component.destroy();

			playerForce.items.push(getItem(choice.value));

			resolve(choice);
		})
	);

	const cards = await Promise.all(promises);

	component.add(cards)

});