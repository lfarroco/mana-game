import * as c from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { getCurrentScene } from "@Models/State";
import * as io from "@PhaserIO";
import { createUIButton } from "@Components/UIButton";
import { t } from "@i18n/i18n";
import { mustGetState, summon } from "@Systems/Chara/Chara";
import { makeUnit } from "@Models/Entities/Unit";
import { AbilityColors } from "@Models/Abilities";
import { delay } from "@Utils/animation";
import { damageFx } from "TriggerSystem/effects/visuals/damage";
import { shieldFx } from "TriggerSystem/effects/visuals/shield";
import { popText } from "@Systems/Chara/Animations";
import { healFx } from "TriggerSystem/effects/visuals/heal";
import { poisonFx } from "TriggerSystem/effects/visuals/poison";
import { regenFx } from "TriggerSystem/effects/visuals/regen";
import { createDescription } from "@Systems/Chara/createDescription";

const bbcode = (text: string, y: number) => getCurrentScene().add
	.rexBBCodeText(0, 0, text)
	.setPosition(c.MIDDLE_SCREEN_X, y)
	.setFontSize(38)
	.setOrigin(0)
	.setAlign("left")
	.setFontFamily("Arimo")
	.setOrigin(0.5)
	;

const text = (str: string, y: number) => io.Text(str)
	.setPosition(c.MIDDLE_SCREEN_X, y)
	.setOrigin(0.5)
	.setFontSize(38)

const slides = [
	() => io.Container([
		text(t("tutorial.slide1.row1"), 100),
		text(t("tutorial.slide1.row2"), 150),
		text(t("tutorial.slide1.row3"), 200),
		() => {
			const cont = io.Container();
			const unit = makeUnit("PLAYER_FORCE", "mana_crystal", { x: -2, y: 0.5 })
			const enemy = makeUnit("PLAYER_FORCE", "protective_crystal", { x: 0, y: 0.5 })

			const anim = async () => {
				const charas = await Promise.all([
					summon(unit),
					summon(enemy)
				]);
				cont.add(charas)
			}

			anim();

			return cont
		},
		io.Title1(t("tutorial.slide1.row4"))
			.setOrigin(0.5)
			.setPosition(c.MIDDLE_SCREEN_X - 330, 620),
		io.Title1(t("tutorial.slide1.row5"))
			.setOrigin(0.5)
			.setPosition(c.MIDDLE_SCREEN_X + 200, 620),
	]),
	() => io.Container([
		text(t("tutorial.slide2.row1"), 100),
		text(t("tutorial.slide2.row2"), 150),
		text(t("tutorial.slide2.row3"), 200),
		() => {
			const cont = io.Container([])
			const fn = async (x: number, y: number, sprite: string) => {
				const chara = await summon(makeUnit("PLAYER_FORCE", sprite, { x, y }))

				cont.add(chara)
			}
			fn(-1.7, 0.3, "void_spawn");
			fn(-0.7, 0.3, "commander");
			fn(0.3, 0.3, "battle_medic");
			fn(-1.7, 1.3, "symbiote");
			fn(-0.7, 1.3, "plague_dr");
			fn(0.3, 1.3, "f1_peacekeeper");

			return cont;

		}
	]),
	() => io.Container([
		text(t("tutorial.slide3.row1"), 100),
		bbcode(`[color=${AbilityColors.damage}]${t("tooltip.effects.damage")}[/color]: ${t("tutorial.slide3.row2")}`, 150),
		() => {

			const c = io.Container();
			const summonUnits = async () => {

				const unit = makeUnit("PLAYER_FORCE", "avatar_of_anger", { x: -2, y: 0.5 })
				const enemy = makeUnit("PLAYER_FORCE", "protective_crystal", { x: 0, y: 0.5 })

				const [chara, chara2] = await Promise.all([
					summon(unit),
					summon(enemy)
				]);
				const s = mustGetState(chara);

				c.add(chara);
				c.add(chara2);
				if (!c.active) return;
				const anim = async () => {
					s.sprite.anims.play(`${unit.pic}_attack`, true);
					s.sprite.playAfterRepeat(`${unit.pic}_idle`);
					await delay(1000);
					if (s.sprite.active)
						damageFx(
							chara,
							chara2,
							() => {
								popText({
									x: chara2.x,
									y: chara2.y,
									text: "-" + unit.power,
									type: "damage"
								})
							}
						)

				};

				if (!s.sprite.active) return;
				anim();

				const effect = getCurrentScene().time.addEvent({
					repeat: -1,
					delay: 3000,
					callback: anim
				})

				chara.on("destroy", () => {
					effect.destroy();
				})

			}

			summonUnits();

			return c;

		}

	]),
	() => io.Container([
		text(t("tutorial.slide4.row1"), 100),
		bbcode(`[color=${AbilityColors.shield}]${t("tooltip.effects.shield")}[/color]: ${t("tutorial.slide4.row2")}`, 150),
		() => {

			const c = io.Container();
			const summonUnit = async () => {

				const unit = makeUnit("PLAYER_FORCE", "living_armor", { x: 0, y: 0.5 })
				const ally = makeUnit("PLAYER_FORCE", "mana_crystal", { x: -1, y: 0.5 })
				const [chara, chara2] = await Promise.all([
					summon(unit),
					summon(ally)
				]);
				const s = mustGetState(chara);

				c.add(chara);
				c.add(chara2);
				if (!c.active) return;
				const anim = async () => {
					s.sprite.anims.play(`${unit.pic}_attack`, true);
					s.sprite.playAfterRepeat(`${unit.pic}_idle`);
					await delay(1000);

					if (s.sprite.active)
						shieldFx(
							chara,
							chara2,
							() => {
								popText({
									x: chara2.x,
									y: chara2.y,
									text: "+" + unit.power,
									type: "shield"
								})

							}
						);


				}
				anim();
				const effect = getCurrentScene().time.addEvent({
					repeat: -1,
					delay: 3000,
					callback: anim
				})

				chara.on("destroy", () => {
					effect.destroy();
				})

			}

			summonUnit();

			return c;

		}

	]),
	() => io.Container([
		text(t("tutorial.slide5.row1"), 100),
		bbcode(`[color=${AbilityColors.heal}]${t("tooltip.effects.heal")}[/color]: ${t("tutorial.slide5.row2")}`, 150),

		() => {

			const c = io.Container();
			const summonUnit = async () => {

				const unit = makeUnit("PLAYER_FORCE", "battle_medic", { x: 0, y: 0.5 })
				const ally = makeUnit("PLAYER_FORCE", "mana_crystal", { x: -1, y: 0.5 })

				const [chara, chara2] = await Promise.all([
					summon(unit),
					summon(ally)
				]);


				const s = mustGetState(chara);

				c.add(chara);
				c.add(chara2);
				if (!c.active) return;
				const anim = async () => {
					s.sprite.anims.play(`${unit.pic}_attack`, true);
					s.sprite.playAfterRepeat(`${unit.pic}_idle`);
					await delay(1000);
					if (s.sprite.active)
						healFx(
							chara,
							chara2,
							() => {
								popText({
									x: chara2.x,
									y: chara2.y,
									text: "+" + unit.power,
									type: "heal"
								})

							}
						);


				}
				anim();
				const effect = getCurrentScene().time.addEvent({
					repeat: -1,
					delay: 3000,
					callback: anim
				})

				chara.on("destroy", () => {
					effect.destroy();
				})

			}

			summonUnit();

			return c;

		}

	]),
	() => io.Container([
		text(t("tutorial.slide6.row1"), 100),
		bbcode(`[color=${AbilityColors.regen}]${t("tooltip.effects.regen")}[/color]: ${t("tutorial.slide6.row2")}`, 150),
		() => {

			const c = io.Container();
			const summonUnit = async () => {

				const unit = makeUnit("PLAYER_FORCE", "enchanted_treant", { x: 0, y: 0.5 })
				const ally = makeUnit("PLAYER_FORCE", "mana_crystal", { x: -1, y: 0.5 })

				const [chara, chara2] = await Promise.all([
					summon(unit),
					summon(ally)
				]);
				const s = mustGetState(chara);

				c.add(chara);
				c.add(chara2);
				s.sprite.anims.play(`${unit.pic}_attack`, true);
				s.sprite.playAfterRepeat(`${unit.pic}_idle`);
				await delay(1000);
				if (!c.active) return;
				regenFx(
					chara,
					chara2,
					() => {

						const regen = getCurrentScene().time.addEvent({
							repeat: -1,
							delay: 1000,
							callback: () => {
								if (!c.active) {
									regen.destroy();
									return;
								}
								popText({
									x: chara2.x,
									y: chara2.y,
									text: "+" + Math.floor(unit.power / 10),
									type: "heal"
								});
							}
						});
						chara.on("destroy", () => {
							regen.destroy();
						});

					}
				);


			}

			summonUnit();

			return c;

		}

	]),
	() => io.Container([
		text(t("tutorial.slide7.row1"), 100),
		bbcode(`[color=${AbilityColors.poison}]${t("tooltip.effects.poison")}[/color]: ${t("tutorial.slide7.row2")}`, 150),

		() => {

			const c = io.Container();
			const summonUnit = async () => {

				const unit = makeUnit("PLAYER_FORCE", "venomous_viper", { x: -2, y: 0.5 })

				const ally = makeUnit("PLAYER_FORCE", "mana_crystal", { x: 0, y: 0.5 })
				const [chara, chara2] = await Promise.all([

					summon(unit),
					summon(ally)
				])

				const s = mustGetState(chara);

				c.add(chara);
				c.add(chara2);
				s.sprite.anims.play(`${unit.pic}_attack`, true);
				s.sprite.playAfterRepeat(`${unit.pic}_idle`);
				await delay(1000);
				if (!c.active) return;
				poisonFx(
					chara,
					chara2,
					() => {

						const poisonTick = getCurrentScene().time.addEvent({
							repeat: -1,
							delay: 1000,
							callback: () => {
								if (!c.active) {
									poisonTick.destroy();
									return;
								}
								popText({
									x: chara2.x,
									y: chara2.y,
									text: "-" + Math.floor(unit.power / 10),
									type: "poison"
								});
							}
						});
						chara.on("destroy", () => {
							poisonTick.destroy();
						});

					}
				);


			}

			summonUnit();

			return c;

		}

	]),
	() => io.Container([
		text(t("tutorial.slide8.row1"), 100),
		text(t("tutorial.slide8.row2"), 150),
		bbcode(
			`[color=${AbilityColors.haste}]${t("tooltip.effects.haste")}[/color]: ${t("tutorial.slide8.row3")}`,
			200
		),
		bbcode(
			`[color=${AbilityColors.slow}]${t("tooltip.effects.slow")}[/color]: ${t("tutorial.slide8.row4")}`,
			250
		),
		bbcode(
			`[color=${AbilityColors.charge}]${t("tooltip.effects.charge")}[/color]: ${t("tutorial.slide8.row5")}`,
			300
		),
		bbcode(
			`[color=${AbilityColors.increase_power}]+x[/color]: ${t("tutorial.slide8.row6")}`,
			350
		),
		bbcode(
			`[color=${AbilityColors.increase_power}]+x*[/color]: ${t("tutorial.slide8.row7")}`,
			400
		),
		bbcode(
			`[color=${AbilityColors.increase_critical}]+x% crit[/color]: ${t("tutorial.slide8.row8")}`,
			450
		),
	]),
	() => io.Container([
		text(t("tutorial.slide9.row1"), 100),
		text(t("tutorial.slide9.row2"), 150),
		text(t("tutorial.slide9.row3"), 200),
		text(t("tutorial.slide9.row4"), 250),
		text(t("tutorial.slide9.row5"), 300),
		text(t("tutorial.slide9.row6"), 350)
	]),
	() => {

		const cont = io.Container();
		const title = io.Title1(t("tutorial.slide10.row1")).setPosition(c.MIDDLE_SCREEN_X, 100).setOrigin(0.5);
		cont.add(title);
		const unit = makeUnit("FORCE_PLAYER", "thunder_conduit", { x: -2, y: 0.5 })

		const anim = async () => {
			const chara = await summon(unit);

			cont.add(chara)

			const { title, description } = createDescription(chara);

			const titleText = getCurrentScene().add
				.text(800, 300, title, c.titleTextConfig)
				.setAlign("left");

			const descriptionText = getCurrentScene().add
				.rexBBCodeText(
					800,
					300 + 60,
					description)
				.setFontSize(30)
				.setAlign("left")
				.setWrapMode(1)
				.setFontFamily("Arimo");

			cont.add([
				titleText,
				descriptionText,
				text(t("tutorial.slide10.row2"), 600)
			]);

		}

		anim();

		return cont;
	},
	() => {

		const cont = io.Container();
		const title = text(t("tutorial.slide11.row1"), 100)
		cont.add(title);
		const unit = makeUnit("FORCE_PLAYER", "gunslinger", { x: -2, y: 0.5 })

		const anim = async () => {
			const chara = await summon(unit);

			cont.add(chara)

			const { title, description } = createDescription(chara);

			const titleText = getCurrentScene().add
				.text(800, 300, title, c.titleTextConfig)
				.setAlign("left");

			const descriptionText = getCurrentScene().add
				.rexBBCodeText(
					800,
					300 + 60,
					description)
				.setFontSize(30)
				.setAlign("left")
				.setWrapMode(1)
				.setFontFamily("Arimo");

			cont.add([
				titleText,
				descriptionText,
				text(t("tutorial.slide11.row2"), 600),
				text(t("tutorial.slide11.row3"), 650),
			]);

		}

		anim();

		return cont;
	},
	() => {

		const cont = io.Container();
		const title = text(t("tutorial.slide12.row1"), 100);
		cont.add(title);
		const unit = makeUnit("FORCE_PLAYER", "radiance_envoy", { x: -2, y: 0.5 })

		const anim = async () => {
			const chara = await summon(unit);

			cont.add(chara)

			const { title, description } = createDescription(chara);

			const titleText = getCurrentScene().add
				.text(800, 300, title, c.titleTextConfig)
				.setAlign("left");

			const descriptionText = getCurrentScene().add
				.rexBBCodeText(
					800,
					300 + 60,
					description)
				.setFontSize(30)
				.setAlign("left")
				.setWrapMode(1)
				.setFontFamily("Arimo");

			cont.add([
				titleText,
				descriptionText,
				text(t("tutorial.slide12.row2"), 600),
				text(t("tutorial.slide12.row3"), 650)
			]);

		}

		anim();

		return cont;
	},
	() => {

		const cont = io.Container();
		const title = text(t("tutorial.slide13.row1"), 100);
		cont.add(title);
		const unit = makeUnit("FORCE_PLAYER", "grove_guardian", { x: -2, y: 0.5 })

		const anim = async () => {
			const chara = await summon(unit);

			cont.add(chara)

			const { title, description } = createDescription(chara);

			const titleText = getCurrentScene().add
				.text(800, 300, title, c.titleTextConfig)
				.setAlign("left");

			const descriptionText = getCurrentScene().add
				.rexBBCodeText(
					800,
					300 + 60,
					description)
				.setFontSize(30)
				.setAlign("left")
				.setWrapMode(1)
				.setFontFamily("Arimo");


			cont.add([
				titleText,
				descriptionText,
				text(t("tutorial.slide13.row2"), 600),
				text(t("tutorial.slide13.row3"), 650),
				text(t("tutorial.slide13.row4"), 700)
			]);

		}

		anim();

		return cont;
	},
	() => io.Container([
		text(t("tutorial.slide14.row1"), 200),
		text(t("tutorial.slide14.row2"), 250),
		text(t("tutorial.slide14.row3"), 300),
		text(t("tutorial.slide14.row4"), 350)
	])
]

const OVERLAY_ALPHA = 0.85;
const BUTTON_Y = c.SCREEN_HEIGHT - 80;

let isOpen = false;

export async function openTutorial(): Promise<void> {
	if (isOpen) return;
	isOpen = true;

	const scene = getCurrentScene();

	let currentSlide = 0;

	const overlay = scene.add.rectangle(
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

	const prevButton = createUIButton(
		t("tutorial.previous"),
		vec2(200, c.MIDDLE_SCREEN_Y),
		() => {
			if (currentSlide > 0) {
				currentSlide--;
				updateSlide();
			}
		}
	);

	const nextButton = createUIButton(
		t("tutorial.next"),
		vec2(c.SCREEN_WIDTH - 200, c.MIDDLE_SCREEN_Y),
		() => {
			if (currentSlide < slides.length - 1) {
				currentSlide++;
				updateSlide();
			}
		}
	);

	const exitButton = createUIButton(
		t("tutorial.exit"),
		vec2(c.MIDDLE_SCREEN_X, BUTTON_Y),
		() => {
			container.destroy(true);
			isOpen = false;
		}
	);

	const container = io.Container([
		overlay,
		slide,
		prevButton.container,
		nextButton.container,
		exitButton.container,
	]);

	updateSlide();
}
