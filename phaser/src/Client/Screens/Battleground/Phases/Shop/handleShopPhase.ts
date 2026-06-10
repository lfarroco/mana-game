import * as Types from "@Core/Types";
import * as Card from "@Models/Entities/Card";
import * as Unit from "@Models/Entities/Unit";
import * as Chara from "@Systems/Chara/Chara";
import * as CharaShop from "@Screens/Battleground/Components/Shop/CharaShop";
import * as Shop from "@Screens/Battleground/Components/Shop/ShopPanel";

let initialized = false;

function init() {
	if (initialized) return;
	initialized = true;

	const { events } = io.screens.battleground;

	events.onUnitPurchased.listen(onUnitPurchased);
	events.phaseFinished.listen(closeShop)
}

export async function handleShopPhase() {

	init();

	const { session } = state;
	const shopCardIds = session.options.map((o) => o.id);
	const cardDefs = shopCardIds
		.map((id: string) => Card.getCardDefinition(id)).filter(Boolean);

	Shop.addSkipButton();

	await CharaShop.renderTavernCharas(cardDefs);

	await Shop.SlideIn();

}

async function closeShop(phase: Types.PhaseType) {
	if (phase !== "shop") return;
	await Shop.SlideOut();
}

async function onUnitPurchased({ session, unitId }: { session: Types.SessionData, unitId: string }) {
	if (Chara.hasCharaById(unitId)) {
		Chara.destroy(Chara.mustGetCharaById(unitId));
	}

	const previousUnitIds = new Set(session.team.units.map((unit: Unit.Unit) => unit.id));
	const purchasedUnit = session.team.units.find((unit: Unit.Unit) => !previousUnitIds.has(unit.id));

	if (purchasedUnit) {
		await Chara.refreshChara(purchasedUnit);
		Chara.enableBoardInteractivity(Chara.mustGetCharaById(purchasedUnit.id));
	}

	await Shop.SlideOut();
}