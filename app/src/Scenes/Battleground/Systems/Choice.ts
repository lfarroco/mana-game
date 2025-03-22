import Phaser from "phaser";
import { tween } from "../../../Utils/animation";
import { BattlegroundScene } from "../BattlegroundScene";
import * as constants from "../constants";
import * as UIManager from "./UIManager";

type Choice = {
	pic: string;
	title: string;
	desc: string;
};

const CARD_DIMENSIONS = { width: 350, height: 500 };
const TITLE_POSITION = { x: constants.SCREEN_WIDTH / 2, y: 100 };
const BASE_Y = constants.SCREEN_HEIGHT / 2 - CARD_DIMENSIONS.height / 2;

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

export const displayChoices = (scene: BattlegroundScene) => (resolve: (choice: Choice) => void) => (choices: Choice[]) => {

	const component = scene.add.container();

	const cardRect = new Phaser.Geom.Rectangle(0, 0, constants.SCREEN_WIDTH, constants.SCREEN_HEIGHT);

	const backdrop = scene.add.graphics();
	backdrop.fillStyle(0x000000, 0.7);
	backdrop.fillRect(0, 0, constants.SCREEN_WIDTH, constants.SCREEN_HEIGHT);
	backdrop.setInteractive(cardRect, Phaser.Geom.Rectangle.Contains);

	const title = scene.add.text(
		TITLE_POSITION.x, TITLE_POSITION.y,
		"Select an action",
		{
			...constants.defaultTextConfig,
			fontSize: '64px',
		}
	);
	title.setOrigin(0.5);

	const spacing = (constants.SCREEN_WIDTH - (choices.length * CARD_DIMENSIONS.width)) / (choices.length + 1);

	const cards = choices.map((choice, i) => {
		const x = (spacing * (i + 1)) + (CARD_DIMENSIONS.width * i);
		const y = BASE_Y;
		const card = scene.add.container(x, y);

		const pic = scene.add.image(0, 0, choice.pic).setDisplaySize(CARD_DIMENSIONS.width, CARD_DIMENSIONS.width).setOrigin(0);

		const emitter = scene.add.particles(0, 0, 'white-splash-fade', {
			speed: 0,
			lifespan: { min: 400, max: 1000 },
			scale: { start: 0.0, end: 0.2 },
			alpha: { start: 1.0, end: 0 },
			blendMode: 'ADD',
			tint: STYLE_CONSTANTS.PARTICLE_COLORS.DEFAULT,
			frequency: 300,
			rotate: {
				min: 0,
				max: 360
			},
			quantity: 128,
			emitZone: {
				type: 'edge',
				source: new Phaser.Geom.Rectangle(0, 0, CARD_DIMENSIONS.width, CARD_DIMENSIONS.height),
				quantity: 128
			}
		});

		card.add(emitter);

		const cardBg = scene.add.graphics();

		cardBg.fillStyle(0xffffff);
		cardBg.fillRect(0, 0, CARD_DIMENSIONS.width, CARD_DIMENSIONS.height);
		cardBg.lineStyle(2, 0x000000);
		cardBg.strokeRect(0, 0, CARD_DIMENSIONS.width, CARD_DIMENSIONS.height);

		card.add(cardBg);

		card.add(pic);

		cardBg.setInteractive(cardRect, Phaser.Geom.Rectangle.Contains);

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

		cardBg.on("pointerup", async () => {
			await tween({
				targets: [component],
				duration: 1000 / scene.speed,
				alpha: 0,
			});

			component.destroy();

			resolve(choice);
		});

		const text = scene.add.text(
			CARD_DIMENSIONS.width / 2, CARD_DIMENSIONS.height / 2,
			choice.title,
			constants.defaultTextConfig
		);
		text.setOrigin(0.5);

		card.add(text);

		return card;
	});

	const confirmBtn = UIManager.createButton(
		"Confirm",
		constants.SCREEN_WIDTH / 2, constants.SCREEN_HEIGHT - 100,
		() => {
			backdrop.destroy();
			title.destroy();
			UIManager.updateUI();
		});

	component.add([backdrop, title, ...cards, confirmBtn]);

	component.setAlpha(0);

	scene.tweens.add({
		targets: component,
		alpha: 1,
		duration: STYLE_CONSTANTS.FADE_DURATION,
		ease: 'Power',
		delay: STYLE_CONSTANTS.FADE_DELAY,
	});
};
