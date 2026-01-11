import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { MultiplayerLogic } from './_shared.js'

import { corsHeaders } from '../_shared/cors.ts'

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
				// Fix: Retrieve units from battleData, not gameData (which is empty on server)
				playerUnits = simResult.finalState.battleData.units.filter((u: any) => u.force === 'PLAYER')
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

			console.log(`Combat Result: won=${wonCombat}, newWins=${wins}, newLosses=${losses}, nextPhase=${nextPhase}`)

			if (wonCombat) {
				await supabaseClient.rpc('increment_rating', { player_id: playerId, amount: 25 })
			} else {
				await supabaseClient.rpc('increment_rating', { player_id: playerId, amount: -25 })
			}

			const nextRound = session.round + 1
			let nextOptions = null

			if (nextPhase === 'encounter') {
				// Generate Encounter Options for the new round
				const nextSessionState = { ...session, round: nextRound, step: 1, seed: newSeed }
				const encounterResult = MultiplayerLogic.generateEncounterOptions(nextSessionState)
				nextOptions = encounterResult.options
			}

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
					current_options: nextOptions ? { options: nextOptions } : null,
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

			// Calculate Next Phase
			if (session.step % 2 !== 0) {
				// Odd steps -> Moving to Shop/OrbShop (Step 2, 4, 6)
				if (actionId === 'upgrade_unit' || actionId === 'power_distributor' || actionId === 'power_absorber') {
					nextPhase = 'orb_shop'
					// Orb Shop options are static based on entrance action
					if (actionId === 'upgrade_unit') nextOptions = [{ id: 'upgrade_orb' }]
					if (actionId === 'power_distributor') nextOptions = [{ id: 'distribute_power_orb' }]
					if (actionId === 'power_absorber') nextOptions = [{ id: 'absorb_power_orb' }]
				} else {
					nextPhase = 'shop'
					// Generate Shop Options
					// We need to temporarily update session log to assist generation if it relies on history (which it does)
					const tempSession = { ...session, action_log: [...(session.action_log || []), { round: session.round, step: session.step, actionId, payload }] }
					const shopResult = MultiplayerLogic.generateShopOptions(tempSession, actionId)
					nextOptions = shopResult.options
				}
			} else {
				// Even steps -> Moving to Encounter (Step 3, 5, 7.. wait 7 is combat)
				// Actually step check is < 7, so max current step is 6.
				// If current step is 6 (Shop/OrbShop), next is 7 (Combat).

				if (session.step === 6) {
					nextPhase = 'combat'
				} else {
					nextPhase = 'encounter'
					// Generate Encounter Options
					const tempSession = { ...session, action_log: [...(session.action_log || []), { round: session.round, step: session.step, actionId, payload }] }
					const encounterResult = MultiplayerLogic.generateEncounterOptions(tempSession)
					nextOptions = encounterResult.options
				}
			}

			const newSeed = MultiplayerLogic.generateNextSeed(session.seed, actionId)
			const actionEntry = { round: session.round, phase: session.phase, step: session.step, actionId, payload }
			const newLog = [...(session.action_log || []), actionEntry]


			// COMBAT TRANSITION
			if (nextPhase === 'combat') {
				// Step 7 logic (Combat)

				// Persist Ghost if team updated
				if (payload && payload.team) {
					await supabaseClient.from('ghosts').insert({ player_id: playerId, round: session.round, team_composition: payload.team })
				}

				// Generate Enemy Team & Simulate
				const enemyTeam = MultiplayerLogic.generateEnemyTeamForRound(session.round, session.wins)

				const nextSession = {
					...session,
					phase: 'combat',
					seed: newSeed,
					current_options: { combatState: { enemyTeam } },
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
					finalPlayerUnits: playerUnits
				}
				const options = [{ id: 'combat_done', label: 'Continue' }]

				await supabaseClient
					.from('player_sessions')
					.update({
						phase: 'combat',
						step: 7, // Ensure step is set to 7
						seed: newSeed,
						current_options: { options, combatState },
						action_log: newLog,
						updated_at: new Date()
					})
					.eq('id', session.id)

			} else {
				// NORMAL PROGRESSION (Encounter / Shop)
				const updateData: any = {
					step: session.step + 1,
					phase: nextPhase,
					seed: newSeed,
					action_log: newLog,
					current_options: nextOptions ? { options: nextOptions } : null,
					updated_at: new Date()
				}

				await supabaseClient
					.from('player_sessions')
					.update(updateData)
					.eq('id', session.id)
			}
		}

		return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

	} catch (error) {
		return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
	}
})
