import * as c from "../../../../Constants";
import * as Geometry from "@Models/Geometry";
import * as UIButton from "@Components/Button/UIButton";
import * as i18n from "@i18n/i18n";
import * as Chara from "@Systems/Chara/Chara";
import * as Unit from "@Models/Entities/Unit";
import * as Abilities from "@Models/Abilities";
import * as animation from "@Utils/animation";
import * as damage from "TriggerSystem/effects/visuals/damage";
import * as shield from "TriggerSystem/effects/visuals/shield";
import * as Animations from "@Systems/Chara/Animations";
import * as heal from "TriggerSystem/effects/visuals/heal";
import * as poison from "TriggerSystem/effects/visuals/poison";
import * as regen from "TriggerSystem/effects/visuals/regen";
import * as createDescription from "@Systems/Chara/createDescription";

const bbcode = (text: string, y: number) =>
	io.scene
		.add.rexBBCodeText(0, 0, text)
		.setPosition(c.MIDDLE_SCREEN_X, y)
		.setFontSize(38)
		.setOrigin(0)
		.setAlign("left")
		.setFontFamily("Arimo")
		.setOrigin(0.5);

const text = (str: string, y: number) =>
	io.Text(str).setPosition(c.MIDDLE_SCREEN_X, y).setOrigin(0.5).setFontSize(38);

const slides = [
	() =>
		io.Container([
			text(i18n.t("tutorial.slide1.row1"), 100),
			text(i18n.t("tutorial.slide1.row2"), 150),
			text(i18n.t("tutorial.slide1.row3"), 200),
			() => {
				const cont = io.Container();
				const unit = Unit.makeUnit("PLAYER_FORCE", "mana_crystal", { x: -2, y: 0.5 });
				const enemy = Unit.makeUnit("PLAYER_FORCE", "protective_crystal", { x: 0, y: 0.5 });

				const anim = async () => {
					const charas = await Promise.all([Chara.summon(unit), Chara.summon(enemy)]);
					cont.add(charas);
				};

				anim();

				return cont;
			},
			io
				.Title1(i18n.t("tutorial.slide1.row4"))
				.setOrigin(0.5)
				.setPosition(c.MIDDLE_SCREEN_X - 330, 620),
			io
				.Title1(i18n.t("tutorial.slide1.row5"))
				.setOrigin(0.5)
				.setPosition(c.MIDDLE_SCREEN_X + 200, 620),
		]),
	() =>
		io.Container([
			text(i18n.t("tutorial.slide2.row1"), 100),
			text(i18n.t("tutorial.slide2.row2"), 150),
			text(i18n.t("tutorial.slide2.row3"), 200),
			() => {
				const cont = io.Container([]);
				const fn = async (x: number, y: number, sprite: string) => {
					const chara = await Chara.summon(Unit.makeUnit("PLAYER_FORCE", sprite, { x, y }));

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
		io.Container([
			text(i18n.t("tutorial.slide3.row1"), 100),
			bbcode(
				`[color=${Abilities.ABILITY_COLORS.damage}]${i18n.t("tooltip.effects.damage")}[/color]: ${i18n.t("tutorial.slide3.row2")}`,
				150
			),
			() => {
				const c = io.Container();
				const summonUnits = async () => {
					const unit = Unit.makeUnit("PLAYER_FORCE", "avatar_of_anger", { x: -2, y: 0.5 });
					const enemy = Unit.makeUnit("PLAYER_FORCE", "protective_crystal", { x: 0, y: 0.5 });

					const [chara, chara2] = await Promise.all([Chara.summon(unit), Chara.summon(enemy)]);
					const s = Chara.mustGetState(chara);

					c.add(chara);
					c.add(chara2);
					if (!c.active) return;
					const anim = async () => {
						s.sprite.anims.play(`${unit.pic}_attack`, true);
						s.sprite.playAfterRepeat(`${unit.pic}_idle`);
						await animation.delay(1000);
						if (s.sprite.active)
							damage.damageFx(chara, chara2, () => {
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

					const effect = io.scene
						.time.addEvent({
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
		io.Container([
			text(i18n.t("tutorial.slide4.row1"), 100),
			bbcode(
				`[color=${Abilities.ABILITY_COLORS.shield}]${i18n.t("tooltip.effects.shield")}[/color]: ${i18n.t("tutorial.slide4.row2")}`,
				150
			),
			() => {
				const c = io.Container();
				const summonUnit = async () => {
					const unit = Unit.makeUnit("PLAYER_FORCE", "living_armor", { x: 0, y: 0.5 });
					const ally = Unit.makeUnit("PLAYER_FORCE", "mana_crystal", { x: -1, y: 0.5 });
					const [chara, chara2] = await Promise.all([Chara.summon(unit), Chara.summon(ally)]);
					const s = Chara.mustGetState(chara);

					c.add(chara);
					c.add(chara2);
					if (!c.active) return;
					const anim = async () => {
						s.sprite.anims.play(`${unit.pic}_attack`, true);
						s.sprite.playAfterRepeat(`${unit.pic}_idle`);
						await animation.delay(1000);

						if (s.sprite.active)
							shield.shieldFx(chara, chara2, () => {
								Animations.popText({
									x: chara2.x,
									y: chara2.y,
									text: "+" + unit.power,
									type: "shield",
								});
							});
					};
					anim();
					const effect = io.scene
						.time.addEvent({
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
		io.Container([
			text(i18n.t("tutorial.slide5.row1"), 100),
			bbcode(
				`[color=${Abilities.ABILITY_COLORS.heal}]${i18n.t("tooltip.effects.heal")}[/color]: ${i18n.t("tutorial.slide5.row2")}`,
				150
			),

			() => {
				const c = io.Container();
				const summonUnit = async () => {
					const unit = Unit.makeUnit("PLAYER_FORCE", "battle_medic", { x: 0, y: 0.5 });
					const ally = Unit.makeUnit("PLAYER_FORCE", "mana_crystal", { x: -1, y: 0.5 });

					const [chara, chara2] = await Promise.all([Chara.summon(unit), Chara.summon(ally)]);

					const s = Chara.mustGetState(chara);

					c.add(chara);
					c.add(chara2);
					if (!c.active) return;
					const anim = async () => {
						s.sprite.anims.play(`${unit.pic}_attack`, true);
						s.sprite.playAfterRepeat(`${unit.pic}_idle`);
						await animation.delay(1000);
						if (s.sprite.active)
							heal.healFx(chara, chara2, () => {
								Animations.popText({
									x: chara2.x,
									y: chara2.y,
									text: "+" + unit.power,
									type: "heal",
								});
							});
					};
					anim();
					const effect = io.scene
						.time.addEvent({
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
		io.Container([
			text(i18n.t("tutorial.slide6.row1"), 100),
			bbcode(
				`[color=${Abilities.ABILITY_COLORS.regen}]${i18n.t("tooltip.effects.regen")}[/color]: ${i18n.t("tutorial.slide6.row2")}`,
				150
			),
			() => {
				const c = io.Container();
				const summonUnit = async () => {
					const unit = Unit.makeUnit("PLAYER_FORCE", "enchanted_treant", { x: 0, y: 0.5 });
					const ally = Unit.makeUnit("PLAYER_FORCE", "mana_crystal", { x: -1, y: 0.5 });

					const [chara, chara2] = await Promise.all([Chara.summon(unit), Chara.summon(ally)]);
					const s = Chara.mustGetState(chara);

					c.add(chara);
					c.add(chara2);
					s.sprite.anims.play(`${unit.pic}_attack`, true);
					s.sprite.playAfterRepeat(`${unit.pic}_idle`);
					await animation.delay(1000);
					if (!c.active) return;
					regen.regenFx(chara, chara2, () => {
						const regen = io.scene
							.time.addEvent({
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
		io.Container([
			text(i18n.t("tutorial.slide7.row1"), 100),
			bbcode(
				`[color=${Abilities.ABILITY_COLORS.poison}]${i18n.t("tooltip.effects.poison")}[/color]: ${i18n.t("tutorial.slide7.row2")}`,
				150
			),

			() => {
				const c = io.Container();
				const summonUnit = async () => {
					const unit = Unit.makeUnit("PLAYER_FORCE", "venomous_viper", { x: -2, y: 0.5 });

					const ally = Unit.makeUnit("PLAYER_FORCE", "mana_crystal", { x: 0, y: 0.5 });
					const [chara, chara2] = await Promise.all([Chara.summon(unit), Chara.summon(ally)]);

					const s = Chara.mustGetState(chara);

					c.add(chara);
					c.add(chara2);
					s.sprite.anims.play(`${unit.pic}_attack`, true);
					s.sprite.playAfterRepeat(`${unit.pic}_idle`);
					await animation.delay(1000);
					if (!c.active) return;
					poison.poisonFx(chara, chara2, () => {
						const poisonTick = io.scene
							.time.addEvent({
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
		io.Container([
			io.Title1(i18n.t("tutorial.slide8.row1")).setPosition(c.MIDDLE_SCREEN_X, 100).setOrigin(0.5),
			text(i18n.t("tutorial.slide8.row2"), 150),
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
		io.Container([
			io.Title1(i18n.t("tutorial.slide9.row1")).setPosition(c.MIDDLE_SCREEN_X, 100).setOrigin(0.5),
			text(i18n.t("tutorial.slide9.row3"), 200),
			text(i18n.t("tutorial.slide9.row4"), 250),
			text(i18n.t("tutorial.slide9.row5"), 300),
		]),
	() => {
		const cont = io.Container();
		const title = io
			.Title1(i18n.t("tutorial.slide10.row1"))
			.setPosition(c.MIDDLE_SCREEN_X, 100)
			.setOrigin(0.5);
		cont.add(title);
		const unit = Unit.makeUnit("FORCE_PLAYER", "thunder_conduit", { x: -2, y: 0.5 });

		const anim = async () => {
			const chara = await Chara.summon(unit);

			cont.add(chara);

			const { title, description } = createDescription.createDescription(chara);

			const titleText = io.scene
				.add.text(800, 300, title, c.titleTextConfig)
				.setAlign("left");

			const descriptionText = io.scene
				.add.rexBBCodeText(800, 300 + 60, description)
				.setFontSize(30)
				.setAlign("left")
				.setWrapMode(1)
				.setFontFamily("Arimo");

			cont.add([titleText, descriptionText, text(i18n.t("tutorial.slide10.row2"), 600)]);
		};

		anim();

		return cont;
	},
	() => {
		const cont = io.Container();
		const title = io
			.Title1(i18n.t("tutorial.slide11.row1"))
			.setPosition(c.MIDDLE_SCREEN_X, 100)
			.setOrigin(0.5);
		cont.add(title);
		const unit = Unit.makeUnit("FORCE_PLAYER", "gunslinger", { x: -2, y: 0.5 });

		const anim = async () => {
			const chara = await Chara.summon(unit);

			cont.add(chara);

			const { title, description } = createDescription.createDescription(chara);

			const titleText = io.scene
				.add.text(800, 300, title, c.titleTextConfig)
				.setAlign("left");

			const descriptionText = io.scene
				.add.rexBBCodeText(800, 300 + 60, description)
				.setFontSize(30)
				.setAlign("left")
				.setWrapMode(1)
				.setFontFamily("Arimo");

			cont.add([
				titleText,
				descriptionText,
				text(i18n.t("tutorial.slide11.row2"), 600),
				text(i18n.t("tutorial.slide11.row3"), 650),
			]);
		};

		anim();

		return cont;
	},
	() => {
		const cont = io.Container();
		const title = io
			.Title1(i18n.t("tutorial.slide12.row1"))
			.setPosition(c.MIDDLE_SCREEN_X, 100)
			.setOrigin(0.5);
		cont.add(title);
		const unit = Unit.makeUnit("FORCE_PLAYER", "radiance_envoy", { x: -2, y: 0.5 });

		const anim = async () => {
			const chara = await Chara.summon(unit);

			cont.add(chara);

			const { title, description } = createDescription.createDescription(chara);

			const titleText = io.scene
				.add.text(800, 300, title, c.titleTextConfig)
				.setAlign("left");

			const descriptionText = io.scene
				.add.rexBBCodeText(800, 300 + 60, description)
				.setFontSize(30)
				.setAlign("left")
				.setWrapMode(1)
				.setFontFamily("Arimo");

			cont.add([
				titleText,
				descriptionText,
				text(i18n.t("tutorial.slide12.row2"), 600),
				text(i18n.t("tutorial.slide12.row3"), 650),
			]);
		};

		anim();

		return cont;
	},
	() => {
		const cont = io.Container();
		const title = io
			.Title1(i18n.t("tutorial.slide13.row1"))
			.setPosition(c.MIDDLE_SCREEN_X, 100)
			.setOrigin(0.5);
		cont.add(title);
		const unit = Unit.makeUnit("FORCE_PLAYER", "grove_guardian", { x: -2, y: 0.5 });

		const anim = async () => {
			const chara = await Chara.summon(unit);

			cont.add(chara);

			const { title, description } = createDescription.createDescription(chara);

			const titleText = io.scene
				.add.text(800, 300, title, c.titleTextConfig)
				.setAlign("left");

			const descriptionText = io.scene
				.add.rexBBCodeText(800, 300 + 60, description)
				.setFontSize(30)
				.setAlign("left")
				.setWrapMode(1)
				.setFontFamily("Arimo");

			cont.add([
				titleText,
				descriptionText,
				text(i18n.t("tutorial.slide13.row2"), 600),
				text(i18n.t("tutorial.slide13.row3"), 650),
				text(i18n.t("tutorial.slide13.row4"), 700),
			]);
		};

		anim();

		return cont;
	},
	() =>
		io.Container([
			text(i18n.t("tutorial.slide14.row1"), 200),
			text(i18n.t("tutorial.slide14.row2"), 250),
			text(i18n.t("tutorial.slide14.row3"), 300),
			text(i18n.t("tutorial.slide14.row4"), 350),
		]),
];

const OVERLAY_ALPHA = 0.85;
const BUTTON_Y = c.SCREEN_HEIGHT - 80;

let isOpen = false;

export async function openTutorial(): Promise<void> {
	if (isOpen) return;
	isOpen = true;

	let currentSlide = 0;

	const overlay = io.scene.add.rectangle(
		c.MIDDLE_SCREEN_X,
		c.MIDDLE_SCREEN_Y,
		c.SCREEN_WIDTH,
		c.SCREEN_HEIGHT,
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
		position: Geometry.vec2(200, c.MIDDLE_SCREEN_Y),
		callback: () => {
			if (currentSlide > 0) {
				currentSlide--;
				updateSlide();
			}
		},
	});

	const nextButton = UIButton.create({
		text: i18n.t("tutorial.next"),
		position: Geometry.vec2(c.SCREEN_WIDTH - 200, c.MIDDLE_SCREEN_Y),
		callback: () => {
			if (currentSlide < slides.length - 1) {
				currentSlide++;
				updateSlide();
			}
		},
	});

	const exitButton = UIButton.create({
		text: i18n.t("tutorial.exit"),
		position: Geometry.vec2(c.MIDDLE_SCREEN_X, BUTTON_Y),
		callback: () => {
			container.destroy(true);
			isOpen = false;
		},
	});

	const container = io.Container([
		overlay,
		slide,
		prevButton.container,
		nextButton.container,
		exitButton.container,
	]);

	updateSlide();
}
