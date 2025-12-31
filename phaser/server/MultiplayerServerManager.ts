// We might need to import logical counterparts or move shared logic to a shared folder.
// For now, I'll mock the data generation or reuse what I can.
// Note: Imports from "src" might be tricky if they depend on Phaser or browser-specifics.
// existing serverCombatDemo uses imports from src, so it seems like we successfully compile/run src code in node.


import { PhaseOptions } from "../src/Multiplayer/MultiplayerTypes";
import { Pool } from 'pg';
import * as Card from "../src/Models/Entities/Card";
import { pickRandom } from "../src/utils";

// Database configuration
// In production, use environment variables
const pool = new Pool({
	user: 'postgres',
	host: 'localhost',
	database: 'mana_battle',
	password: 'password',
	port: 5432,
});

interface PlayerSession {
	id: string; // This is the session UUID
	player_id: string;
	phase: string;
	round: number;
	step: number;
	seed: string;
	initial_seed: string;
	action_log: any[];
	current_options?: any[];
	wins: number;
	losses: number;
}

export class MultiplayerServerManager {
	private static instance: MultiplayerServerManager;

	private constructor() { }

	public static getInstance(): MultiplayerServerManager {
		if (!MultiplayerServerManager.instance) {
			MultiplayerServerManager.instance = new MultiplayerServerManager();
		}
		return MultiplayerServerManager.instance;
	}

	// Since we are now async, we update signatures
	public async createSession(playerId: string): Promise<PlayerSession> {
		// Generate a random seed
		const seed = Math.random().toString(36).substring(7);

		// Upsert session
		const query = `
            INSERT INTO player_sessions (player_id, phase, round, step, seed, initial_seed, current_options, action_log, wins, losses)
            VALUES ($1, 'encounter', 1, 1, $2, $2, null, '[]'::jsonb, 0, 0)
            ON CONFLICT (player_id) 
            DO UPDATE SET phase = 'encounter', round = 1, step = 1, seed = EXCLUDED.seed, initial_seed = EXCLUDED.initial_seed, current_options = null, action_log = '[]'::jsonb, wins = 0, losses = 0, updated_at = now()
            RETURNING *;
        `;
		const res = await pool.query(query, [playerId, seed]);
		console.log(`Created/Updated session for ${playerId} with seed ${seed}`);
		return res.rows[0];
	}

	public async getSession(playerId: string): Promise<PlayerSession | undefined> {
		const query = 'SELECT * FROM player_sessions WHERE player_id = $1';
		const res = await pool.query(query, [playerId]);
		return res.rows[0];
	}

	public async getPhaseOptions(playerId: string): Promise<PhaseOptions> {
		const session = await this.getSession(playerId);
		if (!session) {
			throw new Error("Session not found");
		}

		console.log(`Getting options for ${playerId} in phase ${session.phase} (Round ${session.round}, Step ${session.step})`);

		// If stored options exist, return them (idempotency)
		if (session.current_options) {
			return {
				phase: session.phase as any,
				options: session.current_options
			};
		}

		let newOptions: any[] = [];
		let response: PhaseOptions = {
			phase: session.phase as any,
			options: []
		};

		// Pseudo-random generation based on seed + round + step


		switch (session.phase) {
			case "encounter":
				// Mock deterministic options using stepSeed
				newOptions = [
					{ id: `upgrade_unit` },
					{ id: `armory` },
					{ id: `healing_tent` }
				];
				response.options = newOptions;
				break;

			case "shop":
				const lastEncounterAction = session.action_log.find((a: any) => a.round === session.round && a.phase === 'encounter');
				const encounterId = lastEncounterAction ? lastEncounterAction.actionId : null;

				let filterType = "";
				// Map encounter ID to effect type filter
				// Matches client-side Encounter.ts logic
				if (encounterId) {
					if (encounterId === 'armory') filterType = 'damage';
					else if (encounterId === 'healing_tent') filterType = 'heal';
					else if (encounterId === 'frontier_fort') filterType = 'shield';
					else if (encounterId === 'forest_pools') filterType = 'regen';
					else if (encounterId === 'toxic_chamber') filterType = 'poison';
					else if (encounterId === 'trial_circuit') filterType = 'haste';
					else if (encounterId === 'trappers_guild') filterType = 'slow';
					else if (encounterId === 'thunder_spire') filterType = 'charge';
					else if (encounterId === 'commanders_tent') filterType = 'increase_power';
					else if (encounterId === 'assassins_hideout') filterType = 'increase_critical';
				}

				const allCards = Card.getAvailableCards();
				let filteredCards = allCards;

				if (filterType) {
					filteredCards = allCards.filter(card =>
					(card.effects?.some(eff => eff.id === filterType) ||
						card.reactions?.some(react => react.effects?.some(eff => eff.id === filterType)))
					);
				}

				// Fallback if filter returns empty (shouldn't happen with full collection but safe to have)
				if (filteredCards.length === 0) {
					filteredCards = allCards;
				}

				newOptions = pickRandom(filteredCards, 3).map(card => ({
					id: card.id,
					cost: 10 // Mock cost for now, logic can be added later
				}));

				response.options = newOptions;
				break;

			case "combat":
				newOptions = [{ id: 'combat_done' }];
				response.options = newOptions;
				break;

			case "victory":
				newOptions = [{ id: "menu:main_menu", label: "Victory! Return to Menu" }];
				response.options = newOptions;
				break;

			case "game_over":
				newOptions = [{ id: "menu:main_menu", label: "Defeat. Return to Menu" }];
				response.options = newOptions;
				break;

			default:
				break;
		}

		// Update DB with generated options
		await pool.query('UPDATE player_sessions SET current_options = $1 WHERE player_id = $2', [JSON.stringify(newOptions), playerId]);

		return response;
	}

	public async handleAction(playerId: string, actionId: string, payload?: any): Promise<boolean> {
		const session = await this.getSession(playerId);
		if (!session) {
			throw new Error("Session not found");
		}

		console.log(`Player ${playerId} selected ${actionId} in Step ${session.step}`);

		// Check for duplicate action in the current step
		const existingAction = session.action_log.find((entry: any) =>
			entry.round === session.round &&
			entry.phase === session.phase &&
			entry.step === session.step
		);

		if (existingAction) {
			console.warn(`Duplicate action detected for Player ${playerId} in Step ${session.step}. Ignoring.`);
			return true; // Return success to client so it doesn't retry, but don't process again
		}


		// Validate Action against allowed Options
		// We allow 'combat_done' implicitly if phase is combat? 
		// No, we added it to options.
		// We skip validation if current_options is null but allow it?
		// No, if options are null, client shouldn't be acting.

		if (session.current_options) {
			const validOption = session.current_options.find((opt: any) => opt.id === actionId);
			if (!validOption) {
				console.warn(`Action ${actionId} rejected: Invalid option for Player ${playerId} (Phase: ${session.phase})`);
				return false;
			}
		} else {
			// No options generated yet? or cleared.
			// Reject action.
			console.warn(`Action ${actionId} rejected: No active options for Player ${playerId}`);
			return false;
		}

		// Append action to log
		const actionEntry = {
			round: session.round,
			phase: session.phase,
			step: session.step,
			actionId: actionId,
			payload: payload
		};

		// We need to persist the log. Since we do updates below, we can combine or emit separate.
		// For simplicity, let's just append to the array in DB using specific postgres JSONB ops.
		await pool.query('UPDATE player_sessions SET action_log = action_log || $1::jsonb WHERE id = $2',
			[JSON.stringify([actionEntry]), session.id]);

		if (session.phase === "combat") {
			// End of combat, advancing to next round
			// We need to determine if we won or lost the combat.
			// Ideally this comes from the verify/simulate combat logic.
			// For now, we will assume a mock WIN if actionId contains 'win' or 50/50 if not specified
			// In reality, actionId here is the "combat_result" generic action, payload might have details?
			// But for strict server auth, we should simulate.

			// MOCK COMBAT RESULT:
			const wonCombat = Math.random() > 0.5; // TODO: Replace with actual simulation

			const newSeed = this.generateNextSeed(session.seed, actionId);
			await this.advancePhase(session, newSeed, wonCombat);
			return true;
		}

		// Handle Encounter/Shop progression

		if (session.step < 3) {
			// Stay in encounter/shop (or toggle)
			let nextPhase = "encounter";
			if (session.step === 1) nextPhase = "shop"; // After step 1 (Encounter) go to Shop (Step 2)
			if (session.step === 2) nextPhase = "encounter"; // After step 2 (Shop) go to Encounter (Step 3)

			// Update Seed: deterministic based on current seed + actionId
			const newSeed = this.generateNextSeed(session.seed, actionId);

			await pool.query('UPDATE player_sessions SET step = step + 1, phase = $1, seed = $2, current_options = null, updated_at = now() WHERE id = $3', [nextPhase, newSeed, session.id]);
		} else {
			// After Step 3, go to Combat
			// Save Ghost if team provided
			if (payload && payload.team) {
				await this.saveGhost(session.player_id, session.round, payload.team);
			}

			// New seed for combat? Or keep same? Usually keep same or update.
			// Let's update it to keep the chain moving.
			const newSeed = this.generateNextSeed(session.seed, actionId);

			// Generate Combat Result (or prepare for it)
			// For now, just transition phase
			await pool.query('UPDATE player_sessions SET phase = $1, seed = $2, current_options = null, updated_at = now() WHERE id = $3', ['combat', newSeed, session.id]);
		}

		return true;
	}

	private generateNextSeed(currentSeed: string, actionId: string): string {
		// Simple hash: rotate and mix chars
		const input = currentSeed + actionId;
		let hash = 0;
		for (let i = 0; i < input.length; i++) {
			const char = input.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32bit integer
		}
		return Math.abs(hash).toString(36);
	}

	private async saveGhost(playerId: string, round: number, team: any) {
		// Save to ghosts table
		const query = `
            INSERT INTO ghosts (player_id, round, team_composition)
            VALUES ($1, $2, $3)
        `;
		await pool.query(query, [playerId, round, JSON.stringify(team)]);
		console.log(`Saved ghost for ${playerId} Round ${round}`);
	}

	private async advancePhase(session: PlayerSession, nextSeed: string, wonLastCombat: boolean) {
		let wins = session.wins;
		let losses = session.losses;

		if (wonLastCombat) wins++; else losses++;

		let nextPhase = 'encounter';
		if (wins >= 10) nextPhase = 'victory';
		if (losses >= 4) nextPhase = 'game_over';

		const nextRound = session.round + 1;

		await pool.query('UPDATE player_sessions SET phase = $1, round = $2, step = 1, seed = $3, wins = $4, losses = $5, current_options = null, action_log = $7::jsonb, updated_at = now() WHERE id = $6',
			[nextPhase, nextRound, nextSeed, wins, losses, session.id, JSON.stringify([])]);

		console.log(`Session ${session.player_id} advanced. Wins: ${wins}, Losses: ${losses}. Next Phase: ${nextPhase}`);
	}
}
