import { PhaseOptions } from "./MultiplayerTypes";
import { State } from "@Models/State";
import { supabase } from "@lib/supabase";
import { MultiplayerLogic } from "./MultiplayerLogic";
import { FORCE_ID_CPU } from "@Scenes/Battleground/ServerConstants";

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
	private useEdgeFunctions: boolean = true;

	private constructor() {
		const storedId = localStorage.getItem('mana_player_id');
		if (storedId) {
			this.playerId = storedId;
		} else {
			this.playerId = "player_" + Math.floor(Math.random() * 1000000);
		}

		// Check if Edge Functions are enabled (default true now)
		const useEdge = localStorage.getItem('use_edge_functions');
		if (useEdge === 'false') {
			this.useEdgeFunctions = false;
			console.log("[MultiplayerManager] Using Legacy Node Server");
		} else {
			console.log("[MultiplayerManager] Using Supabase Edge Functions");
		}

		// Check for existing Supabase session
		supabase.auth.getSession().then(({ data: { session } }) => {
			if (session) {
				this.updatePlayerId(session.user.id);
			}
		});

		console.log(`[MultiplayerManager] Initialized with Player ID: ${this.playerId}`);
	}

	public toggleEdgeFunctions(enable: boolean) {
		this.useEdgeFunctions = enable;
		localStorage.setItem('use_edge_functions', enable ? 'true' : 'false');
		console.log(`[MultiplayerManager] Edge Functions: ${this.useEdgeFunctions}`);
		window.location.reload(); // Reload to ensure clean state
	}

	private async getHeaders(): Promise<HeadersInit> {
		const { data: { session } } = await supabase.auth.getSession();
		const headers: any = { 'Content-Type': 'application/json' };
		if (session?.access_token) {
			headers['Authorization'] = `Bearer ${session.access_token}`;
		}
		return headers;
	}

	public async enableMultiplayer(selectedCrystalId?: string) {
		this.isMultiplayer = true;
		console.log("Multiplayer mode enabled");
		try {
			if (this.useEdgeFunctions) {
				// Call Edge Function to Start Session
				const { error } = await supabase.functions.invoke('action', {
					body: { actionId: 'start_session', payload: { selectedCrystalId } }
				});
				if (error) {
					throw error;
				}
			} else {
				await fetch(`${this.serverUrl}/multiplayer/connect`, {
					method: 'POST',
					headers: await this.getHeaders(),
					body: JSON.stringify({ playerId: this.playerId, selectedCrystalId })
				});
			}
			console.log("Connected to multiplayer session");
		} catch (e) {
			console.error("Failed to connect to multiplayer session", e);
			this.isMultiplayer = false;
		}
	}
	// ...
	public async sendOptionSelection(optionId: string, payload?: any): Promise<boolean> {
		console.log(`Sending selection ${optionId} to server...`, payload);

		if (this.useEdgeFunctions) {
			const { error } = await supabase.functions.invoke('action', {
				body: { actionId: optionId, payload }
			});
			if (error) {
				console.error("Edge Function Error:", error);
				return false;
			}
			return true;
		}

		const body: any = { playerId: this.playerId, actionId: optionId, ...((payload) || {}) };

		const response = await fetch(`${this.serverUrl}/multiplayer/action`, {
			method: 'POST',
			headers: await this.getHeaders(),
			body: JSON.stringify(body)
		});
		return response.ok;
	}

	public async sendTeamUpdate(team: any): Promise<boolean> {
		console.log("Sending team update to server...", team);

		if (this.useEdgeFunctions) {
			const { error } = await supabase.functions.invoke('action', {
				body: { actionId: 'update_team', payload: { team } }
			});
			return !error;
		}

		const response = await fetch(`${this.serverUrl}/multiplayer/action`, {
			method: 'POST',
			headers: await this.getHeaders(),
			body: JSON.stringify({ playerId: this.playerId, actionId: 'update_team', team })
		});
		return response.ok;
	}

	public disableMultiplayer() {
		this.isMultiplayer = false;
		console.log("Multiplayer mode disabled");
	}

	public async checkActiveSession(): Promise<boolean> {
		try {
			if (this.useEdgeFunctions) {
				const { data, error } = await supabase
					.from('player_sessions')
					.select('phase')
					.eq('player_id', this.playerId)
					.maybeSingle();

				if (error) {
					console.error("DB Error checking session:", error);
					return false;
				}

				if (data && data.phase !== 'victory' && data.phase !== 'game_over') {
					return true;
				}
				return false;
			}

			const response = await fetch(`${this.serverUrl}/multiplayer/state?playerId=${this.playerId}`, {
				headers: await this.getHeaders()
			});
			if (response.ok) {
				const data = await response.json();
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

		if (this.useEdgeFunctions) {
			const { data: session, error } = await supabase
				.from('player_sessions')
				.select('*')
				.eq('player_id', this.playerId)
				.single();

			if (error || !session) {
				throw new Error("Failed to fetch state from DB");
			}

			let combatState = undefined;
			if (session.phase === 'combat') {
				const simResult = MultiplayerLogic.simulateCombat(session as any);
				combatState = {
					units: simResult.initialUnits,
					enemyTeam: simResult.initialUnits.filter((u: any) => u.force === FORCE_ID_CPU),
					logs: simResult.logs,
					seed: session.seed
				};
			}

			// Map DB session to PhaseOptions
			return {
				phase: session.phase as any,
				round: session.round,
				options: session.current_options ? (session.current_options.options || []) : [],
				team: session.team,
				wins: session.wins,
				losses: session.losses,
				combatState: combatState
			};
		}

		const response = await fetch(`${this.serverUrl}/multiplayer/state?playerId=${this.playerId}`, {
			headers: await this.getHeaders()
		});
		if (!response.ok) {
			throw new Error("Failed to fetch state");
		}
		return await response.json();
	}


	public async handleAuthGuest(): Promise<any> {
		// Use Supabase Anonymous Sign-In (if enabled)
		// Or create a random managed user?
		// Supabase `signInAnonymously` exists in JS client
		const { data, error } = await supabase.auth.signInAnonymously();
		if (error) {
			// Fallback to legacy guest handling if Anon is disabled on Supabase
			console.warn("Supabase Anon Auth failed, falling back to legacy", error);
			return this.handleAuthGuestLegacy();
		}

		if (data.session) {
			this.updatePlayerId(data.session.user.id);
			// Ensure profile exists on server
			await this.getPlayerProfile(this.playerId);
			return { id: this.playerId, username: 'Guest', rating: 1000, matches_played: 0 };
		}
	}

	private async handleAuthGuestLegacy(): Promise<any> {
		const response = await fetch(`${this.serverUrl}/auth/guest`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ playerId: this.playerId })
		});
		if (!response.ok) throw new Error("Guest Auth Failed");
		const profile = await response.json();
		this.updatePlayerId(profile.id);
		return profile;
	}

	public async handleAuthLogin(username: string, password: string): Promise<any> {
		// Assume username is email for Supabase? Or strictly username?
		// Supabase requires email (or phone). If username, we need to map or use signInWithPassword({ email: username ... }) if we treated username as email.
		// For this game, let's assume the user enters an email. Or we append a fake domain?
		// Let's assume input is Email for now to be standard.
		// If the user inputs a "username", it will fail validation.
		// We will try to sign in with email.
		const { data, error } = await supabase.auth.signInWithPassword({
			email: username,
			password: password
		});

		if (error) throw new Error(error.message);

		if (data.session) {
			this.updatePlayerId(data.session.user.id);
			return await this.getPlayerProfile(this.playerId);
		}
	}

	public async handleAuthRegister(username: string, password: string): Promise<any> {
		const { data, error } = await supabase.auth.signUp({
			email: username,
			password: password,
		});

		if (error) throw new Error(error.message);

		if (data.session) {
			this.updatePlayerId(data.session.user.id);
			// Create Profile on Server (via auth/register endpoint which we will deprecate? No, we should hit player endpoint or let server handle it)
			// We'll call getPlayerProfile to ensure it exists (Server lazy creates)
			return await this.getPlayerProfile(this.playerId);
		} else if (data.user) {
			// Registration successful but maybe confirm email?
			throw new Error("Registration successful! Please confirm your email.");
		}
	}

	public async getPlayerProfile(playerId: string): Promise<any> {
		if (this.useEdgeFunctions) {
			const { data, error } = await supabase
				.from('players')
				.select('*')
				.eq('id', playerId)
				.maybeSingle();
			if (error) {
				console.error("Error fetching profile:", error);
				// Return default/mock profile instead of crashing
				return { id: playerId, username: 'Unknown', rating: 1000, matches_played: 0 };
			}
			if (!data) {
				return { id: playerId, username: 'Guest', rating: 1000, matches_played: 0 };
			}
			return data;
		}

		const response = await fetch(`${this.serverUrl}/player/${playerId}`, {
			headers: await this.getHeaders()
		});
		if (!response.ok) throw new Error("Fetch Profile Failed");
		return await response.json();
	}

	private updatePlayerId(id: string) {
		this.playerId = id;
		localStorage.setItem('mana_player_id', id);
		console.log(`[MultiplayerManager] Updated Player ID: ${this.playerId}`);
	}
}
