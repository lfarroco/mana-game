import * as EffectCardShop from "@Screens/Battleground/Components/Shop/EffectCardShop";
import { env } from "@Env";
import { BGContext } from "@Screens/Battleground/BattlegroundScene";

export const AddReactionCorePhase = (ctx: BGContext) => {
	const reactionIds = env.state.session.options.map((option) => option.id);

	return EffectCardShop.openUpgradeCorePhase(ctx)("effectCardShop.title", reactionIds);
};
