/**
 * Tutorial slide builder — turns authored slide data into live Phaser objects.
 *
 * Text/title/BBCode rows are the original slideshow renderer. On top of it,
 * every interactive kind gets its own builder:
 *
 *   - `sandbox`  → `sandboxPanel` (cast an ability, watch the numbers move)
 *   - `dragDrop` → `dragDropPanel` (recruit onto the board)
 *   - `inspect`  → `inspectPanel` (tap an effect row, watch it play)
 *   - `flags`    → tappable canvas regions (slide 1's two boards)
 *   - `demo`     → the original looping/animated demo, plus an optional
 *                  trigger button and reaction pop (slide 9)
 *
 * Every builder reports `ProgressEvent`s so the overlay can decide whether the
 * slide's gate is satisfied and unlock Next (`slideProgress.ts`).
 */

import * as Chara from "@Components/Chara/Chara";
import type { Chara as CharaType } from "@Components/Chara/Chara";
import * as Animations from "@Components/Chara/Animations";
import * as Constants from "@Constants";
import * as createDescription from "@Components/Chara/createDescription";
import * as UIButton from "@Components/Button/UIButton";
import { ABILITY_COLORS } from "@game/data/abilityColors";
import type {
	TutorialBbcItem,
	TutorialDemoItem,
	TutorialDragDropItem,
	TutorialFlagItem,
	TutorialInspectItem,
	TutorialSandboxItem,
	TutorialSlide,
	TutorialSlideItem,
	TutorialTextItem,
	TutorialTitleItem,
} from "@game/content/tutorialSlides";
import * as i18n from "@i18n/i18n";
import { env } from "@Env";
import * as animation from "@Utils/animation";
import { FX, popTextValue, summonDemoUnits } from "./tutorialDemo";
import { createTutorialScheduler } from "./tutorialScheduler";
import { createSandboxPanel } from "./sandboxPanel";
import { createDragDropPanel } from "./dragDropPanel";
import { createInspectPanel } from "./inspectPanel";
import type { ProgressEvent } from "./slideProgress";

/** Anything the slide must tear down when it is replaced. */
export type SlideDisposable = { destroy: () => void };

export interface BuiltTutorialSlide {
	container: Phaser.GameObjects.Container;
	/** Disposes tween-owning panels (Phaser destroys the game objects itself). */
	dispose: () => void;
}

// ---------------------------------------------------------------------------
// Text rows (the original slideshow renderer)
// ---------------------------------------------------------------------------

const renderBodyText = (item: TutorialTextItem) =>
	env.scene.add
		.text(0, 0, i18nText(item.key), Constants.defaultTextConfig)
		.setPosition(Constants.MIDDLE_SCREEN_X + (item.x ?? 0), item.y)
		.setOrigin(0.5)
		.setFontSize(38);

const renderTitleText = (item: TutorialTitleItem) =>
	env.scene.add
		.text(0, 0, i18nText(item.key), Constants.titleTextConfig)
		.setOrigin(0.5)
		.setPosition(Constants.MIDDLE_SCREEN_X + (item.x ?? 0), item.y);

const renderBbcRow = (item: TutorialBbcItem) => {
	const label = item.labelKey ? i18nText(item.labelKey) : item.label;
	const markup = `[color=${ABILITY_COLORS[item.color]}]${label}[/color]: ${i18nText(item.textKey)}`;
	return env.scene.add
		.rexBBCodeText(0, 0, markup)
		.setPosition(Constants.MIDDLE_SCREEN_X, item.y)
		.setFontSize(38)
		.setOrigin(0)
		.setAlign("left")
		.setFontFamily("Arimo")
		.setOrigin(0.5);
};

const i18nText = (key: string): string => i18n.t(key);

/**
 * Hand a slide's summoned units back to the renderer's teardown list. The
 * tutorial summons demos into `Chara`'s module-level registry; Phaser destroys
 * the containers with the slide, but the registry would keep stale entries
 * unless we call `Chara.destroy` for each one.
 */
const registerCharas = (onReady: (built: SlideDisposable) => void, charas: CharaType[]): void => {
	onReady({
		destroy: () => charas.forEach((chara) => Chara.destroy(chara)),
	});
};

// ---------------------------------------------------------------------------
// Flags (tappable canvas regions)
// ---------------------------------------------------------------------------

const renderFlags = (
	item: TutorialFlagItem,
	report: (event: ProgressEvent) => void
): Phaser.GameObjects.Container => {
	const container = env.container();
	const done = new Set<string>();

	item.flags.forEach((flag) => {
		const zone = env.scene.add.zone(flag.x, flag.y, flag.width, flag.height);
		zone.setInteractive({ useHandCursor: true });
		zone.setDepth(25);
		container.add(zone);

		const outline = env.scene.add.graphics();
		outline.lineStyle(4, 0xffe066, 0.9);
		outline.strokeRoundedRect(
			flag.x - flag.width / 2,
			flag.y - flag.height / 2,
			flag.width,
			flag.height,
			18
		);
		outline.setDepth(24);
		container.add(outline);

		const pulse = env.scene.tweens.add({
			targets: outline,
			alpha: { from: 0.3, to: 1 },
			duration: 900,
			yoyo: true,
			repeat: -1,
			ease: "Sine.InOut",
		});

		const label = env.scene.add
			.text(flag.x, flag.y + flag.height / 2 - 34, i18nText(flag.labelKey), {
				...Constants.titleTextConfig,
				fontSize: 30,
				color: "#ffe066",
			})
			.setOrigin(0.5)
			.setDepth(25);
		container.add(label);

		zone.on("pointerdown", () => {
			if (done.has(flag.id)) return;
			done.add(flag.id);
			pulse.stop();
			outline.setAlpha(1);
			outline.clear();
			outline.lineStyle(5, 0x2ecc71, 1);
			outline.strokeRoundedRect(
				flag.x - flag.width / 2,
				flag.y - flag.height / 2,
				flag.width,
				flag.height,
				18
			);
			label.setColor("#2ecc71");
			animation.tween({ targets: [label, outline], scale: 1.04, duration: 120, yoyo: true });
			report({ kind: "flag", id: flag.id });
		});

		container.once(Phaser.GameObjects.Events.DESTROY, () => pulse.stop());
	});

	return container;
};

// ---------------------------------------------------------------------------
// Demo (animated example, optionally with a trigger + reaction)
// ---------------------------------------------------------------------------

const renderDemo = (
	item: TutorialDemoItem,
	report: (event: ProgressEvent) => void,
	onReady: (built: SlideDisposable) => void
): Phaser.GameObjects.Container => {
	const container = env.container();
	const scheduler = createTutorialScheduler(() => env.scene);

	const run = async () => {
		if (!container.active) return;

		const charas = await summonDemoUnits(item.units);
		if (!container.active) {
			charas.forEach((chara) => Chara.destroy(chara));
			return;
		}
		container.add(charas);

		if (item.showcase) {
			renderShowcase(container, charas, item.showcase);
		}

		const cast = item.castLoop;
		if (!cast) return;

		const caster = charas[cast.casterIndex];
		const target = charas[cast.targetIndex];

		const startTick = () => {
			const tickSpec = item.statusTick;
			if (!tickSpec) return;
			scheduler.every(tickSpec.delayMs, () => {
				if (!container.active) return;
				Animations.popText({
					x: target.x,
					y: target.y,
					text: popTextValue(caster, tickSpec.popText),
					type: tickSpec.popText.kind,
				});
			});
		};

		/** One cast: attack animation, optional FX, pops, optional reaction. */
		const fire = async (withReaction: boolean) => {
			Chara.playAnimation(caster, "attack");
			Chara.playAnimationAfterRepeat(caster, "idle");
			await animation.delay(cast.fxDelayMs);
			if (!container.active) return;

			const onHit = () => {
				if (!container.active) return;
				Animations.popText({
					x: target.x,
					y: target.y,
					text: popTextValue(caster, cast.popText),
					type: cast.popText.kind,
				});
				if (item.statusTick) startTick();
			};

			if (cast.fx) {
				FX[cast.fx]([caster.x, caster.y], [target.x, target.y], onHit);
			} else {
				onHit();
			}

			// The reaction lands after the action — the slide's whole point.
			if (withReaction && item.reactionPop && item.reactionIndex !== undefined) {
				const reactor = charas[item.reactionIndex];
				const delay = item.reactionDelayMs ?? 220;
				const reactionPop = item.reactionPop;
				scheduler.after(delay, () => {
					if (!container.active) return;
					Animations.popText({
						x: reactor.x,
						y: reactor.y,
						text: popTextValue(reactor, reactionPop),
						type: reactionPop.kind,
					});
					report({ kind: "flag", id: "reactionSeen" });
				});
			}
		};

		// Interactive reaction demo: nothing happens until the player taps.
		if (item.triggerLabelKey) {
			let fired = false;
			const button = UIButton.create({
				text: i18nText(item.triggerLabelKey),
				position: [item.triggerX ?? Constants.SCREEN_WIDTH - 400, item.triggerY ?? 900],
				width: 420,
				callback: () => {
					if (fired) return;
					fired = true;
					button.disable();
					void fire(true);
				},
			});
			container.add(button.container);
			return;
		}

		void fire(false);

		if (cast.loopDelayMs) {
			scheduler.every(cast.loopDelayMs, () => void fire(false));
		}
	};

	void run();

	onReady({
		destroy: () => scheduler.destroy(),
	});

	return container;
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
		.setFontFamily("Arimo")
		.setWrapWidth(1080);

	cont.add([titleText, descriptionText]);
};

// ---------------------------------------------------------------------------
// Interactive panels (async: they need their summoned units first)
// ---------------------------------------------------------------------------

const renderSandbox = (
	item: TutorialSandboxItem,
	report: (event: ProgressEvent) => void,
	onReady: (built: SlideDisposable) => void
): Phaser.GameObjects.Container => {
	const container = env.container();
	void (async () => {
		const charas = await summonDemoUnits(item.units);
		if (!container.active) {
			charas.forEach((chara) => Chara.destroy(chara));
			return;
		}
		container.add(charas);
		registerCharas(onReady, charas);

		const panel = createSandboxPanel(item, charas, report);
		if (!container.active) {
			panel.destroy();
			return;
		}
		container.add(panel.container);
		onReady({ destroy: panel.destroy });
	})();

	return container;
};

const renderDragDrop = (
	item: TutorialDragDropItem,
	report: (event: ProgressEvent) => void,
	onReady: (built: SlideDisposable) => void
): Phaser.GameObjects.Container => {
	const container = env.container();
	void (async () => {
		const charas = await summonDemoUnits(item.units);
		if (!container.active) {
			charas.forEach((chara) => Chara.destroy(chara));
			return;
		}
		container.add(charas);
		registerCharas(onReady, charas);

		const panel = createDragDropPanel(item, report);
		if (!container.active) {
			panel.destroy();
			return;
		}
		container.add(panel.container);
		onReady({ destroy: panel.destroy });
	})();

	return container;
};

const renderInspect = (
	item: TutorialInspectItem,
	report: (event: ProgressEvent) => void,
	onReady: (built: SlideDisposable) => void
): Phaser.GameObjects.Container => {
	const container = env.container();
	void (async () => {
		const charas = await summonDemoUnits(item.units);
		if (!container.active) {
			charas.forEach((chara) => Chara.destroy(chara));
			return;
		}
		container.add(charas);
		registerCharas(onReady, charas);

		const panel = createInspectPanel(item, charas, report);
		if (!container.active) {
			panel.destroy();
			return;
		}
		container.add(panel.container);
		onReady({ destroy: panel.destroy });
	})();

	return container;
};

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/** Render one tutorial slide. `onReady` collects panels that own tweens/schedules. */
export const buildTutorialSlide = (
	slide: TutorialSlide,
	report: (event: ProgressEvent) => void,
	onReady: (built: SlideDisposable) => void = () => {}
): BuiltTutorialSlide => {
	const container = env.container();
	const disposables: SlideDisposable[] = [];
	const collect = (built: SlideDisposable) => {
		disposables.push(built);
		onReady(built);
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
				return renderDemo(item, report, collect);
			case "flags":
				return renderFlags(item, report);
			case "sandbox":
				return renderSandbox(item, report, collect);
			case "dragDrop":
				return renderDragDrop(item, report, collect);
			case "inspect":
				return renderInspect(item, report, collect);
		}
	};

	slide.forEach((item) => container.add(renderItem(item)));

	return {
		container,
		dispose: () => {
			disposables.forEach((disposable) => {
				try {
					disposable.destroy();
				} catch (error) {
					console.warn("[tutorial] failed to dispose a slide panel", error);
				}
			});
			disposables.length = 0;
			container.destroy(true);
		},
	};
};
