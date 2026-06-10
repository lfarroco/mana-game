import * as EffectCardShop from "@Screens/Battleground/Components/Shop/EffectCardShop";

export async function handleAddReactionCorePhase() {
	const reactionIds = state.session.options.map((option) => option.id);
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