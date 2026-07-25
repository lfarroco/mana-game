import * as EffectCardShop from "@Screens/Battleground/Components/Shop/EffectCardShop";
import * as ShopPanel from "@Screens/Battleground/Components/Shop/ShopPanel";
import { env } from "@Env";
import type { PhaseHandler } from "../../BattlegroundScreen";

export const UpgradeCorePhase: PhaseHandler = {
	name: "upgrade_core",

	async start() {
		const container = env.scene.add.container();
		const upgradeIds = env.state.session.options.map((option) => option.id);

		await EffectCardShop.openUpgradeCorePhase(
			"upgradeCrystal.title",
			upgradeIds,
		);

		return async () => {
			await ShopPanel.SlideOut();
			container.destroy(true);
		};
	},
};
