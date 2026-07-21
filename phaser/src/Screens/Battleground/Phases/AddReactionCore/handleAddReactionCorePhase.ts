import { ClientState } from "@Models/ClientState";
import * as EffectCardShop from "@Screens/Battleground/Components/Shop/EffectCardShop";

export async function handleAddReactionCorePhase(clientState: ClientState) {
	const reactionIds = clientState.session.options.map((option) => option.id);
	// let nextSession = null;

	await EffectCardShop.openUpgradeCorePhase(
		clientState,
		"effectCardShop.title",
		reactionIds,
		// undefined,
		// async (selectedSession) => {
		// 	nextSession = selectedSession;
		// }
	);
}