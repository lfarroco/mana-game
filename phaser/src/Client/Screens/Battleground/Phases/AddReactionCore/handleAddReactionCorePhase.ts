import * as Types from "@Core/Types";
import * as EffectCardShop from "@Screens/Battleground/Components/Shop/EffectCardShop";

export async function handleAddReactionCorePhase(): Promise<Types.SessionData> {
	const reactionIds = state.session.current_options.map((option) => option.id);
	let nextSession = null;

	await EffectCardShop.openUpgradeCorePhase(
		"effectCardShop.title",
		reactionIds,
		undefined,
		async (selectedSession) => {
			nextSession = selectedSession;
		}
	);

	return nextSession ?? state.session;
}