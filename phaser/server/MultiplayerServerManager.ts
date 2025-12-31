import { PhaseOptions } from "../src/Multiplayer/MultiplayerTypes";
// We might need to import logical counterparts or move shared logic to a shared folder.
// For now, I'll mock the data generation or reuse what I can.
// Note: Imports from "src" might be tricky if they depend on Phaser or browser-specifics.
// existing serverCombatDemo uses imports from src, so it seems like we successfully compile/run src code in node.

import { PhaseOptions } from "../src/Multiplayer/MultiplayerTypes";
import { Pool } from 'pg';

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
	current_options?: any[];
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
		// Upsert session
		const query = `
            INSERT INTO player_sessions (player_id, phase, round, current_options)
            VALUES ($1, 'encounter', 1, null)
            ON CONFLICT (player_id) 
            DO UPDATE SET phase = 'encounter', round = 1, current_options = null, updated_at = now()
            RETURNING *;
        `;
		const res = await pool.query(query, [playerId]);
		console.log(`Created/Updated session for ${playerId}`);
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

		console.log(`Getting options for ${playerId} in phase ${session.phase}`);

		let newOptions: any[] = [];
		// If options already exist, return them? For now always regenerate if null
		// But to keep simple, let's regenerate for this stateless flow unless stored

		// Actually, we should store them to validate action. 
		if (session.current_options) {
			// return persisted options? 
			// Logic: If user refreshes, show same options.
		}

		let response: PhaseOptions = {
			phase: session.phase as any,
			options: []
		};

		switch (session.phase) {
			case "encounter":
				newOptions = [
					{ id: "upgrade_unit" },
					{ id: "armory" },
					{ id: "healing_tent" }
				];
				response.options = newOptions;
				break;

			case "shop":
				newOptions = [
					{ id: "card:archer", cost: 10 },
					{ id: "card:knight", cost: 15 }
				];
				response.options = newOptions;
				break;

			case "combat":
			case "upgrade_core":
			case "add_reaction_core":
				newOptions = []; // TODO
				response.options = newOptions;
				break;

			default:
				break;
		}

		// Update DB with generated options if different
		if (JSON.stringify(newOptions) !== JSON.stringify(session.current_options)) {
			await pool.query('UPDATE player_sessions SET current_options = $1 WHERE player_id = $2', [JSON.stringify(newOptions), playerId]);
		}

		return response;
	}

	public async handleAction(playerId: string, actionId: string): Promise<boolean> {
		const session = await this.getSession(playerId);
		if (!session) {
			throw new Error("Session not found");
		}

		console.log(`Player ${playerId} selected ${actionId}`);
		// Here we would validate that actionId is in session.current_options

		// Transition logic (Mock)
		await this.advancePhase(session);
		return true;
	}

	private async advancePhase(session: PlayerSession) {
		let nextPhase = session.phase;
		let nextRound = session.round;

		// Simple loop: encounter -> shop -> combat -> encounter...
		if (session.phase === "encounter") {
			nextPhase = "shop";
		} else if (session.phase === "shop") {
			nextPhase = "combat";
		} else if (session.phase === "combat") {
			nextPhase = "encounter";
			nextRound++;
		}

		await pool.query('UPDATE player_sessions SET phase = $1, round = $2, current_options = null, updated_at = now() WHERE id = $3',
			[nextPhase, nextRound, session.id]);

		console.log(`Session ${session.player_id} advanced to ${nextPhase}`);
	}
}
