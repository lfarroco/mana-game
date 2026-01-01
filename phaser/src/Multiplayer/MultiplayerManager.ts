import { PhaseOptions } from "./MultiplayerTypes";
import { State } from "@Models/State";

export class MultiplayerManager {
	private static instance: MultiplayerManager;
	public isMultiplayer: boolean = false;

	public static getInstance(): MultiplayerManager {
		if (!MultiplayerManager.instance) {
			MultiplayerManager.instance = new MultiplayerManager();
		}
		return MultiplayerManager.instance;
	}

	private playerId: string;
	private serverUrl: string = "http://localhost:3000";

	private constructor() {
		const storedId = localStorage.getItem('mana_player_id');
		if (storedId) {
			this.playerId = storedId;
		} else {
			this.playerId = "player_" + Math.floor(Math.random() * 1000000);
			localStorage.setItem('mana_player_id', this.playerId);
		}
		console.log(`[MultiplayerManager] Initialized with Player ID: ${this.playerId}`);
	}

	public async enableMultiplayer(selectedCrystalId?: string) {
		this.isMultiplayer = true;
		console.log("Multiplayer mode enabled");
		try {
			await fetch(`${this.serverUrl}/multiplayer/connect`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ playerId: this.playerId, selectedCrystalId })
			});
			console.log("Connected to multiplayer session");
		} catch (e) {
			console.error("Failed to connect to multiplayer session", e);
			this.isMultiplayer = false;
		}
	}

	public disableMultiplayer() {
		this.isMultiplayer = false;
		console.log("Multiplayer mode disabled");
	}

	public async checkActiveSession(): Promise<boolean> {
		try {
			const response = await fetch(`${this.serverUrl}/multiplayer/state?playerId=${this.playerId}`);
			if (response.ok) {
				const data = await response.json();
				// Check if session is active (not ended)
				// Actually, getPhaseOptions returns options, phase, etc.
				// If session doesn't exist, server returns 404 or error.
				// If session exists, we check phase.
				if (data && data.phase && data.phase !== 'victory' && data.phase !== 'game_over') {
					return true;
				}
			}
			return false;
		} catch (e) {
			console.log("[MultiplayerManager] checkActiveSession: No active session or error", e);
			return false;
		}
	}

	// Requests the current phase options from the server
	public async getPhaseOptions(_state: State): Promise<PhaseOptions> {
		console.log("Fetching phase options from server...");
		const response = await fetch(`${this.serverUrl}/multiplayer/state?playerId=${this.playerId}`);
		if (!response.ok) {
			throw new Error("Failed to fetch state");
		}
		return await response.json();
	}

	public async sendOptionSelection(optionId: string, payload?: any): Promise<boolean> {
		console.log(`Sending selection ${optionId} to server...`, payload);

		const body: any = { playerId: this.playerId, actionId: optionId, ...((payload) || {}) };

		const response = await fetch(`${this.serverUrl}/multiplayer/action`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		return response.ok;
	}

	public async sendTeamUpdate(team: any): Promise<boolean> {
		console.log("Sending team update to server...", team);
		const response = await fetch(`${this.serverUrl}/multiplayer/action`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ playerId: this.playerId, actionId: 'update_team', team })
		});
		return response.ok;
	}
}
