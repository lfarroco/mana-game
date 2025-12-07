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

const bbcode = (text: string, x: number, y: number) => getCurrentScene().add
	.rexBBCodeText(0, 0, text)
	.setPosition(x, y)
	.setFontSize(38)
	.setOrigin(0)
	.setAlign("left")
	.setFontFamily("Arimo");

const slides = [
	() => io.Container([
		io.Title1("The goal of Mana Battle is to destroy the enemy crystal.")
			.setOrigin(0.5)
			.setPosition(c.MIDDLE_SCREEN_X, 100),
		io.Title1("The enemy wants to destroy yourt crystal, so protect it!")
			.setOrigin(0.5)
			.setPosition(c.MIDDLE_SCREEN_X, 150),
		io.Title1("Your crystal is located in the left board. The enemy, in the right board.")
			.setOrigin(0.5)
			.setPosition(c.MIDDLE_SCREEN_X, 200),
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
		io.Title1("Protect ⬆️")
			.setOrigin(0.5)
			.setPosition(c.MIDDLE_SCREEN_X - 330, 620),
		io.Title1("Destroy ⬆️")
			.setOrigin(0.5)
			.setPosition(c.MIDDLE_SCREEN_X + 200, 620),
	]),
	() => io.Container([
		io.Title1("To help you, you can recruit units from all corners of the galaxy.")
			.setOrigin(0.5)
			.setPosition(c.MIDDLE_SCREEN_X, 100),
		io.Title1("Units can only damage, shield or heal crystals, not each other.")
			.setOrigin(0.5)
			.setPosition(c.MIDDLE_SCREEN_X, 150),
		io.Title1("Units can make other units faster, slower or stronger.")
			.setOrigin(0.5)
			.setPosition(c.MIDDLE_SCREEN_X, 200),
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
		io.Title1("Unit basic abilities:")
			.setOrigin(0.5)
			.setPosition(c.MIDDLE_SCREEN_X, 100),
		bbcode(`[color=${AbilityColors.damage}]Damage[/color]: Damages the enemy crystal`, c.MIDDLE_SCREEN_X, 150)
			.setOrigin(0.5),
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
		io.Title1("Unit basic abilities:")
			.setOrigin(0.5)
			.setPosition(c.MIDDLE_SCREEN_X, 100),
		bbcode(`[color=${AbilityColors.shield}]Shield[/color]: Protects the crystal from enemy damage.`, c.MIDDLE_SCREEN_X, 150).setOrigin(0.5),
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
		io.Title1("Unit basic abilities:")
			.setOrigin(0.5)
			.setPosition(c.MIDDLE_SCREEN_X, 100),
		bbcode(`[color=${AbilityColors.heal}]Heal[/color]: Restore life. Every 20 heal removes 1 poison.`, c.MIDDLE_SCREEN_X, 150)
			.setOrigin(0.5),
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
		io.Title1("Unit basic abilities:")
			.setOrigin(0.5)
			.setPosition(c.MIDDLE_SCREEN_X, 100),
		bbcode(`[color=${AbilityColors.regen}]Regen[/color]: Restores life every 1 second.`, c.MIDDLE_SCREEN_X, 150)
			.setOrigin(0.5),
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
		io.Title1("Unit basic abilities:")
			.setOrigin(0.5)
			.setPosition(c.MIDDLE_SCREEN_X, 100),
		bbcode(`[color=${AbilityColors.poison}]Poison[/color]: Deduces life every 1 second. Ignores Shield.`, c.MIDDLE_SCREEN_X, 150)
			.setOrigin(0.5),
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

						const regen = getCurrentScene().time.addEvent({
							repeat: -1,
							delay: 1000,
							callback: () => {
								popText({
									x: chara2.x,
									y: chara2.y,
									text: "-" + Math.floor(unit.power / 10),
									type: "poison"
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
		io.Title1("Advanced abilities:")
			.setOrigin(0.5)
			.setPosition(c.MIDDLE_SCREEN_X, 100).setOrigin(0.5),
		io.Title1("These abilities can target both units and crystals.")
			.setOrigin(0.5)
			.setPosition(c.MIDDLE_SCREEN_X, 150).setOrigin(0.5),
		bbcode(
			`[color=${AbilityColors.haste}]Haste[/color]: Makes the unit cooldown reduce at double speed.`,
			c.MIDDLE_SCREEN_X,
			200
		).setOrigin(0.5),
		bbcode(
			`[color=${AbilityColors.slow}]Slow[/color]: Makes the cooldown reduce at half speed.`,
			c.MIDDLE_SCREEN_X,
			250
		).setOrigin(0.5),
		bbcode(
			`[color=${AbilityColors.charge}]Charge[/color]: Reduces current cooldown time.`,
			c.MIDDLE_SCREEN_X,
			300
		).setOrigin(0.5),
		bbcode(
			`[color=${AbilityColors.increase_power}]+x[/color]: Increases ability power during the current battle.`,
			c.MIDDLE_SCREEN_X,
			350
		).setOrigin(0.5),
		bbcode(
			`[color=${AbilityColors.increase_power}]+x*[/color]: Increases ability power permanently.`,
			c.MIDDLE_SCREEN_X,
			400
		).setOrigin(0.5),
		bbcode(
			`[color=${AbilityColors.increase_critical}]+x% critical[/color]: Increases the chance of causing double ability power.`,
			c.MIDDLE_SCREEN_X,
			450
		).setOrigin(0.5),
	]),
	() => io.Container([
		io.Title1("Reactions:").setPosition(c.MIDDLE_SCREEN_X, 100).setOrigin(0.5),
		io.Title1("⚡").setPosition(c.MIDDLE_SCREEN_X, 150).setFontSize(40).setOrigin(0.5),
		io.Title1(`This symbols signals that this unit can react to other unit's abilities.`)
			.setPosition(c.MIDDLE_SCREEN_X, 200).setOrigin(0.5),
		io.Title1("Reactions happen immediatelly.").setPosition(c.MIDDLE_SCREEN_X, 250).setOrigin(0.5),
		io.Title1("Units can't react to reactions.").setPosition(c.MIDDLE_SCREEN_X, 300).setOrigin(0.5),
		io.Title1("Reactions follow the pattern [source]->[effect]->[target]").setPosition(c.MIDDLE_SCREEN_X, 350).setOrigin(0.5),
	]),
	() => {

		const cont = io.Container();
		const title = io.Title1("⚡ Example").setPosition(c.MIDDLE_SCREEN_X, 100).setOrigin(0.5);
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
				descriptionText
			])

			const desc = io.Title1("When any ally uses Haste, this unit gains 5 power.")
				.setPosition(c.MIDDLE_SCREEN_X, 600).setOrigin(0.5);
			cont.add(desc);

		}

		anim();

		return cont;
	},
	() => {

		const cont = io.Container();
		const title = io.Title1("⚡ Example").setPosition(c.MIDDLE_SCREEN_X, 100).setOrigin(0.5);
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
				descriptionText
			])

			const row1 = io.Title1("Some reactions also involve positions.")
				.setPosition(c.MIDDLE_SCREEN_X, 600).setOrigin(0.5);
			cont.add(row1);
			const row2 = io.Title1("This one reacts when an ally in the same column uses Shield.")
				.setPosition(c.MIDDLE_SCREEN_X, 650).setOrigin(0.5);
			cont.add(row2);

		}

		anim();

		return cont;
	},
	() => {

		const cont = io.Container();
		const title = io.Title1("⚡ Example").setPosition(c.MIDDLE_SCREEN_X, 100).setOrigin(0.5);
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
				descriptionText
			])

			const row1 = io.Title1("This unit reacts to any allied effect in the same row.")
				.setPosition(c.MIDDLE_SCREEN_X, 600).setOrigin(0.5);
			cont.add(row1);
			const row2 = io.Title1("Then, it applies Haste to all allies in the same column.")
				.setPosition(c.MIDDLE_SCREEN_X, 650).setOrigin(0.5);
			cont.add(row2);

		}

		anim();

		return cont;
	},
	() => {

		const cont = io.Container();
		const title = io.Title1("⚡ Example").setPosition(c.MIDDLE_SCREEN_X, 100).setOrigin(0.5);
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
				descriptionText
			])

			const row1 = io.Title1("Some units can react to enemy actions.")
				.setPosition(c.MIDDLE_SCREEN_X, 600).setOrigin(0.5);
			cont.add(row1);
			const row2 = io.Title1("This unit reacts when any enemy uses Damage.")
				.setPosition(c.MIDDLE_SCREEN_X, 650).setOrigin(0.5);
			cont.add(row2);
			const row3 = io.Title1("Then, it gives 2 permanent power to the ally to its right.")
				.setPosition(c.MIDDLE_SCREEN_X, 700).setOrigin(0.5);
			cont.add(row3);

		}

		anim();

		return cont;
	},
	() => io.Container([
		io.Title1("Those are the basics of Mana Battle!").setPosition(c.MIDDLE_SCREEN_X, 200).setOrigin(0.5),
		io.Title1("There's still a lot to discover.").setPosition(c.MIDDLE_SCREEN_X, 250).setOrigin(0.5),
		io.Title1("Try getting a Gold Victory, or see how far you can get in Infinite Mode 😀").setPosition(c.MIDDLE_SCREEN_X, 300).setOrigin(0.5),
		io.Title1("Hope you have fun playing this game!").setPosition(c.MIDDLE_SCREEN_X, 350).setOrigin(0.5),
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
