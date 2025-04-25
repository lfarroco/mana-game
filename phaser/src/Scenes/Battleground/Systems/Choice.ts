import Phaser from "phaser";
import { tween } from "../../../Utils/animation";
import * as constants from "../constants";
import { getState, State } from "../../../Models/State";
import { breakLines } from "../../../utils";

export let scene: Phaser.Scene;
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
	}
} as const;

export const init = (sceneRef: Phaser.Scene) => {
	scene = sceneRef;
	state = getState();
}

export const displayChoices = (choices: Choice[]) => new Promise<Choice>(async (resolve) => {

	const component = scene.add.container();

	const promises = choices.map(renderChoiceCard(
		async (choice: Choice) => {
			await tween({
				targets: [component],
				duration: 1000 / state.options.speed,
				alpha: 0,
			});

			component.destroy();

			resolve(choice);
		})
	);

	const cards = await Promise.all(promises);

	component.add(cards)

});

const renderChoiceCard = (
	onSelect: (choice: Choice, card: Phaser.GameObjects.Container) => void
) => async (choice: Choice, index: number, choices: Choice[]): Promise<Phaser.GameObjects.Container> => {

	const spacing = (constants.SCREEN_HEIGHT - (choices.length * CARD_DIMENSIONS.height)) / (choices.length + 1);
	const y = (spacing * (index + 1)) + (CARD_DIMENSIONS.height * index);

	const cardContainer = scene.add.container(-CARD_DIMENSIONS.width * 1.4, y);

	const pic = scene.add.image(0, 0, choice.pic)
		.setDisplaySize(CARD_DIMENSIONS.height, CARD_DIMENSIONS.height).setOrigin(0);

	const cardBg = scene.add.graphics();

	cardBg.fillStyle(0x333333);
	cardBg.fillRect(0, 0, CARD_DIMENSIONS.width, CARD_DIMENSIONS.height);
	cardBg.lineStyle(2, 0x000000);
	cardBg.strokeRect(0, 0, CARD_DIMENSIONS.width, CARD_DIMENSIONS.height);

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

	const text = scene.add.text(
		CARD_DIMENSIONS.height + 20, 20,
		choice.title,
		constants.defaultTextConfig
	);
	text.setOrigin(0);

	const desc = scene.add.text(
		CARD_DIMENSIONS.height + 20, 80,
		breakLines(choice.desc, 25),
		{ ...constants.defaultTextConfig, fontSize: '40px' }
	);
	desc.setOrigin(0);

	cardContainer.add([emitter, cardBg, pic, text, desc]);

	await tween({
		targets: [cardContainer],
		x: BASE_X,
		duration: 1000 / state.options.speed,
		ease: "Power2",
		delay: index * 200,
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
			ease: 'Power',
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
			ease: 'Power',
		});
	});

	cardBg.on("pointerup", () => onSelect(choice, cardContainer))



	return cardContainer;
}

