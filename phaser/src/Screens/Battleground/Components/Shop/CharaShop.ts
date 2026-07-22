import * as Card from "@game/Entities/Card";
import * as Board from "@Components/Board/Board";
import { getUnitAt } from "@Models/ClientState";
import * as Chara from "@Systems/Chara/Chara";
import * as Constants from "@Constants";
import * as CoreConstants from "@game/Constants";
import * as sc from "@Screens/Battleground/Components/Shop/constants";
import * as createDescription from "@Systems/Chara/createDescription";
import * as ShopPanel from "@Screens/Battleground/Components/Shop/ShopPanel";
import * as theme from "@Screens/Battleground/Components/UI/theme";
import * as uiEvents from "@Screens/Battleground/Components/UI/events";
import * as i18n from "@i18n/i18n";
import * as Models from "@game/Models";
import { Unit } from "@game/Models";
import { upgradeUnitEffects } from "@game/Entities/Unit";
import { env, whenDroppedOnZone } from "@Env";
import { BattlegroundEvent } from "../../../../Events";

const OWNED_CARD_BORDER_PULSE_DURATION_MS = 1000;
const SHOP_CARD_BORDER_WIDTH = 2;
const SHOP_CARD_BORDER_COLOR = theme.UI_SURFACE_BORDER_COLOR;
const SHOP_CARD_BORDER_ALPHA = 0.5;
const SHOP_CARD_EXTRA_LEFT_PADDING = 110;
const SHOP_CARD_HOVER_COLOR_MIX = 1;
const SHOP_CARD_HOVER_ANIMATION_DURATION_MS = 220;

export async function renderTavernCharas(
	cardDefs: Models.CardDefinition[]): Promise<Chara.Chara[]> {

	const ownedCardIds = new Set(env.state.session.team.units.map((u) => u.cardId));

	const createdCharas = await Promise.all(cardDefs.map(async (spec, index) => {
		const unit = Card.makeUnit(CoreConstants.FORCE_ID_PLAYER, spec.id, [0, 0]);

		const offsetY = index * sc.TAVERN_CHARA_SPACING;

		const baseBgWidth = 800;
		const bgSize = [baseBgWidth + SHOP_CARD_EXTRA_LEFT_PADDING, 280];
		const position = [
			sc.ITEM_BASE_X + baseBgWidth / 2 - SHOP_CARD_EXTRA_LEFT_PADDING / 2,
			sc.ITEM_BASE_Y + offsetY
		];

		const bgRect = env.scene.add.graphics({
			x: position[0] - bgSize[0] / 2,
			y: position[1] - bgSize[1] / 2,
		});
		const rowBorder = env.scene.add.graphics();
		const backgroundState = { mix: 0 };
		const drawRowBackground = () => {
			const fillColor = theme.mixHexColors(theme.UI_SURFACE_COLOR, theme.UI_SURFACE_HOVER_COLOR, backgroundState.mix);
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

		// Add background elements to the container synchronously (before any await)
		// so they are guaranteed to be in the container when slideOut() is called.
		ShopPanel.add([bgRect, rowBorder]);

		const chara = await Chara.create(
			unit,
			{ isShopChara: true }
		);
		chara.setPosition(
			sc.ITEM_BASE_X,
			sc.ITEM_BASE_Y + offsetY - 10
		);
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
			.text(sc.ITEM_DESC_BASE_X, sc.ITEM_DESC_BASE_Y + offsetY, title, {
				...Constants.titleTextConfig,
				color: theme.UI_TEXT_PRIMARY,
			})
			.setAlign("left");

		const descriptionText = env.scene.add
			.rexBBCodeText(sc.ITEM_DESC_BASE_X + 10, sc.ITEM_DESC_BASE_Y + 20 + offsetY + 60, description)
			.setFontSize(28)
			.setColor(theme.UI_TEXT_MUTED)
			.setWrapWidth(650)
			.setAlign("left")
			.setWrapMode(1)
			.setFontFamily("Arimo");

		ShopPanel.add([chara, titleText, descriptionText]);

		return chara;
	}));

	return createdCharas;
}

function initShopCharaInput(
	chara: Chara.Chara,
	unit: Models.Unit
): void {
	env.scene.input.setDraggable(chara, true);

	let wasDragSuccessful = false;

	chara.on(Phaser.Input.Events.DRAG_START, () => {
		if (!Board.isInputEnabled()) {
			return;
		}

		const dragStartVec = [chara.x, chara.y];
		chara.setData("dragStartVec", dragStartVec);
		wasDragSuccessful = false;

		ShopPanel.bringToTop(chara);
		chara.setAngle(-8);
	});

	//TODO: io.onDrag...
	chara.on(
		Phaser.Input.Events.DRAG,
		(_pointer: Pointer, dragX: number, dragY: number) => {
			if (!Board.isInputEnabled()) {
				return;
			}

			chara.x = dragX;
			chara.y = dragY;
		});

	whenDroppedOnZone(chara, "board-cell", (zone: Phaser.GameObjects.Zone) => {
		if (!Board.isInputEnabled()) {
			return;
		}

		const x = zone.getData("cell-x") as number;
		const y = zone.getData("cell-y") as number;
		const tile: Vec2 = [x, y];
		const vec = chara.getData("dragStartVec") as [number, number];

		void handleItemDragPurchaseRequested(
			unit,
			unit.id,
			tile,
			vec[0],
			vec[1]
		);

		wasDragSuccessful = true;
	});

	chara.on(Phaser.Input.Events.DRAG_END, () => {
		if (!Board.isInputEnabled()) {
			return;
		}

		chara.setAngle(0);

		if (!wasDragSuccessful) {
			const [x, y] = chara.getData("dragStartVec") as Vec2;
			env.scene.tweens.add({
				targets: [chara],
				x,
				y,
				duration: 150,
			});
		}

		wasDragSuccessful = false;
	});

	chara.on(Phaser.Input.Events.POINTER_UP, (pointer: Pointer) => {
		if (!Board.isInputEnabled() || !chara.input?.enabled)
			return;

		if (pointer.getDistance() > Constants.DRAG_CLICK_THRESHOLD)
			return;

		const existingUnit = env.state.session.team.units.find((u) => u.cardId === unit.cardId);
		if ((!existingUnit || existingUnit.rank > 3) && env.state.session.team.units.length >= CoreConstants.MAX_PARTY_SIZE) {
			uiEvents.onPurchaseFailed(i18n.getName(unit.cardId), "PARTY_FULL");
			return;
		}

		void (async () => {
			const previousPhase = env.state.session.phase;
			const previousTeamUnits = JSON.parse(JSON.stringify(env.state.session.team.units)) as Unit[];
			const previousTeamUnitIds = new Set(previousTeamUnits.map((u) => u.id));

			const { session } = await env.dispatch({
				type: "recruit_unit",
				unitId: unit.cardId,
				targetSlot: null,
			});

			const wasUpgrade = previousTeamUnits.some((u) => u.cardId === unit.cardId);
			const didAddUnit = session.team.units.find(
				(u) => u.cardId === unit.cardId && !previousTeamUnitIds.has(u.id),
			);
			if (!wasUpgrade && !didAddUnit) return;

			env.updateState({ ...env.state, session });
			await BattlegroundEvent.unitPurchaseCompleted.emit({
				unitId: unit.cardId,
				previousTeamUnits,
				shopCharaId: unit.id,
			});
			BattlegroundEvent.phaseFinished.emit({ previousPhase });
		})();
	});

}

async function handleItemDragPurchaseRequested(
	shopUnitData: Models.Unit,
	shopCharaId: string,
	targetTile: Vec2,
	dragStartX: number,
	dragStartY: number
): Promise<void> {
	const { session: currentSession } = env.state;
	const existingUnit = currentSession.team.units.find((u) => u.cardId === shopUnitData.cardId);

	if ((!existingUnit || existingUnit.rank > 3) && currentSession.team.units.length >= CoreConstants.MAX_PARTY_SIZE) {
		BattlegroundEvent.onShopUnitDragPurchaseFailed.emit({
			shopCharaId,
			dragStartVec: [dragStartX, dragStartY],
		});
		uiEvents.onPurchaseFailed(i18n.getName(shopUnitData.cardId), "PARTY_FULL");
		return;
	}

	if (!existingUnit || existingUnit.rank > 3) {
		const occupier = getUnitAt(currentSession.team.units)(targetTile);
		if (occupier) {
			BattlegroundEvent.onShopUnitDragPurchaseFailed.emit({
				shopCharaId,
				dragStartVec: [dragStartX, dragStartY],
			});
			uiEvents.onPurchaseFailed(i18n.getName(shopUnitData.cardId), "SLOT_OCCUPIED");
			return;
		}
	}

	const previousPhase = env.state.session.phase;
	const previousTeamUnits = JSON.parse(JSON.stringify(env.state.session.team.units)) as Unit[];
	const previousTeamUnitIds = new Set(previousTeamUnits.map((u) => u.id));

	const { session } = await env.dispatch({
		type: "recruit_unit",
		unitId: shopUnitData.cardId,
		targetSlot: targetTile,
	});

	const wasUpgrade = previousTeamUnits.some((u) => u.cardId === shopUnitData.cardId);
	const didAddUnit = session.team.units.find(
		(u) => u.cardId === shopUnitData.cardId && !previousTeamUnitIds.has(u.id),
	);
	if (!wasUpgrade && !didAddUnit) return;

	env.updateState({ ...env.state, session });
	await BattlegroundEvent.unitPurchaseCompleted.emit({
		unitId: shopUnitData.cardId,
		previousTeamUnits,
		shopCharaId,
	});
	BattlegroundEvent.phaseFinished.emit({ previousPhase });
}
