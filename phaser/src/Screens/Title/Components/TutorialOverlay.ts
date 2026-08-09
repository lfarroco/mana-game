import * as Constants from "@Constants";
import * as UIButton from "@Components/Button/UIButton";
import * as i18n from "@i18n/i18n";
import * as Chara from "@Components/Chara/Chara";
import * as Card from "@game/Entities/Card";
import * as Abilities from "@Models/Abilities";
import * as animation from "@Utils/animation";
import * as damage from "@Screens/Battleground/Phases/Combat/logHandlers/visuals/damage";
import * as shield from "@Screens/Battleground/Phases/Combat/logHandlers/visuals/shield";
import * as Animations from "@Components/Chara/Animations";
import * as heal from "@Screens/Battleground/Phases/Combat/logHandlers/visuals/heal";
import * as poison from "@Screens/Battleground/Phases/Combat/logHandlers/visuals/poison";
import * as regen from "@Screens/Battleground/Phases/Combat/logHandlers/visuals/regen";
import * as createDescription from "@Components/Chara/createDescription";
import { env } from "@Env";
import { makeContainer } from "@Env";

const bbcode = (text: string, y: number) =>
	env.scene.add
		.rexBBCodeText(0, 0, text)
		.setPosition(Constants.MIDDLE_SCREEN_X, y)
		.setFontSize(38)
		.setOrigin(0)
		.setAlign("left")
		.setFontFamily("Arimo")
		.setOrigin(0.5);

const text = (str: string, y: number) =>
	env.scene.add
		.text(0, 0, i18n.t(str), Constants.defaultTextConfig)
		.setPosition(Constants.MIDDLE_SCREEN_X, y)
		.setOrigin(0.5)
		.setFontSize(38);

const slides = [
	() =>
		makeContainer([
			text("tutorial.slide1.row1", 100),
			text("tutorial.slide1.row2", 150),
			text("tutorial.slide1.row3", 200),
			() => {
				const cont = makeContainer();
				const unit = Card.makeUnit("PLAYER_FORCE", "mana_crystal", [-2, 0.5]);
				const enemy = Card.makeUnit("PLAYER_FORCE", "protective_crystal", [0, 0.5]);

				const anim = async () => {
					const charas = await Promise.all([Chara.summon(unit), Chara.summon(enemy)]);
					cont.add(charas);
				};

				anim();

				return cont;
			},
			env.scene.add
				.text(0, 0, i18n.t("tutorial.slide1.row4"), Constants.titleTextConfig)
				.setOrigin(0.5)
				.setPosition(Constants.MIDDLE_SCREEN_X - 330, 620),
			env.scene.add
				.text(0, 0, i18n.t("tutorial.slide1.row5"), Constants.titleTextConfig)
				.setOrigin(0.5)
				.setPosition(Constants.MIDDLE_SCREEN_X + 200, 620),
		]),
	() =>
		makeContainer([
			text("tutorial.slide2.row1", 100),
			text("tutorial.slide2.row2", 150),
			text("tutorial.slide2.row3", 200),
			() => {
				const cont = makeContainer();
				const fn = async (x: number, y: number, sprite: string) => {
					const chara = await Chara.summon(Card.makeUnit("PLAYER_FORCE", sprite, [x, y]));

					cont.add(chara);
				};
				fn(-1.7, 0.3, "void_spawn");
				fn(-0.7, 0.3, "commander");
				fn(0.3, 0.3, "battle_medic");
				fn(-1.7, 1.3, "symbiote");
				fn(-0.7, 1.3, "plague_dr");
				fn(0.3, 1.3, "f1_peacekeeper");

				return cont;
			},
		]),
	() =>
		makeContainer([
			text("tutorial.slide3.row1", 100),
			bbcode(
				`[color=${Abilities.ABILITY_COLORS.damage}]${i18n.t("tooltip.effects.damage")}[/color]: ${i18n.t("tutorial.slide3.row2")}`,
				150
			),
			() => {
				const c = makeContainer();
				const summonUnits = async () => {
					const unit = Card.makeUnit("PLAYER_FORCE", "avatar_of_anger", [-2, 0.5]);
					const enemy = Card.makeUnit("PLAYER_FORCE", "protective_crystal", [0, 0.5]);

					const [chara, chara2] = await Promise.all([Chara.summon(unit), Chara.summon(enemy)]);
					const s = Chara.mustGetState(chara);

					c.add(chara);
					c.add(chara2);
					if (!c.active) return;
					const anim = async () => {
						Chara.playAnimation(chara, "attack");
						Chara.playAnimationAfterRepeat(chara, "idle");
						await animation.delay(1000);
						if (s.sprite.active)
							damage.damageFx([chara.x, chara.y], [chara2.x, chara2.y], () => {
								Animations.popText({
									x: chara2.x,
									y: chara2.y,
									text: "-" + unit.power,
									type: "damage",
								});
							});
					};

					if (!s.sprite.active) return;
					anim();

					const effect = env.scene.time.addEvent({
						repeat: -1,
						delay: 3000,
						callback: anim,
					});

					chara.on("destroy", () => {
						effect.destroy();
					});
				};

				summonUnits();

				return c;
			},
		]),
	() =>
		makeContainer([
			text("tutorial.slide4.row1", 100),
			bbcode(
				`[color=${Abilities.ABILITY_COLORS.shield}]${i18n.t("tooltip.effects.shield")}[/color]: ${i18n.t("tutorial.slide4.row2")}`,
				150
			),
			() => {
				const c = makeContainer();
				const summonUnit = async () => {
					const unit = Card.makeUnit("PLAYER_FORCE", "living_armor", [0, 0.5]);
					const ally = Card.makeUnit("PLAYER_FORCE", "mana_crystal", [-1, 0.5]);
					const [chara, chara2] = await Promise.all([Chara.summon(unit), Chara.summon(ally)]);
					const s = Chara.mustGetState(chara);

					c.add(chara);
					c.add(chara2);
					if (!c.active) return;
					const anim = async () => {
						Chara.playAnimation(chara, "attack");
						Chara.playAnimationAfterRepeat(chara, "idle");
						await animation.delay(1000);

						if (s.sprite.active)
							shield.shieldFx([chara.x, chara.y], [chara2.x, chara2.y], () => {
								Animations.popText({
									x: chara2.x,
									y: chara2.y,
									text: "+" + unit.power,
									type: "shield",
								});
							});
					};
					anim();
					const effect = env.scene.time.addEvent({
						repeat: -1,
						delay: 3000,
						callback: anim,
					});

					chara.on("destroy", () => {
						effect.destroy();
					});
				};

				summonUnit();

				return c;
			},
		]),
	() =>
		makeContainer([
			text("tutorial.slide5.row1", 100),
			bbcode(
				`[color=${Abilities.ABILITY_COLORS.heal}]${i18n.t("tooltip.effects.heal")}[/color]: ${i18n.t("tutorial.slide5.row2")}`,
				150
			),

			() => {
				const c = makeContainer();
				const summonUnit = async () => {
					const unit = Card.makeUnit("PLAYER_FORCE", "battle_medic", [0, 0.5]);
					const ally = Card.makeUnit("PLAYER_FORCE", "mana_crystal", [-1, 0.5]);

					const [chara, chara2] = await Promise.all([Chara.summon(unit), Chara.summon(ally)]);

					const s = Chara.mustGetState(chara);

					c.add(chara);
					c.add(chara2);
					if (!c.active) return;
					const anim = async () => {
						Chara.playAnimation(chara, "attack");
						Chara.playAnimationAfterRepeat(chara, "idle");
						await animation.delay(1000);
						if (s.sprite.active)
							heal.healFx([chara.x, chara.y], [chara2.x, chara2.y], () => {
								Animations.popText({
									x: chara2.x,
									y: chara2.y,
									text: "+" + unit.power,
									type: "heal",
								});
							});
					};
					anim();
					const effect = env.scene.time.addEvent({
						repeat: -1,
						delay: 3000,
						callback: anim,
					});

					chara.on("destroy", () => {
						effect.destroy();
					});
				};

				summonUnit();

				return c;
			},
		]),
	() =>
		makeContainer([
			text("tutorial.slide6.row1", 100),
			bbcode(
				`[color=${Abilities.ABILITY_COLORS.regen}]${i18n.t("tooltip.effects.regen")}[/color]: ${i18n.t("tutorial.slide6.row2")}`,
				150
			),
			() => {
				const c = makeContainer();
				const summonUnit = async () => {
					const unit = Card.makeUnit("PLAYER_FORCE", "enchanted_treant", [0, 0.5]);
					const ally = Card.makeUnit("PLAYER_FORCE", "mana_crystal", [-1, 0.5]);

					const [chara, chara2] = await Promise.all([Chara.summon(unit), Chara.summon(ally)]);

					c.add(chara);
					c.add(chara2);
					Chara.playAnimation(chara, "attack");
					Chara.playAnimationAfterRepeat(chara, "idle");
					await animation.delay(1000);
					if (!c.active) return;
					regen.regenFx([chara.x, chara.y], [chara2.x, chara2.y], () => {
						const regen = env.scene.time.addEvent({
							repeat: -1,
							delay: 1000,
							callback: () => {
								if (!c.active) {
									regen.destroy();
									return;
								}
								Animations.popText({
									x: chara2.x,
									y: chara2.y,
									text: "+" + Math.floor(unit.power / 10),
									type: "heal",
								});
							},
						});
						chara.on("destroy", () => {
							regen.destroy();
						});
					});
				};

				summonUnit();

				return c;
			},
		]),
	() =>
		makeContainer([
			text("tutorial.slide7.row1", 100),
			bbcode(
				`[color=${Abilities.ABILITY_COLORS.poison}]${i18n.t("tooltip.effects.poison")}[/color]: ${i18n.t("tutorial.slide7.row2")}`,
				150
			),

			() => {
				const c = makeContainer();
				const summonUnit = async () => {
					const unit = Card.makeUnit("PLAYER_FORCE", "venomous_viper", [-2, 0.5]);

					const ally = Card.makeUnit("PLAYER_FORCE", "mana_crystal", [0, 0.5]);
					const [chara, chara2] = await Promise.all([Chara.summon(unit), Chara.summon(ally)]);

					c.add(chara);
					c.add(chara2);
					Chara.playAnimation(chara, "attack");
					Chara.playAnimationAfterRepeat(chara, "idle");
					await animation.delay(1000);
					if (!c.active) return;
					poison.poisonFx([chara.x, chara.y], [chara2.x, chara2.y], () => {
						const poisonTick = env.scene.time.addEvent({
							repeat: -1,
							delay: 1000,
							callback: () => {
								if (!c.active) {
									poisonTick.destroy();
									return;
								}
								Animations.popText({
									x: chara2.x,
									y: chara2.y,
									text: "-" + Math.floor(unit.power / 10),
									type: "poison",
								});
							},
						});
						chara.on("destroy", () => {
							poisonTick.destroy();
						});
					});
				};

				summonUnit();

				return c;
			},
		]),
	() =>
		makeContainer([
			env.scene.add
				.text(0, 0, i18n.t("tutorial.slide8.row1"), Constants.titleTextConfig)
				.setPosition(Constants.MIDDLE_SCREEN_X, 100)
				.setOrigin(0.5),
			text("tutorial.slide8.row2", 150),
			bbcode(
				`[color=${Abilities.ABILITY_COLORS.haste}]${i18n.t("tooltip.effects.haste")}[/color]: ${i18n.t("tutorial.slide8.row3")}`,
				200
			),
			bbcode(
				`[color=${Abilities.ABILITY_COLORS.slow}]${i18n.t("tooltip.effects.slow")}[/color]: ${i18n.t("tutorial.slide8.row4")}`,
				250
			),
			bbcode(
				`[color=${Abilities.ABILITY_COLORS.charge}]${i18n.t("tooltip.effects.charge")}[/color]: ${i18n.t("tutorial.slide8.row5")}`,
				300
			),
			bbcode(
				`[color=${Abilities.ABILITY_COLORS.increase_power}]+x[/color]: ${i18n.t("tutorial.slide8.row6")}`,
				350
			),
			bbcode(
				`[color=${Abilities.ABILITY_COLORS.increase_power}]+x*[/color]: ${i18n.t("tutorial.slide8.row7")}`,
				400
			),
			bbcode(
				`[color=${Abilities.ABILITY_COLORS.increase_critical}]+x% crit[/color]: ${i18n.t("tutorial.slide8.row8")}`,
				450
			),
		]),
	() =>
		makeContainer([
			env.scene.add
				.text(0, 0, i18n.t("tutorial.slide9.row1"), Constants.titleTextConfig)
				.setPosition(Constants.MIDDLE_SCREEN_X, 100)
				.setOrigin(0.5),
			text("tutorial.slide9.row3", 200),
			text("tutorial.slide9.row4", 250),
			text("tutorial.slide9.row5", 300),
		]),
	() => {
		const cont = makeContainer();
		const title = env.scene.add
			.text(0, 0, i18n.t("tutorial.slide10.row1"), Constants.titleTextConfig)
			.setPosition(Constants.MIDDLE_SCREEN_X, 100)
			.setOrigin(0.5);
		cont.add(title);
		const unit = Card.makeUnit("FORCE_PLAYER", "thunder_conduit", [-2, 0.5]);

		const anim = async () => {
			const chara = await Chara.summon(unit);

			cont.add(chara);

			const { title, description } = createDescription.createDescription(chara);

			const titleText = env.scene.add
				.text(800, 300, title, Constants.titleTextConfig)
				.setAlign("left");

			const descriptionText = env.scene.add
				.rexBBCodeText(800, 300 + 60, description)
				.setFontSize(30)
				.setAlign("left")
				.setWrapMode(1)
				.setFontFamily("Arimo");

			cont.add([titleText, descriptionText, text("tutorial.slide10.row2", 600)]);
		};

		anim();

		return cont;
	},
	() => {
		const cont = makeContainer();
		const title = env.scene.add
			.text(0, 0, i18n.t("tutorial.slide11.row1"), Constants.titleTextConfig)
			.setPosition(Constants.MIDDLE_SCREEN_X, 100)
			.setOrigin(0.5);
		cont.add(title);
		const unit = Card.makeUnit("FORCE_PLAYER", "gunslinger", [-2, 0.5]);

		const anim = async () => {
			const chara = await Chara.summon(unit);

			cont.add(chara);

			const { title, description } = createDescription.createDescription(chara);

			const titleText = env.scene.add
				.text(800, 300, title, Constants.titleTextConfig)
				.setAlign("left");

			const descriptionText = env.scene.add
				.rexBBCodeText(800, 300 + 60, description)
				.setFontSize(30)
				.setAlign("left")
				.setWrapMode(1)
				.setFontFamily("Arimo");

			cont.add([
				titleText,
				descriptionText,
				text("tutorial.slide11.row2", 600),
				text("tutorial.slide11.row3", 650),
			]);
		};

		anim();

		return cont;
	},
	() => {
		const cont = makeContainer();
		const title = env.scene.add
			.text(0, 0, i18n.t("tutorial.slide12.row1"), Constants.titleTextConfig)
			.setPosition(Constants.MIDDLE_SCREEN_X, 100)
			.setOrigin(0.5);
		cont.add(title);
		const unit = Card.makeUnit("FORCE_PLAYER", "radiance_envoy", [-2, 0.5]);

		const anim = async () => {
			const chara = await Chara.summon(unit);

			cont.add(chara);

			const { title, description } = createDescription.createDescription(chara);

			const titleText = env.scene.add
				.text(800, 300, title, Constants.titleTextConfig)
				.setAlign("left");

			const descriptionText = env.scene.add
				.rexBBCodeText(800, 300 + 60, description)
				.setFontSize(30)
				.setAlign("left")
				.setWrapMode(1)
				.setFontFamily("Arimo");

			cont.add([
				titleText,
				descriptionText,
				text("tutorial.slide12.row2", 600),
				text("tutorial.slide12.row3", 650),
			]);
		};

		anim();

		return cont;
	},
	() => {
		const cont = makeContainer();
		const title = env.scene.add
			.text(0, 0, i18n.t("tutorial.slide13.row1"), Constants.titleTextConfig)
			.setPosition(Constants.MIDDLE_SCREEN_X, 100)
			.setOrigin(0.5);
		cont.add(title);
		const unit = Card.makeUnit("FORCE_PLAYER", "grove_guardian", [-2, 0.5]);

		const anim = async () => {
			const chara = await Chara.summon(unit);

			cont.add(chara);

			const { title, description } = createDescription.createDescription(chara);

			const titleText = env.scene.add
				.text(800, 300, title, Constants.titleTextConfig)
				.setAlign("left");

			const descriptionText = env.scene.add
				.rexBBCodeText(800, 300 + 60, description)
				.setFontSize(30)
				.setAlign("left")
				.setWrapMode(1)
				.setFontFamily("Arimo");

			cont.add([
				titleText,
				descriptionText,
				text("tutorial.slide13.row2", 600),
				text("tutorial.slide13.row3", 650),
				text("tutorial.slide13.row4", 700),
			]);
		};

		anim();

		return cont;
	},
	() =>
		makeContainer([
			text("tutorial.slide14.row1", 200),
			text("tutorial.slide14.row2", 250),
			text("tutorial.slide14.row3", 300),
			text("tutorial.slide14.row4", 350),
		]),
];

const OVERLAY_ALPHA = 0.85;
const BUTTON_Y = Constants.SCREEN_HEIGHT - 80;

let isOpen = false;

export async function openTutorial(): Promise<void> {
	if (isOpen) return;
	isOpen = true;

	let currentSlide = 0;

	const overlay = env.scene.add.rectangle(
		Constants.MIDDLE_SCREEN_X,
		Constants.MIDDLE_SCREEN_Y,
		Constants.SCREEN_WIDTH,
		Constants.SCREEN_HEIGHT,
		0x000000,
		OVERLAY_ALPHA
	);
	overlay.setInteractive();

	let slide = slides[currentSlide]();

	const updateSlide = () => {
		container.remove(slide, true);

		slide = slides[currentSlide]();

		container.add(slide);

		if (currentSlide === 0) {
			prevButton.disable();
		} else {
			prevButton.enable();
		}

		if (currentSlide === slides.length - 1) {
			nextButton.disable();
		} else {
			nextButton.enable();
		}
	};

	const prevButton = UIButton.create({
		text: i18n.t("tutorial.previous"),
		position: [200, Constants.MIDDLE_SCREEN_Y],
		callback: () => {
			if (currentSlide > 0) {
				currentSlide--;
				updateSlide();
			}
		},
	});

	const nextButton = UIButton.create({
		text: i18n.t("tutorial.next"),
		position: [Constants.SCREEN_WIDTH - 200, Constants.MIDDLE_SCREEN_Y],
		callback: () => {
			if (currentSlide < slides.length - 1) {
				currentSlide++;
				updateSlide();
			}
		},
	});

	const exitButton = UIButton.create({
		text: i18n.t("tutorial.exit"),
		position: [Constants.MIDDLE_SCREEN_X, BUTTON_Y],
		callback: () => {
			container.destroy(true);
			isOpen = false;
		},
	});

	const container = makeContainer([
		overlay,
		slide,
		prevButton.container,
		nextButton.container,
		exitButton.container,
	]);

	updateSlide();
}
