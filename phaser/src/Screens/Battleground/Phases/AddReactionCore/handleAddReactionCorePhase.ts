import * as EffectCardShop from "@Screens/Battleground/Components/Shop/EffectCardShop";
import * as ShopPanel from "@Screens/Battleground/Components/Shop/ShopPanel";
import { env } from "@Env";
import type { PhaseHandler } from "../../BattlegroundScreen";

export const AddReactionCorePhase: PhaseHandler = {
	name: "add_reaction_core",

	async start() {
		const container = env.scene.add.container();
		const reactionIds = env.state.session.options.map((option) => option.id);

		await EffectCardShop.openUpgradeCorePhase(
			"effectCardShop.title",
			reactionIds,
		);

		return async () => {
			await ShopPanel.SlideOut();
			container.destroy(true);
		};
	},
};
