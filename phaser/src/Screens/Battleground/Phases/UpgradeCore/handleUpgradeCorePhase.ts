import { ClientState } from "@Models/ClientState";
import * as EffectCardShop from "@Screens/Battleground/Components/Shop/EffectCardShop";

export async function handleUpgradeCorePhase(clientState: ClientState) {
	const upgradeIds = clientState.session.options.map((option) => option.id);
	//let nextSession: Types.SessionData | null = null;

	await EffectCardShop.openUpgradeCorePhase(
		clientState,
		"upgradeCrystal.title",
		upgradeIds,
		// undefined,
		// async (selectedSession) => {
		// 	nextSession = selectedSession;
		// }
	);

}
