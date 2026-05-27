import * as Types from "@Core/Types";
import * as EffectCardShop from "../Shop/EffectCardShop";

export async function handleUpgradeCorePhase(): Promise<Types.SessionData> {
	const upgradeIds = state.session.current_options.map((option) => option.id);
	let nextSession: Types.SessionData | null = null;

	await EffectCardShop.openUpgradeCorePhase(
		"upgradeCrystal.title",
		upgradeIds,
		undefined,
		async (selectedSession) => {
			nextSession = selectedSession;
		}
	);

	return nextSession ?? state.session;
}
