import * as GameServer from "@Core/GameServer";
import * as Types from "@Core/Types";
import * as EffectCardShop from "../Shop/EffectCardShop";

export async function handleAddReactionCorePhase(): Promise<Types.SessionData> {
	const server = GameServer.getServer();
	const reactionIds = state.session.current_options.map((option) => option.id);
	let nextSession: Types.SessionData | null = null;

	await EffectCardShop.openUpgradeCorePhase(
		"effectCardShop.title",
		reactionIds,
		async () => {
			nextSession = await server.handleAction(state.session.player_id, "add_reaction_core_done");
		}
	);

	if (nextSession === null && state.session.phase === "add_reaction_core") {
		nextSession = await server.handleAction(state.session.player_id, "add_reaction_core_done");
	}

	return nextSession ?? state.session;
}