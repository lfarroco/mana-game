import Phaser from "phaser";
import * as Card from "@Models/Entities/Card";
import * as makeUnit from "@Models/Entities/Unit";
import { size, vec2 } from "@Models/Geometry";
import * as Board from "@Models/Board";
import * as Chara from "@Systems/Chara/Chara";
import * as c from "@Constants/constants";
import * as sc from "@Systems/Shop/constants";
import { createDescription } from "@Systems/Chara/createDescription";
import * as ShopPanel from "@Systems/Shop/ShopPanel";
import * as Shop from "@Systems/Shop";
import {
	initializeEncounterFocusTargets,
	registerEncounterFocusTarget,
	resetEncounterFocusTargets,
} from "@Systems/Encounter";
import {
	mixHexColors,
	UI_SURFACE_ACTIVE_BORDER_WIDTH,
	UI_SURFACE_ACCENT_COLOR,
	UI_SURFACE_ALPHA,
	UI_SURFACE_BORDER_COLOR,
	UI_SURFACE_COLOR,
	UI_SURFACE_HOVER_COLOR,
	UI_SURFACE_HOVER_BORDER_COLOR,
	UI_TEXT_MUTED,
	UI_TEXT_PRIMARY,
} from "@UI/theme";

const OWNED_CARD_BORDER_PULSE_DURATION_MS = 1000;
const SHOP_CARD_BORDER_WIDTH = 2;
const SHOP_CARD_ACTIVE_BORDER_WIDTH = UI_SURFACE_ACTIVE_BORDER_WIDTH;
const SHOP_CARD_BORDER_COLOR = UI_SURFACE_BORDER_COLOR;
const SHOP_CARD_BORDER_ALPHA = 0.5;
const SHOP_CARD_FOCUS_BORDER_COLOR = UI_SURFACE_HOVER_BORDER_COLOR;
const SHOP_CARD_FOCUS_BORDER_ALPHA = 1;
const SHOP_CARD_EXTRA_LEFT_PADDING = 110;
const SHOP_CARD_HOVER_COLOR_MIX = 1;
const SHOP_CARD_HOVER_ANIMATION_DURATION_MS = 220;

export async function renderTavernCharas(cardDefs: Card.CardDefinition[]): Promise<Chara.Chara[]> {
	const scene = io.scene;
	resetEncounterFocusTargets();

	const ownedCardIds = new Set(state.session.team.units.map((u) => u.cardId));

	const createdCharas = await Promise.all(cardDefs.map(async (spec, index) => {
		const unit = makeUnit.makeUnit(c.FORCE_ID_PLAYER, spec.id, vec2(0, 0));

		const offsetY = index * sc.TAVERN_CHARA_SPACING;

		const baseBgWidth = 800;
		const bgSize = size(baseBgWidth + SHOP_CARD_EXTRA_LEFT_PADDING, 280);
		const position = vec2(
			sc.ITEM_BASE_X + baseBgWidth / 2 - SHOP_CARD_EXTRA_LEFT_PADDING / 2,
			sc.ITEM_BASE_Y + offsetY
		);

		const bgRect = scene.add.graphics({
			x: position.x - bgSize.width / 2,
			y: position.y - bgSize.height / 2,
		});
		const rowBorder = scene.add.graphics();
		let isFocused = false;
		const backgroundState = { mix: 0 };
		const drawRowBackground = () => {
			const fillColor = mixHexColors(UI_SURFACE_COLOR, UI_SURFACE_HOVER_COLOR, backgroundState.mix);
			bgRect.clear();
			bgRect.fillStyle(fillColor, UI_SURFACE_ALPHA);
			bgRect.fillRoundedRect(0, 0, bgSize.width, bgSize.height, 12);
		};
		const tweenRowBackground = (mix: number) => {
			scene.tweens.killTweensOf(backgroundState);
			scene.tweens.add({
				targets: backgroundState,
				mix,
				duration: SHOP_CARD_HOVER_ANIMATION_DURATION_MS,
				ease: "Sine.easeOut",
				onUpdate: drawRowBackground,
			});
		};
		const drawRowBorder = (color: number, alpha: number, lineWidth: number) => {
			rowBorder.clear();
			rowBorder.lineStyle(lineWidth, color, alpha);
			rowBorder.strokeRoundedRect(
				position.x - bgSize.width / 2,
				position.y - bgSize.height / 2,
				bgSize.width,
				bgSize.height,
				12
			);
		};
		drawRowBackground();
		drawRowBorder(SHOP_CARD_BORDER_COLOR, SHOP_CARD_BORDER_ALPHA, SHOP_CARD_BORDER_WIDTH);

		// Add background elements to the container synchronously (before any await)
		// so they are guaranteed to be in the container when slideOut() is called.
		ShopPanel.container.add([bgRect, rowBorder]);

		const chara = await Chara.create(unit);
		chara.setPosition(sc.ITEM_BASE_X, sc.ITEM_BASE_Y + offsetY - 10);
		let holdStartPosition: Vec2 | null = null;
		let isHoldDragging = false;

		chara.on("pointerover", () => {
			if (isFocused) return;
			tweenRowBackground(SHOP_CARD_HOVER_COLOR_MIX);
			drawRowBorder(SHOP_CARD_FOCUS_BORDER_COLOR, SHOP_CARD_FOCUS_BORDER_ALPHA, SHOP_CARD_ACTIVE_BORDER_WIDTH);
		});
		chara.on("pointerout", () => {
			if (isFocused) return;
			tweenRowBackground(0);
			drawRowBorder(SHOP_CARD_BORDER_COLOR, SHOP_CARD_BORDER_ALPHA, SHOP_CARD_BORDER_WIDTH);
		});

		bgRect.setInteractive(
			new Phaser.Geom.Rectangle(0, 0, bgSize.width, bgSize.height),
			Phaser.Geom.Rectangle.Contains
		);
		bgRect.on("pointerover", () => {
			if (isFocused) {
				return;
			}

			tweenRowBackground(SHOP_CARD_HOVER_COLOR_MIX);
			drawRowBorder(SHOP_CARD_FOCUS_BORDER_COLOR, SHOP_CARD_FOCUS_BORDER_ALPHA, SHOP_CARD_ACTIVE_BORDER_WIDTH);
		});
		bgRect.on("pointerout", () => {
			if (isFocused) {
				return;
			}

			tweenRowBackground(0);
			drawRowBorder(SHOP_CARD_BORDER_COLOR, SHOP_CARD_BORDER_ALPHA, SHOP_CARD_BORDER_WIDTH);
		});
		bgRect.on("pointerup", (pointer: Phaser.Input.Pointer) => {
			chara.emit("pointerup", pointer);
		});

		const existingUnit = state.session.team.units.find((u) => u.cardId === spec.id);
		if (existingUnit) {
			unit.rank = existingUnit.rank;
			makeUnit.upgradeUnitEffects(unit);
		}

		if (ownedCardIds.has(spec.id)) {
			const borderRadius = (c.TILE_WIDTH * 0.8) / 2;
			const animatedBorder = scene.add.graphics();
			animatedBorder.lineStyle(2, UI_SURFACE_ACCENT_COLOR, 1);
			animatedBorder.strokeCircle(0, 0, borderRadius);
			chara.add(animatedBorder);
			chara.bringToTop(chara.list[chara.list.length - 2]);

			const currentWidth = 2;
			scene.tweens.add({
				targets: { width: currentWidth },
				width: 6,
				duration: OWNED_CARD_BORDER_PULSE_DURATION_MS,
				yoyo: true,
				repeat: -1,
				ease: "Sine.easeInOut",
				onUpdate: (tween) => {
					const newWidth = tween.getValue() ?? currentWidth;
					animatedBorder.clear();
					animatedBorder.lineStyle(newWidth, UI_SURFACE_ACCENT_COLOR, 1);
					animatedBorder.strokeCircle(0, 0, borderRadius);
				},
			});
		}

		const { title, description } = createDescription(chara);

		const titleText = scene.add
			.text(sc.ITEM_DESC_BASE_X, sc.ITEM_DESC_BASE_Y + offsetY, title, {
				...c.titleTextConfig,
				color: UI_TEXT_PRIMARY,
			})
			.setAlign("left");

		const descriptionText = scene.add
			.rexBBCodeText(sc.ITEM_DESC_BASE_X + 10, sc.ITEM_DESC_BASE_Y + 20 + offsetY + 60, description)
			.setFontSize(28)
			.setColor(UI_TEXT_MUTED)
			.setWrapWidth(650)
			.setAlign("left")
			.setWrapMode(1)
			.setFontFamily("Arimo");

		ShopPanel.container.add([chara, titleText, descriptionText]);

		registerEncounterFocusTarget({
			setFocused: (focused: boolean) => {
				isFocused = focused;
				if (focused) {
					tweenRowBackground(SHOP_CARD_HOVER_COLOR_MIX);
					drawRowBorder(
						SHOP_CARD_FOCUS_BORDER_COLOR,
						SHOP_CARD_FOCUS_BORDER_ALPHA,
						SHOP_CARD_ACTIVE_BORDER_WIDTH
					);
					return;
				}

				tweenRowBackground(0);
				drawRowBorder(SHOP_CARD_BORDER_COLOR, SHOP_CARD_BORDER_ALPHA, SHOP_CARD_BORDER_WIDTH);
			},
			activate: async () => {
				chara.emit("pointerup", scene.input.activePointer);
			},
			startHoldAction: () => {
				holdStartPosition = vec2(chara.x, chara.y);
				isHoldDragging = true;
				ShopPanel.container.bringToTop(chara);
				chara.setAngle(-8);
				return true;
			},
			updateHoldAction: async ({ boardTile }) => {
				if (!isHoldDragging || !holdStartPosition) {
					return false;
				}

				if (!boardTile) {
					return true;
				}

				const boardSlot = Board.getSlotPosition(boardTile.y * 3 + boardTile.x, true);
				chara.setPosition(boardSlot.x, boardSlot.y);
				return true;
			},
			releaseHoldAction: async ({ boardTile }) => {
				const dragStartPosition = holdStartPosition ?? vec2(chara.x, chara.y);
				isHoldDragging = false;
				holdStartPosition = null;
				chara.setAngle(0);

				if (!boardTile) {
					chara.setPosition(dragStartPosition.x, dragStartPosition.y);
					return false;
				}

				Shop.events.itemDragPurchaseRequested(
					{ ...Chara.getUnit(chara) },
					Chara.getUnit(chara).id,
					boardTile,
					dragStartPosition.x,
					dragStartPosition.y
				);
				return true;
			},
		});
		initializeEncounterFocusTargets();

		return chara;
	}));

	return createdCharas;
}
