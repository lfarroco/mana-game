import * as GameController from "@Core/GameController";
import * as Types from "@Core/Types";
import * as Card from "@Models/Entities/Card";
import { Unit } from "@Models/Entities/Unit";
import * as Chara from "@Systems/Chara/Chara";
import * as CharaShop from "@Systems/Shop/CharaShop";
import * as Shop from "@Systems/Shop/ShopPanel";

export async function handleShopPhase(): Promise<Types.SessionData> {

	const { session } = state;
	const shopCardIds = session.current_options.map((o) => o.id);
	const cardDefs = shopCardIds.map((id: string) => Card.getCardDefinition(id)).filter(Boolean);

	Shop.refresh(async () => {
		await GameController.skipPhase();
	});

	const tavernCharas = await CharaShop.renderTavernCharas(cardDefs);


	await Shop.SlideIn();

	const interactionResult = await CharaShop.enableShopInteractions(tavernCharas);
	const result = interactionResult.session;

	if (interactionResult.kind === "purchased") {
		const purchasedUnit = result.team.units.find(
			(unit: Unit) => unit.cardId === interactionResult.shopUnit.cardId && !Chara.hasCharaById(unit.id)
		);

		if (purchasedUnit) {
			await Chara.refreshChara(purchasedUnit);
		}
	}

	await Shop.SlideOut();
	Shop.refresh(null);

	return result;
}
