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
			// Validate and Apply Team Update (Security Check)
			const { team, valid } = MultiplayerLogic.validateAndApplyTeamUpdate(session, payload.team)

			if (!valid) {
				return new Response(JSON.stringify({ success: false, error: 'Invalid Team Update' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
			}

			await supabaseClient
				.from('player_sessions')
				.update({ team, updated_at: new Date() })
				.eq('id', session.id)

			return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
		}

		// Logic: Resolve Action
		const result = MultiplayerLogic.resolveAction(session, actionId, payload)
		let nextSession = { ...session, team: result.team }

		// Update Team in DB if changed
		if (result.updates && result.updates.length > 0) {
			const { error: updateError } = await supabaseClient
				.from('player_sessions')
				.update({ team: result.team, updated_at: new Date() })
				.eq('id', session.id)

			if (updateError) throw updateError
		}

		// Logic: Transition State
		const transitionResult = MultiplayerLogic.transitionToNextState(nextSession, actionId, payload)
		nextSession = transitionResult.session
		const combatResult = transitionResult.combatResult

		// Persist New State
		const { error: saveError } = await supabaseClient
			.from('player_sessions')
			.update({
				phase: nextSession.phase,
				round: nextSession.round,
				step: nextSession.step,
				seed: nextSession.seed,
				wins: nextSession.wins,
				losses: nextSession.losses,
				current_options: nextSession.current_options,
				action_log: nextSession.action_log,
				team: nextSession.team,
				updated_at: new Date()
			})
			.eq('id', session.id)

		if (saveError) throw saveError

		// Side Effects (Rating)
		if (combatResult) {
			const wonCombat = combatResult.won
			const ratingAmount = wonCombat ? 25 : -25
			await supabaseClient.rpc('increment_rating', { player_id: playerId, amount: ratingAmount })
		}

		// Determine response formatting
		// If we just finished combat (won/lost), the client might expect specific fields
		if (combatResult) {
			// This is the response for entering combat
			return new Response(JSON.stringify({
				success: true,
				nextPhase: 'combat',
				wonCombat: combatResult.won
			}), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
		}

		return new Response(JSON.stringify({
			success: true,
			nextPhase: nextSession.phase
		}), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

	} catch (error: any) {
		return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
	}
})
