import * as GameServer from "@Core/GameServer";
import * as Types from "@Core/Types";
import * as OrbShop from "./OrbShop";

export async function handleOrbShopPhase(): Promise<Types.SessionData> {
	const server = GameServer.getServer();
	let nextSession: Types.SessionData | null = null;

	await OrbShop.openOrbShop(async (orbId, targetUnitId) => {
		nextSession = await server.handleAction(
			state.session.player_id,
			"apply_orb",
			{ orbId, targetUnitId }
		);
	});

	return nextSession ?? state.session;
}