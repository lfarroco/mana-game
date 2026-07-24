import * as EffectCardShop from "@Screens/Battleground/Components/Shop/EffectCardShop";
import * as ShopPanel from "@Screens/Battleground/Components/Shop/ShopPanel";
import { env } from "@Env";
import { registerPhaseCleanup } from "../../BattlegroundScreen";

export async function handleAddReactionCorePhase() {
	const reactionIds = env.state.session.options.map((option) => option.id);

	await EffectCardShop.openUpgradeCorePhase(
		"effectCardShop.title",
		reactionIds,
	);

	registerPhaseCleanup(async () => {
		await ShopPanel.SlideOut();
	});
}
