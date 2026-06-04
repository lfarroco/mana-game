import * as GameController from "@Core/GameController";
import * as Types from "@Core/Types";
import * as OrbShop from "@Screens/Battleground/Shop/OrbShop";

export async function handleOrbShopPhase(): Promise<Types.SessionData> {
	let nextSession: Types.SessionData | null = null;

	await OrbShop.openOrbShop(async (orbId, targetUnitId) => {
		nextSession = await GameController.applyOrb(orbId, targetUnitId);
	});

	return nextSession ?? state.session;
}