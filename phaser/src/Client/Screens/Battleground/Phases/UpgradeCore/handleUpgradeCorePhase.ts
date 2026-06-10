import * as EffectCardShop from "@Screens/Battleground/Components/Shop/EffectCardShop";

export async function handleUpgradeCorePhase() {
	const upgradeIds = state.session.options.map((option) => option.id);
	//let nextSession: Types.SessionData | null = null;

	await EffectCardShop.openUpgradeCorePhase(
		"upgradeCrystal.title",
		upgradeIds,
		// undefined,
		// async (selectedSession) => {
		// 	nextSession = selectedSession;
		// }
	);

}
