import { FORCE_ID_PLAYER } from "@Constants/constants";
import { makeUnit, Unit } from "./Entities/Unit";
import { pickRandom } from "utils";
import { generateNextSeed } from "./Seed";

type Session = {
	id: string; // This is the session UUID
	player_id: string;
	phase: string;
	round: number;
	step: number;
	seed: string;
	initial_seed: string;
	action_log: string[];
	current_options: string[];
	wins: number;
	losses: number;
	team: { units: Unit[] };
	updated_at: Date;
}

function createNewSessionRecord(
	playerId: string,
	selectedCrystalId: string,
	seedText: string | null
): Session {
	const seed = seedText ? seedText : Math.random().toString(36).substring(7);
	const initialSeed = seed;

	const core = makeUnit(FORCE_ID_PLAYER, selectedCrystalId)
	core.isCore = true;
	const team = {
		units: [core]
	};

	const session: Session = {
		id: '',
		player_id: playerId,
		phase: 'encounter',
		round: 1,
		step: 1,
		seed: generateNextSeed(initialSeed, "start"),
		initial_seed: initialSeed,
		action_log: [],
		wins: 0,
		losses: 0,
		team,
		// TODO: simple option picking for now
		current_options: pickRandom(
			ENCOUNTER_IDS,
			3
		),
		updated_at: new Date()
	};

	return session;
}
const ENCOUNTER_IDS = [
	'upgrade_unit',
	'armory',
	'healing_tent',
	'frontier_fort',
	'forest_pools',
	'toxic_chamber',
	'trial_circuit',
	'trappers_guild',
	'thunder_spire',
	'commanders_tent',
	'assassins_hideout',
	'power_distributor',
	'power_absorber',
	'silver_shop',
	'gold_shop'
];

