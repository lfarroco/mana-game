import * as EffectCardShop from "@Screens/Battleground/Components/Shop/EffectCardShop";
import * as ShopPanel from "@Screens/Battleground/Components/Shop/ShopPanel";
import { env } from "@Env";
import { registerPhaseCleanup } from "../../BattlegroundScreen";

export async function handleUpgradeCorePhase() {
	const upgradeIds = env.state.session.options.map((option) => option.id);

	await EffectCardShop.openUpgradeCorePhase(
		"upgradeCrystal.title",
		upgradeIds,
	);

	registerPhaseCleanup(async () => {
		await ShopPanel.SlideOut();
	});
}
