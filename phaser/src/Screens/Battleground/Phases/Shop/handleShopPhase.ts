import * as Card from "@game/Entities/Card";
import * as Chara from "@Components/Chara/Chara";
import * as CharaShop from "@Screens/Battleground/Components/Shop/CharaShop";
import * as DiscardZone from "@Screens/Battleground/Components/Shop/DiscardZone";
import { env } from "@Env";
import type { BGContext } from "../../BattlegroundScreen";
import { skipButton } from "@Screens/Battleground/Components/skipButton";

export const ShopPhase = (_ctx: BGContext) => {
	const { session } = env.state;
	const shopCardIds = session.options.map((o) => o.id);
	const cardDefs = shopCardIds.map(Card.getCardDefinition);

	const skipButton_ = skipButton();
	const charaCards = CharaShop.renderShopCharaCards(cardDefs);

	return [...charaCards, skipButton_];
};

export async function onUnitSold(unitId: string) {
	if (Chara.hasCharaById(unitId)) {
		Chara.destroy(Chara.mustGetCharaById(unitId));
	}

	DiscardZone.hide();
}
