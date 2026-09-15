/**
 * Card inspector (tutorial slides 10–13).
 *
 * A real card with its real generated tooltip — but the effect rows are
 * tappable. Tapping one plays that effect on the demo board, so "this unit
 * damages the enemy crystal" becomes something the player watched happen.
 */

import * as Constants from "@Constants";
import * as i18n from "@i18n/i18n";
import * as Chara from "@Components/Chara/Chara";
import type { Chara as CharaType } from "@Components/Chara/Chara";
import * as Animations from "@Components/Chara/Animations";
import * as createDescription from "@Components/Chara/createDescription";
import { ABILITY_COLORS } from "@game/data/abilityColors";
import type { TutorialInspectItem, TutorialInspectRow } from "@game/content/tutorialSlides";
import { env } from "@Env";
import { FX, popTextValue } from "./tutorialDemo";
import { createTutorialScheduler } from "./tutorialScheduler";
import type { ProgressEvent } from "./slideProgress";

const PANEL_WIDTH = 900;
const ROW_WIDTH = 840;
const ROW_HEIGHT = 72;
const ROW_RADIUS = 12;

export interface InspectPanel {
	container: Phaser.GameObjects.Container;
	destroy: () => void;
}

export const createInspectPanel = (
	item: TutorialInspectItem,
	charas: CharaType[],
	report: (event: ProgressEvent) => void
): InspectPanel => {
	const container = env.container();
	const scheduler = createTutorialScheduler(() => env.scene);
	const tweens: Phaser.Tweens.Tween[] = [];
	let destroyed = false;

	const subject = charas[item.unitIndex];
	const crystal = charas[charas.length - 1] ?? subject;

	// --- tooltip panel (real generated description) --------------------------
	const { title, description } = createDescription.createDescription(subject);

	const panelTop = item.rowsY - 150;
	const panelHeight = item.rows.length * item.rowSpacingY + 260;

	const panel = env.scene.add.graphics();
	panel.fillStyle(0x000000, 0.42);
	panel.lineStyle(2, 0xffffff, 0.3);
	panel.fillRoundedRect(item.panelX - 30, panelTop, PANEL_WIDTH, panelHeight, 16);
	panel.strokeRoundedRect(item.panelX - 30, panelTop, PANEL_WIDTH, panelHeight, 16);
	panel.setDepth(5);

	const titleText = env.scene.add
		.text(item.panelX, panelTop + 24, title, { ...Constants.titleTextConfig, fontSize: 38 })
		.setOrigin(0, 0)
		.setDepth(6);

	const descriptionText = env.scene.add
		.rexBBCodeText(item.panelX, panelTop + 78, description, {
			fontSize: 24,
			fontFamily: "Arimo",
			color: "#ffffff",
			wrap: { width: PANEL_WIDTH - 60 },
		})
		.setOrigin(0, 0)
		.setDepth(6)
		.setWrapMode(1)
		.setWrapWidth(PANEL_WIDTH - 60);

	container.add([panel, titleText, descriptionText]);

	// --- tappable effect rows -------------------------------------------------
	const playRow = (row: TutorialInspectRow) => {
		if (destroyed) return;

		const source = charas[row.sourceIndex ?? item.unitIndex] ?? subject;
		const target = charas[row.targetIndex ?? charas.length - 1] ?? crystal;

		Chara.playAnimation(source, "attack");
		Chara.playAnimationAfterRepeat(source, "idle");

		FX[row.fx]([source.x, source.y], [target.x, target.y], () => {
			if (destroyed) return;
			Animations.popText({
				x: target.x,
				y: target.y,
				text: popTextValue(source, row.popText),
				type: row.popText.kind,
			});

			if (row.reactionPop) {
				const reactor = charas[row.reactionIndex ?? item.unitIndex] ?? subject;
				const reactionPop = row.reactionPop;
				scheduler.after(row.reactionDelayMs ?? 220, () => {
					if (destroyed) return;
					Animations.popText({
						x: reactor.x,
						y: reactor.y,
						text: popTextValue(reactor, reactionPop),
						type: reactionPop.kind,
					});
				});
			}
		});

		report({ kind: "select", id: row.id });
	};

	item.rows.forEach((row, index) => {
		const width = Math.min(ROW_WIDTH, PANEL_WIDTH - 60);
		const rowContainer = env.container();

		const background = env.scene.add.graphics();
		const color = Phaser.Display.Color.HexStringToColor(
			ABILITY_COLORS[row.color] ?? "#ffffff"
		).color;

		let selected = false;
		const draw = (hover: boolean) => {
			background.clear();
			background.fillStyle(color, selected ? 0.32 : hover ? 0.22 : 0.1);
			background.lineStyle(2, color, selected ? 1 : hover ? 0.9 : 0.5);
			background.fillRoundedRect(0, 0, width, ROW_HEIGHT, ROW_RADIUS);
			background.strokeRoundedRect(0, 0, width, ROW_HEIGHT, ROW_RADIUS);
		};
		draw(false);

		const label = row.labelKey ? i18n.t(row.labelKey) : row.label;
		const markup = `[color=${ABILITY_COLORS[row.color]}]${label}[/color]: ${i18n.t(row.textKey)}`;

		const text = env.scene.add
			.rexBBCodeText(20, ROW_HEIGHT / 2, markup, {
				fontSize: 26,
				fontFamily: "Arimo",
				color: "#ffffff",
			})
			.setOrigin(0, 0.5)
			.setWrapMode(1)
			.setWrapWidth(width - 100);

		const playIcon = env.scene.add
			.text(width - 22, ROW_HEIGHT / 2, "▶", {
				...Constants.titleTextConfig,
				fontSize: 26,
				color: "#ffe066",
			})
			.setOrigin(1, 0.5);

		rowContainer.add([background, text, playIcon]);
		rowContainer.setPosition(item.panelX, item.rowsY + index * item.rowSpacingY);
		rowContainer.setSize(width, ROW_HEIGHT);
		rowContainer.setDepth(8);
		rowContainer.setInteractive(
			new Phaser.Geom.Rectangle(width / 2, ROW_HEIGHT / 2, width, ROW_HEIGHT),
			Phaser.Geom.Rectangle.Contains
		);

		rowContainer.on("pointerover", () => {
			draw(true);
			env.scene.input.setDefaultCursor("pointer");
		});
		rowContainer.on("pointerout", () => {
			draw(false);
			env.scene.input.setDefaultCursor("default");
		});
		rowContainer.on("pointerdown", () => {
			selected = true;
			draw(false);
			playIcon.setText("✓");
			tweens.push(
				env.scene.tweens.add({
					targets: rowContainer,
					scale: { from: 0.97, to: 1 },
					duration: 140,
					ease: "Back.Out",
				})
			);
			playRow(row);
		});

		container.add(rowContainer);
	});

	return {
		container,
		destroy: () => {
			destroyed = true;
			scheduler.destroy();
			tweens.forEach((tween) => tween.stop());
			container.destroy(true);
		},
	};
};
