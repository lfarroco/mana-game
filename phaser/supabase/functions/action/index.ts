import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { MultiplayerLogic } from './_shared.js'

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders })
	}

	try {
		const supabaseClient = createClient(
			Deno.env.get('SUPABASE_URL') ?? '',
			Deno.env.get('SUPABASE_ANON_KEY') ?? '',
			{ global: { headers: { Authorization: req.headers.get('Authorization')! } } }
		)

		const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
		if (authError || !user) throw new Error('Unauthorized')

		const { actionId, payload } = await req.json()
		const playerId = user.id

		// Handle Start Session
		if (actionId === 'start_session') {
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


		// Fetch Session
		const { data: session, error: sessError } = await supabaseClient
			.from('player_sessions')
			.select('*')
			.eq('player_id', playerId)
			.single()

		if (sessError || !session) throw new Error('Session not found')

		console.log(`Player ${playerId} requesting ${actionId}`)

		// Handle Team Update (Non-progression)
		if (actionId === 'update_team' && payload && payload.team) {
			// Merge positions logic (simplified)
			const sessionTeam = session.team || { units: [] }
			// Assumption: client sends updated positions. 
			// Logic.resolveAction doesn't handle pure position updates, so we do it here or update DB.
			await supabaseClient
				.from('player_sessions')
				.update({ team: payload.team, updated_at: new Date() })
				.eq('id', session.id)

			return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
		}

		// Logic: Resolve Action
		const result = MultiplayerLogic.resolveAction(session, actionId, payload)

		if (result.updates && result.updates.length > 0) {
			// Update Team in DB
			await supabaseClient
				.from('player_sessions')
				.update({ team: result.team, updated_at: new Date() })
				.eq('id', session.id)

			// Update local session object for further processing
			session.team = result.team
		}

		if (session.phase === 'combat') {
			const combatState = session.current_options?.combatState
			let wonCombat = false
			let playerUnits: any[] = []

			if (combatState && combatState.finalPlayerUnits) {
				wonCombat = combatState.wonCombat
				playerUnits = combatState.finalPlayerUnits
			} else {
				// Fallback Simulation (Legacy/Failover)
				const simResult = MultiplayerLogic.simulateCombat(session)
				playerUnits = simResult.finalState.gameData.player.units
				const core = playerUnits.find((u: any) => u.isCore)
				wonCombat = core && core.life > 0
			}

			// Update Team Stats
			if (session.team && session.team.units) {
				session.team.units.forEach((u: any) => {
					const simUnit = playerUnits.find((su: any) => su.id === u.id)
					if (simUnit) {
						u.bonusPower = simUnit.bonusPower
						u.power = simUnit.power
						u.maxLife = simUnit.maxLife
						u.life = u.maxLife
					}
				})

				await supabaseClient
					.from('player_sessions')
					.update({ team: session.team })
					.eq('id', session.id)
			}

			const newSeed = MultiplayerLogic.generateNextSeed(session.seed, actionId)

			// Advance Phase Logic
			const wins = session.wins + (wonCombat ? 1 : 0)
			const losses = session.losses + (wonCombat ? 0 : 1)
			let nextPhase = 'encounter'
			if (wins >= 10) nextPhase = 'victory'
			if (losses >= 4) nextPhase = 'game_over'

			if (wonCombat) {
				await supabaseClient.rpc('increment_rating', { player_id: playerId, amount: 25 })
			} else {
				await supabaseClient.rpc('increment_rating', { player_id: playerId, amount: -25 })
			}

			const nextRound = session.round + 1
			const actionEntry = { round: session.round, phase: session.phase, step: session.step, actionId: 'combat_done', payload: {} }

			await supabaseClient
				.from('player_sessions')
				.update({
					phase: nextPhase,
					round: nextRound,
					step: 1,
					seed: newSeed,
					wins: wins,
					losses: losses,
					current_options: null,
					action_log: [], // Clear log
					team: session.team, // Persist stats
					updated_at: new Date()
				})
				.eq('id', session.id)

			return new Response(JSON.stringify({ success: true, nextPhase, wonCombat }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
		}

		// Progression Logic (Encounter/Shop)
		if (session.step < 7) {
			let nextPhase = 'encounter'
			let nextOptions = null

			if (session.step % 2 !== 0) {
				if (actionId === 'upgrade_unit' || actionId === 'power_distributor' || actionId === 'power_absorber') {
					nextPhase = 'orb_shop'
					if (actionId === 'upgrade_unit') nextOptions = [{ id: 'upgrade_orb' }]
					if (actionId === 'power_distributor') nextOptions = [{ id: 'distribute_power_orb' }]
					if (actionId === 'power_absorber') nextOptions = [{ id: 'absorb_power_orb' }]
				} else {
					nextPhase = 'shop'
				}
			} else {
				nextPhase = 'encounter'
			}

			const newSeed = MultiplayerLogic.generateNextSeed(session.seed, actionId)
			const actionEntry = { round: session.round, phase: session.phase, step: session.step, actionId, payload }

			// Append log (need to fetch existing or rely on append via Postgres? Supabase append using JSONB || operator might be tricky via SDK update)
			// SDK update replaces. So we must append manually using current session.action_log
			const newLog = [...(session.action_log || []), actionEntry]

			const updateData: any = {
				step: session.step + 1,
				phase: nextPhase,
				seed: newSeed,
				action_log: newLog,
				updated_at: new Date()
			}

			if (nextOptions) {
				updateData.current_options = { options: nextOptions }
			} else {
				updateData.current_options = null
			}

			await supabaseClient
				.from('player_sessions')
				.update(updateData)
				.eq('id', session.id)

			// Step 7 -> Combat
			if (payload && payload.team) {
				await supabaseClient.from('ghosts').insert({ player_id: playerId, round: session.round, team_composition: payload.team })
			}

			const newSeed = MultiplayerLogic.generateNextSeed(session.seed, actionId)
			const actionEntry = { round: session.round, phase: session.phase, step: session.step, actionId, payload }
			const newLog = [...(session.action_log || []), actionEntry]

			// Generate Enemy Team and Simulate Combat
			const enemyTeam = MultiplayerLogic.generateEnemyTeamForRound(session.round, session.wins)

			// Construct Next Session for Simulation
			const nextSession = {
				...session,
				phase: 'combat',
				seed: newSeed,
				current_options: { combatState: { enemyTeam } }, // Mock options for Logic to pick up
				team: payload && payload.team ? payload.team : session.team
			}

			const simResult = MultiplayerLogic.simulateCombat(nextSession)

			const playerUnits = simResult.finalState.gameData.player.units
			const core = playerUnits.find((u: any) => u.isCore)
			const wonCombat = core && core.life > 0

			const combatState = {
				enemyTeam,
				seed: newSeed,
				wonCombat,
				initialUnits: simResult.initialUnits,
				finalPlayerUnits: playerUnits // Store final stats for application
			}
			const options = [{ id: 'combat_done', label: 'Continue' }]

			await supabaseClient
				.from('player_sessions')
				.update({
					phase: 'combat',
					seed: newSeed,
					current_options: { options, combatState },
					action_log: newLog,
					updated_at: new Date()
				})
				.eq('id', session.id)
		}

		return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

	} catch (error) {
		return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
	}
})
