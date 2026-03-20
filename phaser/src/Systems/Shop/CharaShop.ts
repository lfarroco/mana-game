import Phaser from "phaser";
import * as Card from "@Models/Entities/Card";
import * as makeUnit from "@Models/Entities/Unit";
import { size, vec2 } from "@Models/Geometry";
import * as Chara from "@Systems/Chara/Chara";
import * as c from "@Constants/constants";
import * as sc from "@Systems/Shop/constants";
import { createDescription } from "@Systems/Chara/createDescription";
import { getCurrentScene, getState } from "@Models/State";
import * as ShopPanel from "@Systems/Shop/ShopPanel";
import { Rectangle } from "@PhaserIO";

const OWNED_CARD_BORDER_PULSE_DURATION_MS = 1000;

export function renderTavernCharas(cardDefs: Card.CardDefinition[]): Chara.Chara[] {
	const scene = getCurrentScene();

	const createdCharas: Chara.Chara[] = [];
	const ownedCardIds = new Set(getState().session.team.units.map((u) => u.cardId));

	cardDefs.forEach(async (spec, index) => {
		const unit = makeUnit.makeUnit(c.FORCE_ID_PLAYER, spec.id, vec2(0, 0));

		const offsetY = index * sc.TAVERN_CHARA_SPACING;

		const position = vec2(sc.ITEM_BASE_X + 400, sc.ITEM_BASE_Y + offsetY);
		const bgSize = size(800, 280);

		const bgRect = Rectangle(position, bgSize, 0x1f1f1f, 0.8);

		const chara = await Chara.create(unit);
		chara.setPosition(sc.ITEM_BASE_X, sc.ITEM_BASE_Y + offsetY);

		bgRect.setInteractive(
			new Phaser.Geom.Rectangle(0, 0, bgSize.width, bgSize.height),
			Phaser.Geom.Rectangle.Contains
		);
		bgRect.on("pointerover", () => {
			bgRect.setAlpha(0.7);
		});
		bgRect.on("pointerout", () => {
			bgRect.setAlpha(1);
		});
		bgRect.on("pointerup", (pointer: Phaser.Input.Pointer) => {
			chara.emit("pointerup", pointer);
		});

		const existingUnit = getState().session.team.units.find((u) => u.cardId === spec.id);
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

			const currentWidth = 2;
			scene.tweens.add({
				targets: { width: currentWidth },
				width: 6,
				duration: OWNED_CARD_BORDER_PULSE_DURATION_MS,
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
			.rexBBCodeText(sc.ITEM_DESC_BASE_X + 10, sc.ITEM_DESC_BASE_Y + 20 + offsetY + 60, description)
			.setFontSize(28)
			.setWrapWidth(650)
			.setAlign("left")
			.setWrapMode(1)
			.setFontFamily("Arimo");

		ShopPanel.container.add([bgRect, chara, titleText, descriptionText]);

		createdCharas.push(chara);
	});

	return createdCharas;
}
