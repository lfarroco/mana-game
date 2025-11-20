import * as Card from "@Models/Entities/Card";
import * as makeUnit from "@Models/Entities/Unit";
import { size, vec2 } from "@Models/Geometry";
import { scene } from "@Scenes/Battleground/BattlegroundScene";
import * as Chara from "@Systems/Chara/Chara";
import * as c from "@Constants/constants";
import * as sc from "./constants";
import { createDescription } from "@Systems/Chara/createDescription";
import { getState } from "@Models/State";
import * as ShopPanel from "./ShopPanel";
import { Rectangle } from "@PhaserIO";

export function renderTavernCharas(cardDefs: Card.CardDefinition[]): Chara.Chara[] {
	const createdCharas: Chara.Chara[] = [];
	const ownedCardIds = new Set(getState().gameData.player.units.map((u) => u.cardId));

	cardDefs.forEach((spec, index) => {
		const unit = makeUnit.makeUnit(c.FORCE_ID_PLAYER, spec.id, vec2(0, 0));

		const offsetY = index * sc.TAVERN_CHARA_SPACING;

		const position = vec2(sc.ITEM_BASE_X + 400, sc.ITEM_BASE_Y + offsetY)
		const size_ = size(600, 280)

		const bgRect = Rectangle(position, size_, 0x1f1f1f, 0.8);

		const chara = Chara.create(unit);
		chara.setPosition(sc.ITEM_BASE_X, sc.ITEM_BASE_Y + offsetY);

		const existingUnit = getState().gameData.player.units.find((u) => u.cardId === spec.id);
		if (existingUnit) {
			unit.rank = existingUnit.rank;
			makeUnit.upgradeUnitEffects(unit);
		}

		if (ownedCardIds.has(spec.id)) {
			const borderRadius = (c.TILE_WIDTH * 0.8) / 2;
			const animatedBorder = scene.add.graphics();
			animatedBorder.lineStyle(2, 0xffd700, 1);
			animatedBorder.strokeCircle(0, 0, borderRadius);
			chara.add(animatedBorder);
			chara.bringToTop(chara.list[chara.list.length - 2]);

			let currentWidth = 2;
			scene.tweens.add({
				targets: { width: currentWidth },
				width: 6,
				duration: 1000,
				yoyo: true,
				repeat: -1,
				ease: "Sine.easeInOut",
				onUpdate: (tween) => {
					const newWidth = tween.getValue();
					animatedBorder.clear();
					animatedBorder.lineStyle(newWidth, 0xffd700, 1);
					animatedBorder.strokeCircle(0, 0, borderRadius);
				},
			});
		}

		const { title, description } = createDescription(chara);

		const titleText = scene.add
			.text(sc.ITEM_DESC_BASE_X, sc.ITEM_DESC_BASE_Y + offsetY, title, c.titleTextConfig)
			.setAlign("left");

		const descriptionText = scene.add
			.rexBBCodeText(sc.ITEM_DESC_BASE_X + 10,
				sc.ITEM_DESC_BASE_Y + 20 + offsetY + 60,
				description)
			.setFontSize(30)
			.setAlign("left")
			.setWrapMode(1)
			.setFontFamily("Arimo");

		ShopPanel.container.add([bgRect, chara, titleText, descriptionText]);

		createdCharas.push(chara);
	});

	return createdCharas;
}
