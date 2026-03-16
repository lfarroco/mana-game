import { PhaseOptions } from "@Multiplayer/MultiplayerTypes";
import { Unit } from "@Models/Entities/Unit";
import { State } from "@Models/State";
import { supabase } from "@lib/supabase";
import * as GameLogic from "@Core/GameLogic";
import { FORCE_ID_CPU } from "@Scenes/Battleground/ServerConstants";
import { createLogger } from "@Utils/Logger";

// Internal state
let isMultiplayer: boolean = false;
let playerId: string;
let initPromise: Promise<void> = Promise.resolve();
let authInitialized = false;
const logger = createLogger("MultiplayerManager");

// Initialize the player ID
const storedId = localStorage.getItem("mana_player_id");
if (storedId) {
	playerId = storedId;
} else {
	playerId = "player_" + Math.floor(Math.random() * 1000000);
}

const initializeAuthSession = (): Promise<void> => {
	if (!authInitialized) {
		authInitialized = true;
		initPromise = supabase.auth
			.getSession()
			.then(({ data: { session } }) => {
				if (session) {
					updatePlayerId(session.user.id);
				}
			})
			.catch((error) => {
				logger.warn("Unable to initialize auth session", { error });
			});
	}

	return initPromise;
};

logger.info("Initialized multiplayer manager", { playerId });

export { isMultiplayer };

export function disableMultiplayer() {
	isMultiplayer = false;
	logger.info("Multiplayer mode disabled");
}

export async function enableMultiplayer(selectedCrystalId?: string) {
	isMultiplayer = true;
	await initializeAuthSession();
	logger.info("Multiplayer mode enabled", { hasSelectedCrystal: Boolean(selectedCrystalId) });
	if (selectedCrystalId) {
	} else {
		logger.info("Resuming existing session without crystal selection");
	}
	logger.info("Connected to multiplayer session");
}
export async function sendOptionSelection(optionId: string, payload?: unknown): Promise<boolean> {
	logger.debug("Sending option selection", { optionId, payload });

	const { error } = await supabase.functions.invoke("action", {
		body: { actionId: optionId, payload },
	});
	if (error) {
		logger.error("Edge function action invoke failed", { optionId, error });
		return false;
	}
	return true;
}

export async function sendTeamUpdate(team: { units: Unit[] }): Promise<boolean> {
	logger.debug("Sending team update", { unitCount: team.units.length });

	const { error } = await supabase.functions.invoke("action", {
		body: { actionId: "update_team", payload: { team } },
	});
	return !error;
}

// TODO: if arena, fetch from supabase, else, localhost
export async function checkActiveSession(): Promise<boolean> {
	await initializeAuthSession();
	const { data, error } = await supabase
		.from("player_sessions")
		.select("phase, team, current_options")
		.eq("player_id", playerId)
		.maybeSingle();

	if (error) {
		logger.error("Failed to check active session", { error, playerId });
		return false;
	}

	if (!data) {
		return false;
	}

	if (data.phase === "victory" || data.phase === "game_over") {
		return false;
	}

	const teamUnits = Array.isArray((data as any).team?.units) ? (data as any).team.units : [];
	const hasCore = teamUnits.some((unit: any) => unit?.isCore === true);

	const rawOptions = (data as any).current_options;
	const optionsList = Array.isArray(rawOptions) ? rawOptions : rawOptions?.options || [];
	const hasCombatState = Boolean(rawOptions?.combatState);

	if (!hasCore) {
		logger.warn("Ignoring invalid active session: missing core unit", {
			playerId,
			phase: data.phase,
		});
		return false;
	}

	if (data.phase === "combat") {
		return optionsList.length > 0 || hasCombatState;
	}

	return optionsList.length > 0;
}

// Requests the current phase options from the server
export async function getPhaseOptions(_state: State): Promise<PhaseOptions> {
	logger.debug("Fetching phase options from server", { playerId });

	const { data: session, error } = await supabase
		.from("player_sessions")
		.select("*")
		.eq("player_id", playerId)
		.single();

	if (error || !session) {
		throw new Error("Failed to fetch state from DB");
	}

	let combatState = undefined;
	if (session.phase === "combat") {
		const optionsCombatState = (session.current_options as any)?.combatState;
		if (optionsCombatState && optionsCombatState.logs) {
			logger.debug("Using server-provided combat logs");
			combatState = {
				units: optionsCombatState.initialUnits,
				enemyTeam: optionsCombatState.enemyTeam,
				logs: optionsCombatState.logs,
				seed: session.seed,
			};
		} else {
			logger.warn("Combat logs missing from server response; simulating locally");
			const simResult = GameLogic.simulateCombat(session as any);
			combatState = {
				units: simResult.initialUnits,
				enemyTeam: simResult.initialUnits.filter((u: any) => u.force === FORCE_ID_CPU),
				logs: simResult.logs,
				seed: session.seed,
			};
		}
	}

	// Map DB session to PhaseOptions
	// Handle both Array and Object format for options
	const rawOptions = session.current_options;
	const optionsList = Array.isArray(rawOptions) ? rawOptions : rawOptions?.options || [];

	return {
		phase: session.phase as any,
		round: session.round,
		options: optionsList,
		team: session.team,
		wins: session.wins,
		losses: session.losses,
		combatState: combatState,
	};
}

export async function handleSteamAuth(): Promise<any> {
	if (!(window as any).steamworks) {
		logger.warn("Steamworks not available");
		return null;
	}

	// Get Ticket using steamworks.js
	logger.info("Requesting Steam auth ticket");
	const ticket = await (window as any).steamworks.auth.getSessionTicket();
	logger.debug("Received Steam auth ticket");

	// Convert Buffer to Hex String for JSON transport
	const ticketHex = ticket.ticket.toString("hex");

	// Call Edge Function
	const { data, error } = await supabase.functions.invoke("auth-steam", {
		body: { ticket: ticketHex },
	});

	if (error) throw error;

	// Data should be Session
	if (data && data.access_token) {
		logger.info("Steam auth succeeded", { userId: data.user.id });
		await supabase.auth.setSession(data);
		updatePlayerId(data.user.id);
		return await getPlayerProfile(playerId);
	}
	throw new Error("Invalid Session from Steam Auth");
}

export async function handleAuthGuest(): Promise<any> {
	const { data, error } = await supabase.auth.signInAnonymously();

	if (error) {
		logger.error("Guest auth failed", { error });
	}

	if (data.session) {
		updatePlayerId(data.session.user.id);
		// Ensure profile exists on server
		await getPlayerProfile(playerId);
		return { id: playerId, username: "Guest", rating: 1000, matches_played: 0 };
	}
}

export async function handleAuthLogin(username: string, password: string): Promise<any> {
	const { data, error } = await supabase.auth.signInWithPassword({
		email: username,
		password: password,
	});

	if (error) throw new Error(error.message);

	if (data.session) {
		updatePlayerId(data.session.user.id);
		return await getPlayerProfile(playerId);
	}
}

export async function handleAuthRegister(
	email: string,
	password: string,
	username?: string
): Promise<unknown> {
	const options: { data?: { username: string } } = {};
	if (username) {
		options.data = { username };
	}

	const { data, error } = await supabase.auth.signUp({
		email: email,
		password: password,
		options: options,
	});

	if (error) throw new Error(error.message);

	if (data.session) {
		updatePlayerId(data.session.user.id);
		// Create Profile on Server (via auth/register endpoint which we will deprecate? No, we should hit player endpoint or let server handle it)
		// We'll call getPlayerProfile to ensure it exists (Server lazy creates)
		return await getPlayerProfile(playerId);
	} else if (data.user) {
		// Registration successful but maybe confirm email?
		return {
			success: true,
			requiresConfirmation: true,
			user: data.user,
		};
	}
}

export async function getPlayerProfile(profilePlayerId: string): Promise<any> {
	const { data, error } = await supabase
		.from("players")
		.select("*")
		.eq("id", profilePlayerId)
		.maybeSingle();
	if (error) {
		logger.error("Error fetching profile", { profilePlayerId, error });
		// Return default/mock profile instead of crashing
		return { id: profilePlayerId, username: "Unknown", rating: 1000, matches_played: 0 };
	}
	if (!data) {
		return { id: profilePlayerId, username: "Guest", rating: 1000, matches_played: 0 };
	}
	return data;
}

export async function logout() {
	await supabase.auth.signOut();

	Object.keys(localStorage).forEach((key) => {
		if (key.startsWith("sb-") || key.includes("supabase")) {
			localStorage.removeItem(key);
		}
	});
	localStorage.removeItem("mana_player_id");

	document.cookie.split(";").forEach((c) => {
		document.cookie = c
			.replace(/^ +/, "")
			.replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
	});

	playerId = "player_" + Math.floor(Math.random() * 1000000);
	logger.info("Logged out and generated temporary player ID", { playerId });
}

function updatePlayerId(id: string) {
	playerId = id;
	localStorage.setItem("mana_player_id", id);
	logger.info("Updated player ID", { playerId });
}
