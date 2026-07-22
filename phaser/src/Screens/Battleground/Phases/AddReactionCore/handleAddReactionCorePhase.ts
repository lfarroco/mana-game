import * as EffectCardShop from "@Screens/Battleground/Components/Shop/EffectCardShop";
import { env } from "../../../../Env";

export async function handleAddReactionCorePhase() {
	const reactionIds = env.state.session.options.map((option) => option.id);
	// let nextSession = null;

	await EffectCardShop.openUpgradeCorePhase(
		"effectCardShop.title",
		reactionIds,
		// undefined,
		// async (selectedSession) => {
		// 	nextSession = selectedSession;
		// }
	);
}