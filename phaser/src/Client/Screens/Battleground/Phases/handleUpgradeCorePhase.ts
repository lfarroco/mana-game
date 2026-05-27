import * as GameServer from "@Core/GameServer";
import * as Types from "@Core/Types";
import * as EffectCardShop from "../Shop/EffectCardShop";

export async function handleUpgradeCorePhase(): Promise<Types.SessionData> {
	const server = GameServer.getServer();
	const upgradeIds = state.session.current_options.map((option) => option.id);
	let nextSession: Types.SessionData | null = null;

	await EffectCardShop.openUpgradeCorePhase(
		"upgradeCrystal.title",
		upgradeIds,
		async () => {
			nextSession = await server.handleAction(state.session.player_id, "upgrade_core_done");
		}
	);

	return nextSession ?? state.session;
}
