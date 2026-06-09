import * as GameController from "@Core/GameController";
import * as Types from "@Core/Types";
import * as Card from "@Models/Entities/Card";
import * as Unit from "@Models/Entities/Unit";
import * as Chara from "@Systems/Chara/Chara";
import * as CharaShop from "@Screens/Battleground/Components/Shop/CharaShop";
import * as Shop from "@Screens/Battleground/Components/Shop/ShopPanel";

export async function handleShopPhase(): Promise<Types.SessionData> {

	const { session } = state;
	const shopCardIds = session.options.map((o) => o.id);
	const cardDefs = shopCardIds.map((id: string) => Card.getCardDefinition(id)).filter(Boolean);

	Shop.addSkipButton(async () => {
		await GameController.skipPhase();
	});

	const tavernCharas = await CharaShop.renderTavernCharas(cardDefs);

	await Shop.SlideIn();

	const interactionResult = await CharaShop.enableShopInteractions(tavernCharas);
	const result = interactionResult.session;

	if (interactionResult.kind === "purchased") {
		if (Chara.hasCharaById(interactionResult.shopUnit.id)) {
			Chara.destroy(Chara.mustGetCharaById(interactionResult.shopUnit.id));
		}

		const previousUnitIds = new Set(session.team.units.map((unit: Unit.Unit) => unit.id));
		const purchasedUnit = result.team.units.find((unit: Unit.Unit) => !previousUnitIds.has(unit.id));

		if (purchasedUnit) {
			await Chara.refreshChara(purchasedUnit);
			Chara.enableBoardInteractivity(Chara.mustGetCharaById(purchasedUnit.id));
		}
	}

	await Shop.SlideOut();

	return result;
}
