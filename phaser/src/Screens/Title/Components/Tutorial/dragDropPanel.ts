/**
 * Drag-and-drop mini shop (tutorial slide 2).
 *
 * The player drags a real recruit card out of a one-card shop onto the board —
 * the same gesture the real shop uses. The panel is deliberately self-contained
 * (it does not go through `purchaseShopUnit`, which expects a live session):
 * the lesson is the gesture and the board slot, so the drop end is a snap +
 * confirmation, not a purchase.
 */

import * as Card from "@game/Entities/Card";
import * as Chara from "@Components/Chara/Chara";
import type { Chara as CharaType } from "@Components/Chara/Chara";
import * as Constants from "@Constants";
import * as i18n from "@i18n/i18n";
import type { TutorialDragDropItem } from "@game/content/tutorialSlides";
import { env } from "@Env";
import * as animation from "@Utils/animation";
import type { ProgressEvent } from "./slideProgress";

const CARD_WIDTH = 300;
const CARD_HEIGHT = 360;
const CELL_INSET = 8;
const SNAP_DURATION_MS = 180;

export interface DragDropPanel {
	container: Phaser.GameObjects.Container;
	destroy: () => void;
}

/**
 * Board-cell rectangle in screen space, matching `Board.renderCell` and
 * `Chara.getScreenPosition` (tile size + 8px gap, player board origin).
 */
const cellRect = (cellX: number, cellY: number): Phaser.Geom.Rectangle => {
	const gap = 8;
	return new Phaser.Geom.Rectangle(
		Constants.PLAYER_BOARD_X + cellX * (Constants.TILE_WIDTH + gap),
		Constants.PLAYER_BOARD_Y + cellY * (Constants.TILE_HEIGHT + gap),
		Constants.TILE_WIDTH,
		Constants.TILE_HEIGHT
	);
};

export const createDragDropPanel = (
	item: TutorialDragDropItem,
	report: (event: ProgressEvent) => void
): DragDropPanel => {
	const container = env.container();
	const owned: Phaser.GameObjects.GameObject[] = [];
	const tweens: Phaser.Tweens.Tween[] = [];
	let placed = false;

	// --- highlighted drop targets -------------------------------------------
	const highlights = item.targets.map(([cellX, cellY]) => {
		const rect = cellRect(cellX, cellY);
		const graphics = env.scene.add.graphics();
		graphics.fillStyle(0xffe066, 0.12);
		graphics.lineStyle(3, 0xffe066, 0.85);
		graphics.fillRoundedRect(
			rect.x + CELL_INSET,
			rect.y + CELL_INSET,
			rect.width - CELL_INSET * 2,
			rect.height - CELL_INSET * 2,
			14
		);
		graphics.strokeRoundedRect(
			rect.x + CELL_INSET,
			rect.y + CELL_INSET,
			rect.width - CELL_INSET * 2,
			rect.height - CELL_INSET * 2,
			14
		);
		graphics.setDepth(4);
		const tween = env.scene.tweens.add({
			targets: graphics,
			alpha: { from: 0.35, to: 1 },
			duration: 900,
			yoyo: true,
			repeat: -1,
			ease: "Sine.InOut",
		});
		tweens.push(tween);
		owned.push(graphics);
		return graphics;
	});
	container.add(highlights);

	// --- the draggable recruit card -----------------------------------------
	const unit = Card.makeUnit("PLAYER_FORCE", item.cardId, [0, 0]);
	const card = env.scene.add.container(item.shopX, item.shopY);

	const cardBackground = env.scene.add.graphics();
	cardBackground.fillStyle(0x000000, 0.5);
	cardBackground.lineStyle(3, 0xffffff, 0.6);
	cardBackground.fillRoundedRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 16);
	cardBackground.strokeRoundedRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 16);

	const sprite = env.scene.add.image(0, -40, unit.pic);
	sprite.setDisplaySize(CARD_WIDTH * 0.62, CARD_WIDTH * 0.62);

	const name = env.scene.add
		.text(0, CARD_HEIGHT / 2 - 90, i18n.getName(item.cardId), {
			...Constants.titleTextConfig,
			fontSize: 26,
		})
		.setOrigin(0.5);

	const hint = env.scene.add
		.text(0, CARD_HEIGHT / 2 - 48, i18n.t("tutorial.dragHint"), {
			...Constants.defaultTextConfig,
			fontSize: 22,
			color: "#ffe066",
		})
		.setOrigin(0.5);

	card.add([cardBackground, sprite, name, hint]);
	card.setSize(CARD_WIDTH, CARD_HEIGHT);
	card.setInteractive(
		new Phaser.Geom.Rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT),
		Phaser.Geom.Rectangle.Contains
	);
	card.setDepth(30);
	container.add([card]);
	owned.push(card);

	env.scene.input.setDraggable(card, true);

	const homeX = item.shopX;
	const homeY = item.shopY;
	let dragging = false;

	card.on("pointerover", () => {
		if (!dragging) env.scene.input.setDefaultCursor("grab");
	});
	card.on("pointerout", () => {
		if (!dragging) env.scene.input.setDefaultCursor("default");
	});

	card.on(Phaser.Input.Events.DRAG_START, () => {
		if (placed) return;
		dragging = true;
		env.scene.input.setDefaultCursor("grabbing");
		env.scene.children.bringToTop(card);
		// Lift the card slightly so the drag is unmistakable.
		const tween = env.scene.tweens.add({
			targets: card,
			scale: 1.04,
			duration: 120,
			ease: "Sine.Out",
		});
		tweens.push(tween);
	});

	card.on(Phaser.Input.Events.DRAG, (_pointer: Pointer, dragX: number, dragY: number) => {
		if (placed) return;
		card.setPosition(dragX, dragY);
	});

	card.on(Phaser.Input.Events.DRAG_END, () => {
		if (placed) return;
		dragging = false;
		env.scene.input.setDefaultCursor("default");

		const tween = env.scene.tweens.add({
			targets: card,
			scale: 1,
			duration: 120,
			ease: "Sine.Out",
		});
		tweens.push(tween);

		const dropCell = item.targets.find(([cellX, cellY]) => {
			const rect = cellRect(cellX, cellY);
			return Phaser.Geom.Rectangle.Contains(rect, card.x, card.y);
		});

		if (!dropCell) {
			// Missed the board — snap home so the player can try again.
			const snapBack = env.scene.tweens.add({
				targets: card,
				x: homeX,
				y: homeY,
				duration: SNAP_DURATION_MS,
				ease: "Cubic.Out",
			});
			tweens.push(snapBack);
			return;
		}

		placed = true;
		const [cellX, cellY] = dropCell;
		const rect = cellRect(cellX, cellY);

		// Snap into the slot, then hand the slot over to a real summoned unit so
		// the board shows a unit — exactly what a purchase looks like.
		const snapIn = env.scene.tweens.add({
			targets: card,
			x: rect.centerX,
			y: rect.centerY,
			duration: SNAP_DURATION_MS,
			ease: "Back.Out",
			onComplete: () => {
				const recruit = Card.makeUnit("PLAYER_FORCE", item.cardId, [cellX, cellY]);
				void Chara.summon(recruit, false).then((chara: CharaType) => {
					if (!card.active) return;
					card.destroy(true);
					container.add(chara);
				});
			},
		});
		tweens.push(snapIn);

		// Stop the drop-target pulse once the slot is filled.
		tweens.forEach((t) => {
			if (t.isPlaying() && t.targets.some((target) => highlights.includes(target as never))) {
				t.stop();
			}
		});

		animation.tween({ targets: highlights, alpha: 0, duration: 220 });
		report({ kind: "flag", id: "placed" });
	});

	return {
		container,
		destroy: () => {
			tweens.forEach((tween) => tween.stop());
			container.destroy(true);
		},
	};
};
