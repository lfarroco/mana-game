/**
 * Tutorial slide render layer (purify C1 — the "render-layer rewrite" that
 * unlocks porting tutorialSlides.ts out of `phaser/`).
 *
 * The slide *content* (i18n keys, positions, demo specs) lives in core as pure
 * data (`@game/content/tutorialSlides`). This module renders that data into
 * Phaser game objects — text rows, BBCode rows, and animated demo scenes.
 */

import * as Constants from "@Constants";
import * as i18n from "@i18n/i18n";
import * as Chara from "@Components/Chara/Chara";
import type { Chara as CharaType } from "@Components/Chara/Chara";
import * as Animations from "@Components/Chara/Animations";
import * as createDescription from "@Components/Chara/createDescription";
import * as Card from "@game/Entities/Card";
import { ABILITY_COLORS } from "@game/data/abilityColors";
import type {
	TutorialBbcItem,
	TutorialDemoItem,
	TutorialFxKind,
	TutorialPopText,
	TutorialSlide,
	TutorialSlideItem,
	TutorialTextItem,
	TutorialTitleItem,
} from "@game/content/tutorialSlides";
import { env } from "@Env";
import { makeContainer } from "@Env";
import * as animation from "@Utils/animation";
import * as damage from "@Screens/Battleground/Phases/Combat/logHandlers/visuals/damage";
import * as shield from "@Screens/Battleground/Phases/Combat/logHandlers/visuals/shield";
import * as heal from "@Screens/Battleground/Phases/Combat/logHandlers/visuals/heal";
import * as poison from "@Screens/Battleground/Phases/Combat/logHandlers/visuals/poison";
import * as regen from "@Screens/Battleground/Phases/Combat/logHandlers/visuals/regen";

type Fx = (source: Vec2, target: Vec2, onHit: () => void) => void;

const FX: Record<TutorialFxKind, Fx> = {
	damage: damage.damageFx,
	shield: shield.shieldFx,
	heal: heal.healFx,
	poison: poison.poisonFx,
	regen: regen.regenFx,
};

const renderBodyText = (item: TutorialTextItem) =>
	env.scene.add
		.text(0, 0, i18n.t(item.key), Constants.defaultTextConfig)
		.setPosition(Constants.MIDDLE_SCREEN_X + (item.x ?? 0), item.y)
		.setOrigin(0.5)
		.setFontSize(38);

const renderTitleText = (item: TutorialTitleItem) =>
	env.scene.add
		.text(0, 0, i18n.t(item.key), Constants.titleTextConfig)
		.setOrigin(0.5)
		.setPosition(Constants.MIDDLE_SCREEN_X + (item.x ?? 0), item.y);

const renderBbcRow = (item: TutorialBbcItem) => {
	const label = item.labelKey ? i18n.t(item.labelKey) : item.label;
	const markup = `[color=${ABILITY_COLORS[item.color]}]${label}[/color]: ${i18n.t(item.textKey)}`;
	return env.scene.add
		.rexBBCodeText(0, 0, markup)
		.setPosition(Constants.MIDDLE_SCREEN_X, item.y)
		.setFontSize(38)
		.setOrigin(0)
		.setAlign("left")
		.setFontFamily("Arimo")
		.setOrigin(0.5);
};

const popTextValue = (caster: CharaType, pop: TutorialPopText) => {
	const unit = Chara.getUnit(caster);
	const value = pop.value === "power" ? unit.power : Math.floor(unit.power / 10);
	return `${pop.sign}${value}`;
};

const renderShowcase = (
	cont: Phaser.GameObjects.Container,
	charas: CharaType[],
	showcase: NonNullable<TutorialDemoItem["showcase"]>
) => {
	const chara = charas[showcase.unitIndex];
	const { title, description } = createDescription.createDescription(chara);

	const titleText = env.scene.add
		.text(showcase.panelX, showcase.titleY, title, Constants.titleTextConfig)
		.setAlign("left");

	const descriptionText = env.scene.add
		.rexBBCodeText(showcase.panelX, showcase.descriptionY, description)
		.setFontSize(30)
		.setAlign("left")
		.setWrapMode(1)
		.setFontFamily("Arimo");

	cont.add([titleText, descriptionText]);
};

const renderDemo = (item: TutorialDemoItem) => {
	const cont = makeContainer();
	const demoUnits = item.units.map((u) => Card.makeUnit(u.force, u.cardId, u.position));

	const runDemo = async () => {
		const charas = await Promise.all(demoUnits.map((u) => Chara.summon(u)));
		if (!cont.active) return;
		cont.add(charas);

		if (item.showcase) {
			renderShowcase(cont, charas, item.showcase);
		}

		const cast = item.castLoop;
		if (!cast) return;

		const caster = charas[cast.casterIndex];
		const target = charas[cast.targetIndex];

		const startTick = () => {
			const tickSpec = item.statusTick;
			if (!tickSpec) return;
			const tick = env.scene.time.addEvent({
				repeat: -1,
				delay: tickSpec.delayMs,
				callback: () => {
					if (!cont.active) {
						tick.destroy();
						return;
					}
					Animations.popText({
						x: target.x,
						y: target.y,
						text: popTextValue(caster, tickSpec.popText),
						type: tickSpec.popText.kind,
					});
				},
			});
			caster.on("destroy", () => {
				tick.destroy();
			});
		};

		const fire = async () => {
			Chara.playAnimation(caster, "attack");
			Chara.playAnimationAfterRepeat(caster, "idle");
			await animation.delay(cast.fxDelayMs);
			const state = Chara.mustGetState(caster);
			if (!cont.active || !state.sprite.active) return;
			FX[cast.fx]([caster.x, caster.y], [target.x, target.y], () => {
				Animations.popText({
					x: target.x,
					y: target.y,
					text: popTextValue(caster, cast.popText),
					type: cast.popText.kind,
				});
				if (item.statusTick) startTick();
			});
		};

		fire();

		if (cast.loopDelayMs) {
			const effect = env.scene.time.addEvent({
				repeat: -1,
				delay: cast.loopDelayMs,
				callback: fire,
			});
			caster.on("destroy", () => {
				effect.destroy();
			});
		}
	};

	runDemo();

	return cont;
};

const renderItem = (item: TutorialSlideItem): Phaser.GameObjects.GameObject => {
	switch (item.kind) {
		case "text":
			return renderBodyText(item);
		case "title":
			return renderTitleText(item);
		case "bbcode":
			return renderBbcRow(item);
		case "demo":
			return renderDemo(item);
	}
};

/** Render one tutorial slide into a fresh Phaser container. */
export const renderTutorialSlide = (slide: TutorialSlide): Phaser.GameObjects.Container =>
	makeContainer(slide.map(renderItem));
