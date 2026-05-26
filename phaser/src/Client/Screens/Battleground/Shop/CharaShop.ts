import Phaser from "phaser";
import * as Card from "@Models/Entities/Card";
import * as makeUnit from "@Models/Entities/Unit";
import * as Geometry from "@Models/Geometry";
import * as Board from "@Models/Board";
import * as Chara from "@Systems/Chara/Chara";
import * as c from "@Constants/constants";
import * as sc from "@Screens/Battleground/Shop/constants";
import * as createDescription from "@Systems/Chara/createDescription";
import * as ShopPanel from "@Screens/Battleground/Shop/ShopPanel";
import * as Shop from "@Screens/Battleground/Shop";
import * as Encounter from "@Systems/Encounter";
import * as theme from "@UI/theme";
import * as Types from "@Core/Types";

const OWNED_CARD_BORDER_PULSE_DURATION_MS = 1000;
const SHOP_CARD_BORDER_WIDTH = 2;
const SHOP_CARD_ACTIVE_BORDER_WIDTH = theme.UI_SURFACE_ACTIVE_BORDER_WIDTH;
const SHOP_CARD_BORDER_COLOR = theme.UI_SURFACE_BORDER_COLOR;
const SHOP_CARD_BORDER_ALPHA = 0.5;
const SHOP_CARD_FOCUS_BORDER_COLOR = theme.UI_SURFACE_HOVER_BORDER_COLOR;
const SHOP_CARD_FOCUS_BORDER_ALPHA = 1;
const SHOP_CARD_EXTRA_LEFT_PADDING = 110;
const SHOP_CARD_HOVER_COLOR_MIX = 1;
const SHOP_CARD_HOVER_ANIMATION_DURATION_MS = 220;

export type ShopInteractionResult =
	| {
		kind: "purchased";
		session: Types.SessionData;
		shopUnit: makeUnit.Unit;
	}
	| {
		kind: "skipped";
		session: Types.SessionData;
	};

export function enableShopInteractions(tavernCharas: Chara.Chara[]): Promise<ShopInteractionResult> {
	return new Promise((resolve) => {
		let purchasedShopUnit: makeUnit.Unit | null = null;
		let pendingPurchaseSession: Types.SessionData | null = null;
		const tavernShopUnits = tavernCharas.map((chara) => Chara.getUnit(chara));
		const tavernCardIds = new Set(tavernShopUnits.map((unit) => unit.cardId));

		const tryResolvePurchased = () => {
			if (!purchasedShopUnit || !pendingPurchaseSession) {
				return;
			}

			cleanup();
			resolve({
				kind: "purchased",
				session: pendingPurchaseSession,
				shopUnit: purchasedShopUnit,
			});
		};

		const purchaseListeners = tavernCharas.map((chara) => {
			const onPurchaseSuccessful = (unit: makeUnit.Unit) => {
				purchasedShopUnit = { ...unit };
				tryResolvePurchased();
			};

			chara.on("chara:purchaseSuccessful", onPurchaseSuccessful);
			return { chara, onPurchaseSuccessful };
		});

		const cleanup = () => {
			purchaseListeners.forEach(({ chara, onPurchaseSuccessful }) => {
				chara.off("chara:purchaseSuccessful", onPurchaseSuccessful);
			});
			io.scene.events.off("sessionUpdated", onSessionUpdated);
		};

		const onSessionUpdated = ({ actionId, session }: { actionId: string; session: Types.SessionData }) => {
			if (actionId === "skip_shop") {
				cleanup();
				resolve({ kind: "skipped", session });
				return;
			}

			if (!tavernCardIds.has(actionId)) {
				return;
			}

			pendingPurchaseSession = session;

			if (!purchasedShopUnit) {
				const inferredShopUnit = tavernShopUnits.find((unit) => unit.cardId === actionId);
				if (inferredShopUnit) {
					purchasedShopUnit = { ...inferredShopUnit };
				}
			}

			tryResolvePurchased();
		};

		io.scene.events.on("sessionUpdated", onSessionUpdated);
	});
}

export async function renderTavernCharas(cardDefs: Card.CardDefinition[]): Promise<Chara.Chara[]> {

	Encounter.resetEncounterFocusTargets();

	const ownedCardIds = new Set(state.session.team.units.map((u) => u.cardId));

	const createdCharas = await Promise.all(cardDefs.map(async (spec, index) => {
		const unit = makeUnit.makeUnit(c.FORCE_ID_PLAYER, spec.id, Geometry.vec2(0, 0));

		const offsetY = index * sc.TAVERN_CHARA_SPACING;

		const baseBgWidth = 800;
		const bgSize = Geometry.size(baseBgWidth + SHOP_CARD_EXTRA_LEFT_PADDING, 280);
		const position = Geometry.vec2(
			sc.ITEM_BASE_X + baseBgWidth / 2 - SHOP_CARD_EXTRA_LEFT_PADDING / 2,
			sc.ITEM_BASE_Y + offsetY
		);

		const bgRect = io.scene.add.graphics({
			x: position.x - bgSize.width / 2,
			y: position.y - bgSize.height / 2,
		});
		const rowBorder = io.scene.add.graphics();
		let isFocused = false;
		const backgroundState = { mix: 0 };
		const drawRowBackground = () => {
			const fillColor = theme.mixHexColors(theme.UI_SURFACE_COLOR, theme.UI_SURFACE_HOVER_COLOR, backgroundState.mix);
			bgRect.clear();
			bgRect.fillStyle(fillColor, theme.UI_SURFACE_ALPHA);
			bgRect.fillRoundedRect(0, 0, bgSize.width, bgSize.height, 12);
		};
		const tweenRowBackground = (mix: number) => {
			io.scene.tweens.killTweensOf(backgroundState);
			io.scene.tweens.add({
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
		initShopCharaInput(chara);
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
			const animatedBorder = io.scene.add.graphics();
			animatedBorder.lineStyle(2, theme.UI_SURFACE_ACCENT_COLOR, 1);
			animatedBorder.strokeCircle(0, 0, borderRadius);
			chara.add(animatedBorder);
			chara.bringToTop(chara.list[chara.list.length - 2]);

			const currentWidth = 2;
			io.scene.tweens.add({
				targets: { width: currentWidth },
				width: 6,
				duration: OWNED_CARD_BORDER_PULSE_DURATION_MS,
				yoyo: true,
				repeat: -1,
				ease: "Sine.easeInOut",
				onUpdate: (tween) => {
					const newWidth = tween.getValue() ?? currentWidth;
					animatedBorder.clear();
					animatedBorder.lineStyle(newWidth, theme.UI_SURFACE_ACCENT_COLOR, 1);
					animatedBorder.strokeCircle(0, 0, borderRadius);
				},
			});
		}

		const { title, description } = createDescription.createDescription(chara);

		const titleText = io.scene.add
			.text(sc.ITEM_DESC_BASE_X, sc.ITEM_DESC_BASE_Y + offsetY, title, {
				...c.titleTextConfig,
				color: theme.UI_TEXT_PRIMARY,
			})
			.setAlign("left");

		const descriptionText = io.scene.add
			.rexBBCodeText(sc.ITEM_DESC_BASE_X + 10, sc.ITEM_DESC_BASE_Y + 20 + offsetY + 60, description)
			.setFontSize(28)
			.setColor(theme.UI_TEXT_MUTED)
			.setWrapWidth(650)
			.setAlign("left")
			.setWrapMode(1)
			.setFontFamily("Arimo");

		ShopPanel.container.add([chara, titleText, descriptionText]);

		Encounter.registerEncounterFocusTarget({
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
				chara.emit("pointerup", io.scene.input.activePointer);
			},
			startHoldAction: () => {
				holdStartPosition = Geometry.vec2(chara.x, chara.y);
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
				const dragStartPosition = holdStartPosition ?? Geometry.vec2(chara.x, chara.y);
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
		Encounter.initializeEncounterFocusTargets();

		return chara;
	}));

	return createdCharas;
}

function initShopCharaInput(chara: Chara.Chara): void {
	io.scene.input.setDraggable(chara, true);

	let wasDragSuccessful = false;

	chara.on(Phaser.Input.Events.DRAG_START, () => {
		if (!Board.isInputEnabled()) {
			return;
		}

		const dragStartVec = Geometry.vec2(chara.x, chara.y);
		chara.setData("dragStartVec", dragStartVec);
		wasDragSuccessful = false;

		ShopPanel.bringChildToTop(chara);
		chara.setAngle(-8);
	});

	chara.on(Phaser.Input.Events.DRAG, (_pointer: Pointer, dragX: number, dragY: number) => {
		if (!Board.isInputEnabled()) {
			return;
		}

		chara.x = dragX;
		chara.y = dragY;
	});

	io.WhenDroppedOnZone(chara, "board-cell", (zone) => {
		if (!Board.isInputEnabled()) {
			return;
		}

		const x = zone.getData("cell-x") as number;
		const y = zone.getData("cell-y") as number;
		const tile = Geometry.vec2(x, y);
		const vec = chara.getData("dragStartVec") as Vec2;

		Shop.events.itemDragPurchaseRequested(
			{ ...Chara.getUnit(chara) },
			Chara.getUnit(chara).id,
			tile,
			vec.x,
			vec.y
		);

		wasDragSuccessful = true;
	});

	chara.on(Phaser.Input.Events.DRAG_END, () => {
		if (!Board.isInputEnabled()) {
			return;
		}

		chara.setAngle(0);

		if (!wasDragSuccessful) {
			const vec = chara.getData("dragStartVec") as Vec2;
			io.scene.tweens.add({
				targets: [chara],
				x: vec.x,
				y: vec.y,
				duration: 150,
			});
		}

		wasDragSuccessful = false;
	});

	chara.on(Phaser.Input.Events.POINTER_UP, (pointer: Pointer) => {
		if (!Board.isInputEnabled() || !chara.input?.enabled) {
			return;
		}

		if (pointer.getDistance() > c.DRAG_CLICK_THRESHOLD) {
			return;
		}

		Shop.events.itemClickPurchaseRequested(
			{ ...Chara.getUnit(chara) },
			Chara.getUnit(chara).id,
			chara.x,
			chara.y
		);
	});
}
