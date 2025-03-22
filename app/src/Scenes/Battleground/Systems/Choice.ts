import Phaser from "phaser";
import { tween } from "../../../Utils/animation";
import { BattlegroundScene } from "../BattlegroundScene";
import * as constants from "../constants";

type Choice = {
	pic: string;
	title: string;
	desc: string;
};

export const displayChoices = (scene: BattlegroundScene) => (resolve: (choice: Choice) => void) => (choices: Choice[]) => {

	const component = scene.add.container();

	const backdrop = scene.add.graphics();
	backdrop.fillStyle(0x000000, 0.7);
	backdrop.fillRect(0, 0, constants.SCREEN_WIDTH, constants.SCREEN_HEIGHT);
	backdrop.setInteractive(new Phaser.Geom.Rectangle(0, 0, constants.SCREEN_WIDTH, constants.SCREEN_HEIGHT), Phaser.Geom.Rectangle.Contains);

	const title = scene.add.text(
		constants.SCREEN_WIDTH / 2, 100,
		"Select an action",
		{
			...constants.defaultTextConfig,
			fontSize: '64px',
		}
	);
	title.setOrigin(0.5);

	const cardWidth = 350;
	const cardHeight = 500;
	const spacing = (constants.SCREEN_WIDTH - (choices.length * cardWidth)) / (choices.length + 1);

	const baseY = constants.SCREEN_HEIGHT / 2 - cardHeight / 2;

	const cards = choices.map((choice, i) => {
		const x = (spacing * (i + 1)) + (cardWidth * i);
		const y = baseY;
		const card = scene.add.container(x, y);

		const pic = scene.add.image(0, 0, choice.pic).setDisplaySize(cardWidth, cardWidth).setOrigin(0);

		const emitter = scene.add.particles(0, 0, 'white-splash-fade', {
			speed: 0,
			lifespan: { min: 400, max: 1000 },
			scale: { start: 0.0, end: 0.2 },
			alpha: { start: 1.0, end: 0 },
			blendMode: 'ADD',
			tint: 0x3333ff,
			frequency: 300,
			rotate: {
				min: 0,
				max: 360
			},
			quantity: 128,
			emitZone: {
				type: 'edge',
				source: new Phaser.Geom.Rectangle(0, 0, cardWidth, cardHeight),
				quantity: 128
			}
		});

		card.add(emitter);

		const cardBg = scene.add.graphics();

		cardBg.fillStyle(0xffffff);
		cardBg.fillRect(0, 0, cardWidth, cardHeight);
		cardBg.lineStyle(2, 0x000000);
		cardBg.strokeRect(0, 0, cardWidth, cardHeight);

		card.add(cardBg);

		card.add(pic);

		cardBg.setInteractive(new Phaser.Geom.Rectangle(0, 0, cardWidth, cardHeight), Phaser.Geom.Rectangle.Contains);

		cardBg.on("pointerover", () => {
			emitter.particleTint = 0x00ff00;
			scene.tweens.add({
				targets: card,
				scaleX: 1.05,
				scaleY: 1.05,
				x: x - 10,
				y: y - 10,
				duration: 300,
				ease: 'Power',
			});
		});

		cardBg.on("pointerout", () => {
			emitter.particleTint = 0x3333ff;
			scene.tweens.add({
				targets: card,
				scaleX: 1.00,
				scaleY: 1.00,
				x,
				y,
				duration: 300,
				ease: 'Power',
			});
		});

		cardBg.on("pointerup", async () => {
			await tween({
				targets: [component],
				duration: 1000,
				alpha: 0,
			});

			component.destroy();

			resolve(choice);
		});

		const text = scene.add.text(
			cardWidth / 2, cardHeight / 2,
			choice.title,
			constants.defaultTextConfig
		);
		text.setOrigin(0.5);

		card.add(text);

		return card;
	});

	const confirmBtn = scene.btn(
		"Confirm",
		constants.SCREEN_WIDTH / 2, constants.SCREEN_HEIGHT - 100,
		() => {
			backdrop.destroy();
			title.destroy();
			scene.updateUI();
		});

	component.add([backdrop, title, ...cards, confirmBtn]);

	component.setAlpha(0);

	scene.tweens.add({
		targets: component,
		alpha: 1,
		duration: 500,
		ease: 'Power',
		delay: 500,
	});
};
