import { supabase } from "@lib/supabase";

export async function createSession(
	selectedCrystalId: string,
	seedText: string,
	isMultiplayer: boolean,
) {

	//const session = createsessionModel(state, selectedCrystal)

	if (isMultiplayer) {

		multiplayerHandler(selectedCrystalId)
	} else {
		singlePlayerHandler(selectedCrystalId, seedText)
	}


}

async function multiplayerHandler(crystalId: string) {

	const { error } = await supabase.functions.invoke('action', {
		body: {
			actionId: 'start_session',
			payload: { selectedCrystalId: crystalId }
		}
	});
	if (error) {
		throw error;
	}
}

async function singlePlayerHandler(
	crystalId: string,
	seedText: string
) {
	// TODO: this should be part of the core
	// start new game (multiplayer: bool)
	const currentSeed = getSeed();
	const state = getState();
	state.gameData.seed = currentSeed;
	state.gameData.initialSeed = currentSeed;
	state.gameData.isSeeded = this.isSeededRun;

}

function createSessionObject() {

	const selectedCrystalId = payload?.selectedCrystalId
	const newSession = MultiplayerLogic.createInitialSession(playerId, selectedCrystalId)

	// Upsert Session
	const { data, error } = await supabaseClient
		.from('player_sessions')
		.upsert({
			player_id: playerId,
			phase: newSession.phase,
			round: newSession.round,
			step: newSession.step,
			seed: newSession.seed,
			initial_seed: newSession.initial_seed,
			current_options: newSession.current_options,
			action_log: [],
			wins: 0,
			losses: 0,
			team: newSession.team,
			updated_at: new Date()
		}, { onConflict: 'player_id' })
		.select()
		.single()

	if (error) throw error
	return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

}