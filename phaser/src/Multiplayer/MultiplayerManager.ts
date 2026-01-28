import { PhaseOptions } from "./MultiplayerTypes";
import { State } from "@Models/State";
import { supabase } from "@lib/supabase";
import { MultiplayerLogic } from "./MultiplayerLogic";
import { FORCE_ID_CPU } from "@Scenes/Battleground/ServerConstants";

// TODO: this instance *might* not be necessary, but I'm not sure yet
export class MultiplayerManager {
	private static instance: MultiplayerManager;

	// Canonical source
	public isMultiplayer: boolean = false;

	public static getInstance(): MultiplayerManager {
		if (!MultiplayerManager.instance) {
			MultiplayerManager.instance = new MultiplayerManager();
		}
		return MultiplayerManager.instance;
	}

	private playerId: string;
	private initPromise: Promise<void>;

	private constructor() {
		const storedId = localStorage.getItem('mana_player_id');
		if (storedId) {
			this.playerId = storedId;
		} else {
			this.playerId = "player_" + Math.floor(Math.random() * 1000000);
		}

		console.log("[MultiplayerManager] Using Supabase Edge Functions");

		// Check for existing Supabase session
		this.initPromise = supabase.auth.getSession().then(({ data: { session } }) => {
			if (session) {
				this.updatePlayerId(session.user.id);
			}
		});

		console.log(`[MultiplayerManager] Initialized with Player ID: ${this.playerId}`);
	}


	public async enableMultiplayer(selectedCrystalId?: string) {
		this.isMultiplayer = true;
		console.log("Multiplayer mode enabled");
		if (selectedCrystalId) {

		} else {
			console.log("[MultiplayerManager] Resuming existing session (no crystal selected)");
		}
		console.log("Connected to multiplayer session");
	}
	// ...
	public async sendOptionSelection(optionId: string, payload?: any): Promise<boolean> {
		console.log(`Sending selection ${optionId} to server...`, payload);

		const { error } = await supabase.functions.invoke('action', {
			body: { actionId: optionId, payload }
		});
		if (error) {
			console.error("Edge Function Error:", error);
			return false;
		}
		return true;

	}

	public async sendTeamUpdate(team: any): Promise<boolean> {
		console.log("Sending team update to server...", team);

		const { error } = await supabase.functions.invoke('action', {
			body: { actionId: 'update_team', payload: { team } }
		});
		return !error;

	}

	// TODO: if arena, fetch from supabase, else, localhost
	public async checkActiveSession(): Promise<boolean> {
		await this.initPromise;
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

	// Requests the current phase options from the server
	public async getPhaseOptions(_state: State): Promise<PhaseOptions> {
		console.log("Fetching phase options from server...");

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
			const optionsCombatState = (session.current_options as any)?.combatState;
			if (optionsCombatState && optionsCombatState.logs) {
				console.log("Using server-provided combat logs");
				combatState = {
					units: optionsCombatState.initialUnits,
					enemyTeam: optionsCombatState.enemyTeam,
					logs: optionsCombatState.logs,
					seed: session.seed
				};
			} else {
				console.log("Simulating combat locally (fallback)");
				const simResult = MultiplayerLogic.simulateCombat(session as any);
				combatState = {
					units: simResult.initialUnits,
					enemyTeam: simResult.initialUnits.filter((u: any) => u.force === FORCE_ID_CPU),
					logs: simResult.logs,
					seed: session.seed
				};
			}
		}

		// Map DB session to PhaseOptions
		// Handle both Array and Object format for options
		const rawOptions = session.current_options;
		const optionsList = Array.isArray(rawOptions) ? rawOptions : (rawOptions?.options || []);

		return {
			phase: session.phase as any,
			round: session.round,
			options: optionsList,
			team: session.team,
			wins: session.wins,
			losses: session.losses,
			combatState: combatState
		};

	}


	public async handleSteamAuth(): Promise<any> {
		if (!(window as any).steamworks) {
			console.warn("Steamworks not available");
			return null;
		}

		// Get Ticket using steamworks.js
		console.log("Requesting Steam Auth Ticket...");
		const ticket = await (window as any).steamworks.auth.getSessionTicket();
		console.log("Got Ticket:", ticket);

		// Convert Buffer to Hex String for JSON transport
		const ticketHex = ticket.ticket.toString('hex');

		// Call Edge Function
		const { data, error } = await supabase.functions.invoke('auth-steam', {
			body: { ticket: ticketHex }
		});

		if (error) throw error;

		// Data should be Session
		if (data && data.access_token) {
			console.log("Got Session from Steam Auth", data.user.id);
			await supabase.auth.setSession(data);
			this.updatePlayerId(data.user.id);
			return await this.getPlayerProfile(this.playerId);
		}
		throw new Error("Invalid Session from Steam Auth");
	}

	public async handleAuthGuest(): Promise<any> {
		const { data, error } = await supabase.auth.signInAnonymously();

		if (error) {
			console.error(error)
		}

		if (data.session) {
			this.updatePlayerId(data.session.user.id);
			// Ensure profile exists on server
			await this.getPlayerProfile(this.playerId);
			return { id: this.playerId, username: 'Guest', rating: 1000, matches_played: 0 };
		}
	}

	public async handleAuthLogin(username: string, password: string): Promise<any> {
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

	public async handleAuthRegister(email: string, password: string, username?: string): Promise<any> {
		const options: any = {};
		if (username) {
			options.data = { username };
		}

		const { data, error } = await supabase.auth.signUp({
			email: email,
			password: password,
			options: options
		});

		if (error) throw new Error(error.message);

		if (data.session) {
			this.updatePlayerId(data.session.user.id);
			// Create Profile on Server (via auth/register endpoint which we will deprecate? No, we should hit player endpoint or let server handle it)
			// We'll call getPlayerProfile to ensure it exists (Server lazy creates)
			return await this.getPlayerProfile(this.playerId);
		} else if (data.user) {
			// Registration successful but maybe confirm email?
			return {
				success: true,
				requiresConfirmation: true,
				user: data.user
			};
		}
	}

	public async getPlayerProfile(playerId: string): Promise<any> {
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

	public async logout() {
		await supabase.auth.signOut();

		Object.keys(localStorage).forEach((key) => {
			if (key.startsWith('sb-') || key.includes('supabase')) {
				localStorage.removeItem(key);
			}
		});
		localStorage.removeItem('mana_player_id');

		document.cookie.split(";").forEach((c) => {
			document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
		});

		this.playerId = "player_" + Math.floor(Math.random() * 1000000);
		console.log("Logged out. New temp ID:", this.playerId);
	}

	private updatePlayerId(id: string) {
		this.playerId = id;
		localStorage.setItem('mana_player_id', id);
		console.log(`[MultiplayerManager] Updated Player ID: ${this.playerId}`);
	}
}
