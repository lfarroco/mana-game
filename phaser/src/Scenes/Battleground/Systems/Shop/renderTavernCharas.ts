import * as Card from "@Models/Entities/Card";
import { makeUnit } from "@Models/Entities/Unit";
import { vec2 } from "@Models/Geometry";
import { scene } from "@Scenes/Battleground/BattlegroundScene";
import * as Chara from "@Systems/Chara/Chara";
import * as c from "../../../../constants/constants";
import * as sc from "./constants";
import { state } from "./ShopUI";
import { createDescription } from "@Systems/Chara/createDescription";

export function renderTavernCharas(cardDefs: Card.CardDefinition[]): Chara.Chara[] {
	if (!state) throw new Error("ShopUI not initialized. Call create() first.");
	const createdCharas: Chara.Chara[] = [];
	const baseX = (state.panelX !== undefined ? state.panelX + 160 : sc.TAVERN_CHARA_FIRST_X);
	const ownedCardIds = new Set(scene.state.gameData.player.units.map(u => u.cardId));

	cardDefs.forEach((spec, index) => {
		const unit = makeUnit(c.FORCE_ID_PLAYER, spec.id, vec2(0, 0));

		const chara = Chara.create(unit);

		chara.setPosition(baseX, sc.TAVERN_CHARA_BASE_Y + (index * sc.TAVERN_CHARA_SPACING));

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
				ease: 'Sine.easeInOut',
				onUpdate: (tween) => {
					const newWidth = tween.getValue();
					animatedBorder.clear();
					animatedBorder.lineStyle(newWidth, 0xffd700, 1);
					animatedBorder.strokeCircle(0, 0, borderRadius);
				}
			});
		}

		const { title, description } = createDescription(chara);

		const titleText = scene.add.text(200, -80, title)
			.setOrigin(0)
			.setFontSize(40)
			.setFontFamily("Arial Black")
			.setAlign("left");

		const descriptionText = scene.add.rexBBCodeText(200, 0, description)
			.setOrigin(0)
			.setFontSize(30)
			.setAlign("left")
			.setWrapMode(1)
			.setFontFamily("Arial");

		chara.add([
			titleText,
			descriptionText
		])

		state!.shopContainer.add(chara);
		createdCharas.push(chara);
	});




	return createdCharas;
}
