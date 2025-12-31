import { PhaseOptions } from "./MultiplayerTypes";
import { State } from "@Models/State";

export class MultiplayerManager {
	private static instance: MultiplayerManager;
	public isMultiplayer: boolean = false;

	private constructor() { }

	public static getInstance(): MultiplayerManager {
		if (!MultiplayerManager.instance) {
			MultiplayerManager.instance = new MultiplayerManager();
		}
		return MultiplayerManager.instance;
	}

	private playerId: string = "player_" + Math.floor(Math.random() * 10000);
	private serverUrl: string = "http://localhost:3000";

	public async enableMultiplayer() {
		this.isMultiplayer = true;
		console.log("Multiplayer mode enabled");
		try {
			await fetch(`${this.serverUrl}/multiplayer/connect`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ playerId: this.playerId })
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
		const body = { playerId: this.playerId, actionId: optionId, ...((payload) || {}) };
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
