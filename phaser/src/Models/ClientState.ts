import * as Models from "@game/Models";
import { LOCAL_PLAYER_ID } from "../SessionManager";
import { defaultSettings, type PlayerSettings } from "@game/settings/playerSettings";

export { defaultSettings, type PlayerSettings } from "@game/settings/playerSettings";
export { getUnitAt } from "@game/board/layout";

export type ClientState = {
	savedGames: string[];
	session: Models.SessionData;
	combatState?: Models.CombatState;
	settings: PlayerSettings;
};

export const initialState = (): ClientState => {
	const initialSeed = Date.now().toString();
	return {
		savedGames: [],
		session: {
			id: "default_local_session",
			player_id: LOCAL_PLAYER_ID,
			phase: "encounter",
			session_type: { type: "singleplayer" },
			round: 1,
			step: 0,
			seed: initialSeed,
			initial_seed: initialSeed,
			options: [],
			team: { units: [] },
			wins: 0,
			losses: 0,
			action_log: [],
			encounter_history: [],
			runStats: {
				damageDealt: 0,
				poisonDealt: 0,
				shieldDealt: 0,
				regenDealt: 0,
				healDealt: 0,
				mostPowerfulUnit: null,
				totalUnitsRecruited: 0,
				unitUsage: {},
			},
		},
		settings: defaultSettings(),
	};
};
