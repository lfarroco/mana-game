import * as Card from "@game/Entities/Card";
import * as Board from "@Components/Board/Board";
import * as Chara from "@Components/Chara/Chara";
import * as Constants from "@Constants";
import * as CoreConstants from "@game/Constants";
import * as sc from "@Screens/Battleground/Components/Shop/constants";
import * as createDescription from "@Components/Chara/createDescription";
import * as theme from "@Screens/Battleground/Components/UI/theme";
import * as Models from "@game/Models";
import { upgradeUnitEffects } from "@game/Entities/Unit";
import { initDragGesture } from "@Components/Chara/drag";
import { env } from "@Env";
import {
	onShopUnitDragPurchaseFailed,
	purchaseShopUnit,
} from "@Screens/Battleground/Phases/Shop/purchaseShopUnit";
import { Destroyable } from "@mana/framework";

const OWNED_CARD_BORDER_PULSE_DURATION_MS = 1000;
const SHOP_CARD_BORDER_WIDTH = 2;
const SHOP_CARD_BORDER_COLOR = theme.UI_SURFACE_BORDER_COLOR;
const SHOP_CARD_BORDER_ALPHA = 0.5;
const SHOP_CARD_EXTRA_LEFT_PADDING = 110;
const SHOP_CARD_HOVER_COLOR_MIX = 1;
const SHOP_CARD_HOVER_ANIMATION_DURATION_MS = 220;

export function renderShopCharaCards(cardDefs: Models.CardDefinition[]): Destroyable[] {
	const ownedCardIds = new Set(env.state.session.team.units.map((u) => u.cardId));

	const charaCount = cardDefs.length;
	const charaSpacing = sc.TAVERN_CHARA_SPACING;
	const totalSpan = Math.max(0, (charaCount - 1) * charaSpacing);
	const panelCenterY = sc.TAVERN_BASE_Y + sc.TAVERN_BG_HEIGHT / 2;
	const firstY = panelCenterY - totalSpan / 2;

	const cards = cardDefs.map((spec, index) => {
		const unit = Card.makeUnit(CoreConstants.FORCE_ID_PLAYER, spec.id, [0, 0]);

		const itemY = firstY + index * charaSpacing;

		const baseBgWidth = 800;
		const bgSize = [baseBgWidth + SHOP_CARD_EXTRA_LEFT_PADDING, 280];
		const position = [sc.ITEM_BASE_X + baseBgWidth / 2 - SHOP_CARD_EXTRA_LEFT_PADDING / 2, itemY];

		const bgRect = env.scene.add.graphics({
			x: position[0] - bgSize[0] / 2,
			y: position[1] - bgSize[1] / 2,
		});
		const rowBorder = env.scene.add.graphics();
		const backgroundState = { mix: 0 };
		const drawRowBackground = () => {
			const fillColor = theme.mixHexColors(
				theme.UI_SURFACE_COLOR,
				theme.UI_SURFACE_HOVER_COLOR,
				backgroundState.mix
			);
			bgRect.clear();
			bgRect.fillStyle(fillColor, theme.UI_SURFACE_ALPHA);
			bgRect.fillRoundedRect(0, 0, bgSize[0], bgSize[1], 12);
		};
		const tweenRowBackground = (mix: number) => {
			env.scene.tweens.killTweensOf(backgroundState);
			env.scene.tweens.add({
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
				position[0] - bgSize[0] / 2,
				position[1] - bgSize[1] / 2,
				bgSize[0],
				bgSize[1],
				12
			);
		};
		drawRowBackground();
		drawRowBorder(SHOP_CARD_BORDER_COLOR, SHOP_CARD_BORDER_ALPHA, SHOP_CARD_BORDER_WIDTH);

		const chara = Chara.create(unit, { isShopChara: true });
		chara.setPosition(sc.ITEM_BASE_X, itemY - 10);
		initShopCharaInput(chara, unit);

		chara.on("pointerover", () => {
			tweenRowBackground(SHOP_CARD_HOVER_COLOR_MIX);
		});
		chara.on("pointerout", () => {
			tweenRowBackground(0);
			drawRowBorder(SHOP_CARD_BORDER_COLOR, SHOP_CARD_BORDER_ALPHA, SHOP_CARD_BORDER_WIDTH);
		});

		bgRect.setInteractive(
			new Phaser.Geom.Rectangle(0, 0, bgSize[0], bgSize[1]),
			Phaser.Geom.Rectangle.Contains
		);
		bgRect.on("pointerover", () => {
			tweenRowBackground(SHOP_CARD_HOVER_COLOR_MIX);
		});
		bgRect.on("pointerout", () => {
			tweenRowBackground(0);
			drawRowBorder(SHOP_CARD_BORDER_COLOR, SHOP_CARD_BORDER_ALPHA, SHOP_CARD_BORDER_WIDTH);
		});
		bgRect.on("pointerup", (pointer: Phaser.Input.Pointer) => {
			chara.emit("pointerup", pointer);
		});

		const existingUnit = env.state.session.team.units.find((u) => u.cardId === spec.id);
		if (existingUnit) {
			unit.rank = existingUnit.rank;
			upgradeUnitEffects(unit);
		}

		if (ownedCardIds.has(spec.id)) {
			const borderRadius = (Constants.TILE_WIDTH * 0.8) / 2;
			const animatedBorder = env.scene.add.graphics();
			animatedBorder.lineStyle(2, theme.UI_SURFACE_ACCENT_COLOR, 1);
			animatedBorder.strokeCircle(0, 0, borderRadius);
			chara.add(animatedBorder);
			chara.bringToTop(chara.list[chara.list.length - 2]);

			const currentWidth = 2;
			env.scene.tweens.add({
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

		const titleText = env.scene.add
			.text(sc.ITEM_DESC_BASE_X, itemY - (sc.ITEM_BASE_Y - sc.ITEM_DESC_BASE_Y), title, {
				...Constants.titleTextConfig,
				color: theme.UI_TEXT_PRIMARY,
			})
			.setAlign("left");

		const descriptionText = env.scene.add
			.rexBBCodeText(
				sc.ITEM_DESC_BASE_X + 10,
				itemY - (sc.ITEM_BASE_Y - sc.ITEM_DESC_BASE_Y) + 80,
				description
			)
			.setFontSize(28)
			.setColor(theme.UI_TEXT_MUTED)
			.setWrapWidth(650)
			.setAlign("left")
			.setWrapMode(1)
			.setFontFamily("Arimo");

		return [bgRect, rowBorder, chara, titleText, descriptionText];
	});

	return cards.flat();
}

function initShopCharaInput(chara: Chara.Chara, unit: Models.Unit): void {
	initDragGesture(chara, {
		onDropZone: {
			"board-cell": (zone) => {
				const x = zone.getData("cell-x") as number;
				const y = zone.getData("cell-y") as number;
				const tile: Vec2 = [x, y];
				const dragStartVec = chara.getData("dragStartVec") as Vec2;

				void (async () => {
					const result = await purchaseShopUnit({
						cardId: unit.cardId,
						shopCharaId: unit.id,
						targetSlot: tile,
					});

					if (!result.ok) {
						onShopUnitDragPurchaseFailed({
							shopCharaId: unit.id,
							dragStartVec,
						});
					}
				})();
			},
		},
	});

	chara.on(Phaser.Input.Events.POINTER_UP, (pointer: Pointer) => {
		if (!Board.isInputEnabled() || !chara.input?.enabled) return;

		if (pointer.getDistance() > Constants.DRAG_CLICK_THRESHOLD) return;

		void purchaseShopUnit({
			cardId: unit.cardId,
			shopCharaId: unit.id,
			targetSlot: null,
		});
	});
}
