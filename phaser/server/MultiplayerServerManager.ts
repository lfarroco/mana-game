import { PhaseOptions } from "../src/Multiplayer/MultiplayerTypes";
import { Pool } from 'pg';
import { makeUnit } from "../src/Models/Entities/Unit";
import { FORCE_ID_PLAYER } from "../src/Scenes/Battleground/ServerConstants";
import { MultiplayerLogic } from "../src/Multiplayer/MultiplayerLogic";

// Database configuration
// In production, use environment variables
const pool = new Pool(
	process.env.DATABASE_URL
		? {
			connectionString: process.env.DATABASE_URL,
			ssl: { rejectUnauthorized: false } // Required for Supabase
		}
		: {
			user: 'postgres',
			host: 'localhost',
			database: 'mana_battle',
			password: 'password',
			port: 5432,
		}
);

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
	team?: any;
	updated_at?: Date;
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

	// Ensures a player profile exists in the DB. Called by authenticated endpoints.
	public async ensureProfile(playerId: string, email?: string): Promise<void> {
		await pool.query(
			'INSERT INTO players (id, username) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET username = COALESCE(players.username, EXCLUDED.username)',
			[playerId, email || `user_${playerId.substring(0, 8)}`]
		);
	}

	public async getPlayerProfile(playerId: string): Promise<any> {
		const res = await pool.query('SELECT id, username, rating, matches_played FROM players WHERE id = $1', [playerId]);
		if (res.rows.length === 0) throw new Error("Player not found");
		return res.rows[0];
	}

	private async updateRating(playerId: string, isWin: boolean) {
		const change = isWin ? 25 : -25;
		await pool.query('UPDATE players SET rating = rating + $1, matches_played = matches_played + 1 WHERE id = $2', [change, playerId]);
		console.log(`Updated rating for ${playerId}. Change: ${change}`);
	}

	// Since we are now async, we update signatures
	public async createSession(playerId: string, selectedCrystalId?: string): Promise<PlayerSession> {
		// Ensure team column exists (migration-like step)
		try {
			await pool.query('ALTER TABLE player_sessions ADD COLUMN IF NOT EXISTS team jsonb');
		} catch (e) {
			console.error("Error adding team column", e);
		}

		// Check for existing active session
		const existingSession = await this.getSession(playerId);
		if (existingSession) {
			if (existingSession.phase !== 'victory' && existingSession.phase !== 'game_over') {
				console.log(`Resuming active session for ${playerId} in phase ${existingSession.phase}`);
				return existingSession;
			}
		}

		// Initial Team Setup
		let initialTeam: any = null;
		if (selectedCrystalId) {
			const coreUnit = makeUnit(FORCE_ID_PLAYER, selectedCrystalId, { x: 1, y: 1 });
			initialTeam = { units: [coreUnit] };
		}

		// Generate a random seed
		const seed = Math.random().toString(36).substring(7);

		// Upsert session
		const query = `
            INSERT INTO player_sessions (player_id, phase, round, step, seed, initial_seed, current_options, action_log, wins, losses, team)
            VALUES ($1, 'encounter', 1, 1, $2, $2, null, '[]'::jsonb, 0, 0, $3)
            ON CONFLICT (player_id) 
            DO UPDATE SET phase = 'encounter', round = 1, step = 1, seed = EXCLUDED.seed, initial_seed = EXCLUDED.initial_seed, current_options = null, action_log = '[]'::jsonb, wins = 0, losses = 0, team = EXCLUDED.team, updated_at = now()
            RETURNING *;
        `;
		const res = await pool.query(query, [playerId, seed, initialTeam ? JSON.stringify(initialTeam) : null]);
		console.log(`Created/Updated session for ${playerId} with seed ${seed} and crystal ${selectedCrystalId}`);
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
			const stored = session.current_options as any;
			if (!Array.isArray(stored) && stored.options) {
				return {
					phase: session.phase as any,
					round: session.round,
					options: stored.options,
					combatState: stored.combatState
				};
			}
			return {
				phase: session.phase as any,
				round: session.round,
				options: session.current_options,
				team: session.team,
				wins: session.wins,
				losses: session.losses,
			};
		}

		let response: PhaseOptions = {
			phase: session.phase as any,
			round: session.round,
			options: [],
			team: session.team,
			wins: session.wins,
			losses: session.losses,
		};

		switch (session.phase) {
			case "encounter":
				const encOpts = MultiplayerLogic.generateEncounterOptions(session);
				response.options = encOpts.options;
				break;

			case "shop":
				const shopOpts = MultiplayerLogic.generateShopOptions(session);
				response.options = shopOpts.options;
				break;

			case "combat":
				console.log("[getPhaseOptions] Generating Combat...");
				const simResult = MultiplayerLogic.simulateCombat(session);

				response.options = [{ id: 'combat_done', label: "Continue" }];
				response.combatState = {
					units: simResult.initialUnits,
					enemyTeam: simResult.initialUnits.filter((u: any) => u.force === 5), // FORCE_ID_CPU is 5
					logs: simResult.logs,
					seed: session.seed
				};
				break;

			case "victory":
				response.options = [{ id: "menu:main_menu", label: "Victory! Return to Menu" }];
				break;

			case "game_over":
				response.options = [{ id: "menu:main_menu", label: "Defeat. Return to Menu" }];
				break;

			case "orb_shop":
				response.options = [{ id: 'upgrade_orb' }];
				break;
		}

		// Update DB with generated options
		const optionsToStore = response.combatState ? { options: response.options, combatState: response.combatState } : response.options;
		await pool.query('UPDATE player_sessions SET current_options = $1 WHERE player_id = $2', [JSON.stringify(optionsToStore), playerId]);

		return response;
	}

	public async handleAction(playerId: string, actionId: string, payload?: any): Promise<boolean> {
		const session = await this.getSession(playerId);
		if (!session) throw new Error("Session not found");

		console.log(`Player ${playerId} selected ${actionId} in Step ${session.step}`);

		// Handle Team Update (Pure State)
		if (actionId === 'update_team' && payload && payload.team) {
			// Logic to merge positions? 
			// We can move this to Logic too, but it's simple JSON update.
			// For now, keep simple updates here? Or update in DB directly.
			// Let's keep it here for now or update in DB directly.
			await pool.query('UPDATE player_sessions SET team = $1, updated_at = now() WHERE id = $2',
				[JSON.stringify(payload.team), session.id]);
			return true;
		}

		// Handle Discard (Meta)
		if (actionId === 'discard_unit' && payload && payload.unitId) {
			// Keep discard logic here or move to Logic? It sends updated team.
			// ...
			// Let's implement Discard in this file for now to save time on refactor
			// Logic: remove unit, update DB
			const team = session.team || { units: [] };
			team.units = team.units.filter((u: any) => u.id !== payload.unitId);
			await pool.query('UPDATE player_sessions SET team = $1, updated_at = now() WHERE id = $2', [JSON.stringify(team), session.id]);
			return true;
		}

		const existingAction = session.action_log.find((entry: any) =>
			entry.round === session.round &&
			entry.step === session.step
		);

		if (existingAction) {
			if (session.phase === 'combat' && actionId === 'combat_done') {
				console.warn(`[handleAction] Duplicate combat_done retry.`);
			} else {
				return true;
			}
		}

		// Validate Options... (Simplified: Assume valid if matched logic options or implicit)
		// ...

		// SERVER AUTHORITATIVE ACTION RESOLUTION
		const result = MultiplayerLogic.resolveAction(session, actionId, payload);
		if (result.updates && result.updates.length > 0) {
			console.log("Logic Updates:", result.updates);
			// Save modified team
			await pool.query('UPDATE player_sessions SET team = $1, updated_at = now() WHERE id = $2', [JSON.stringify(result.team), session.id]);
		}

		if (session.phase === "combat") {
			// Run Simulation for Result
			const simResult = MultiplayerLogic.simulateCombat(session);
			const playerUnits = simResult.finalState.gameData.player.units;
			const core = playerUnits.find(u => u.isCore);
			const wonCombat = core && core.life > 0;

			// Apply Stats post-combat
			if (session.team && session.team.units) {
				session.team.units.forEach((u: any) => {
					const simUnit = playerUnits.find(su => su.id === u.id);
					if (simUnit) {
						u.bonusPower = simUnit.bonusPower;
						u.power = simUnit.power;
						u.maxLife = simUnit.maxLife;
						u.life = u.maxLife;
					}
				});
				await pool.query('UPDATE player_sessions SET team = $1 WHERE id = $2', [JSON.stringify(session.team), session.id]);
			}

			const newSeed = MultiplayerLogic.generateNextSeed(session.seed, actionId);
			await this.advancePhase(session, newSeed, wonCombat || false);
			return true;
		}

		// Progression Logic (Step increments etc)
		// This part deals with State Transition (Phase Machine).
		// Can be moved to Logic.computeNextState(session, actionId).
		// For now, I'll keep the DB Updates here but use Logic helpers.

		if (session.step < 7) {
			// Determine next phase
			let nextPhase = "encounter";
			let nextOptions: any = null;

			if (session.step % 2 !== 0) {
				if (actionId === 'upgrade_unit' || actionId === 'power_distributor' || actionId === 'power_absorber') {
					nextPhase = "orb_shop";
					// Need to generate Orb Options?
					// Logic.generateOrbOptions?
					if (actionId === 'upgrade_unit') nextOptions = [{ id: 'upgrade_orb' }];
					if (actionId === 'power_distributor') nextOptions = [{ id: 'distribute_power_orb' }];
					if (actionId === 'power_absorber') nextOptions = [{ id: 'absorb_power_orb' }];
				} else {
					nextPhase = "shop";
				}
			} else {
				nextPhase = "encounter";
			}

			const newSeed = MultiplayerLogic.generateNextSeed(session.seed, actionId);

			// Append Log and Update
			const actionEntry = { round: session.round, phase: session.phase, step: session.step, actionId, payload };

			if (nextOptions) {
				await pool.query('UPDATE player_sessions SET step = step + 1, phase = $1, seed = $2, current_options = $3, action_log = action_log || $5::jsonb, updated_at = now() WHERE id = $4',
					[nextPhase, newSeed, JSON.stringify({ options: nextOptions }), session.id, JSON.stringify([actionEntry])]);
			} else {
				await pool.query('UPDATE player_sessions SET step = step + 1, phase = $1, seed = $2, current_options = null, action_log = action_log || $4::jsonb, updated_at = now() WHERE id = $3',
					[nextPhase, newSeed, session.id, JSON.stringify([actionEntry])]);
			}
		} else {
			// Step 7 (Encounter) -> Combat
			// ...

			// Save Ghost if team provided
			if (payload && payload.team) {
				await this.saveGhost(session.player_id, session.round, payload.team);
			}

			const newSeed = MultiplayerLogic.generateNextSeed(session.seed, actionId);
			const actionEntry = { round: session.round, phase: session.phase, step: session.step, actionId, payload };

			await pool.query('UPDATE player_sessions SET phase = $1, seed = $2, current_options = null, action_log = action_log || $4::jsonb, updated_at = now() WHERE id = $3',
				['combat', newSeed, session.id, JSON.stringify([actionEntry])]);
		}

		return true;
	}

	private async saveGhost(playerId: string, round: number, team: any) {
		await pool.query('INSERT INTO ghosts (player_id, round, team_composition) VALUES ($1, $2, $3)',
			[playerId, round, JSON.stringify(team)]);
	}

	private async advancePhase(session: PlayerSession, nextSeed: string, wonLastCombat: boolean) {
		let wins = session.wins;
		let losses = session.losses;

		if (wonLastCombat) wins++; else losses++;


		let nextPhase = 'encounter';
		if (wins >= 10) nextPhase = 'victory';
		if (losses >= 4) nextPhase = 'game_over';

		if (nextPhase === 'victory') {
			await this.updateRating(session.player_id, true);
		} else if (nextPhase === 'game_over') {
			await this.updateRating(session.player_id, false);
		}

		const nextRound = session.round + 1;

		await pool.query('UPDATE player_sessions SET phase = $1, round = $2, step = 1, seed = $3, wins = $4, losses = $5, current_options = null, team = $8, action_log = $7::jsonb, updated_at = now() WHERE id = $6',
			[nextPhase, nextRound, nextSeed, wins, losses, session.id, JSON.stringify([]), JSON.stringify({ units: session.team ? (session.team as any).units : [] })]); // Persist team (might be modified? No, combat doesn't modify persistent team usually, but health resets. Actually we keep same team object)

		console.log(`Session ${session.player_id} advanced. Wins: ${wins}, Losses: ${losses}. Next Phase: ${nextPhase}`);
	}
}
