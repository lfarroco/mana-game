import { PhaseOptions } from "@Multiplayer/MultiplayerTypes";
import { PhaseType, PlayerProfile } from "@Multiplayer/MultiplayerTypes";
import { Unit } from "@Models/Entities/Unit";
import { State } from "@Models/State";
import { supabase } from "@lib/supabase";
import * as GameLogic from "@Core/GameLogic";
import type { SessionData, ActionPayload } from "@Core/Types";
import { RunActionQueue } from "@Core/RunActionQueue";
import { submitRunManifest } from "@Core/DeferredSubmission";
import { FORCE_ID_CPU } from "@Scenes/Battleground/ServerConstants";
import { createLogger } from "@Utils/Logger";

// Internal state
let isMultiplayer: boolean = false;
let playerId: string;
let initPromise: Promise<void> = Promise.resolve();
let authInitialized = false;
let deferredModeActive = false;
let deferredSession: SessionData | null = null;
let runQueue: RunActionQueue | null = null;
let runSubmitted = false;
let deferredSelectedCrystalId: string | null = null;
const logger = createLogger("MultiplayerManager");
const DEFERRED_SESSION_STORAGE_KEY_PREFIX = "mana_deferred_session_";

const getDeferredSessionStorageKey = (id: string): string =>
	`${DEFERRED_SESSION_STORAGE_KEY_PREFIX}${id}`;

const persistDeferredSession = (session: SessionData): void => {
	localStorage.setItem(
		getDeferredSessionStorageKey(playerId),
		JSON.stringify({ ...session, player_id: playerId })
	);
};

const clearPersistedDeferredSession = (): void => {
	localStorage.removeItem(getDeferredSessionStorageKey(playerId));
};

const hasTerminalPhase = (session: SessionData | null): boolean =>
	Boolean(session && (session.phase === "victory" || session.phase === "game_over"));

const clearDeferredRunState = ({ clearPersisted = false }: { clearPersisted?: boolean } = {}): void => {
	if (clearPersisted) {
		clearPersistedDeferredSession();
	}

	deferredSession = null;
	runQueue = null;
	runSubmitted = false;
	deferredSelectedCrystalId = null;
};

const restorePersistedDeferredSession = (): SessionData | null => {
	const raw = localStorage.getItem(getDeferredSessionStorageKey(playerId));
	if (!raw) {
		return null;
	}

	try {
		const parsed = JSON.parse(raw) as Partial<SessionData>;
		if (!parsed || typeof parsed !== "object") {
			return null;
		}

		if (parsed.player_id && parsed.player_id !== playerId) {
			return null;
		}

		if (!parsed.phase || !parsed.round || !parsed.seed || !parsed.initial_seed || !parsed.team) {
			return null;
		}

		return parsed as SessionData;
	} catch {
		return null;
	}
};

const getClientVersion = (): string => {
	try {
		return typeof process !== "undefined" && typeof process.env.APP_VERSION === "string"
			? process.env.APP_VERSION
			: "dev";
	} catch {
		return "dev";
	}
};

const cloneSession = (session: SessionData): SessionData =>
	JSON.parse(JSON.stringify(session)) as SessionData;

const getOptionsList = (session: SessionData): unknown[] => {
	const rawOptions = session.current_options;
	if (!rawOptions) {
		return [];
	}

	if (Array.isArray(rawOptions)) {
		return rawOptions;
	}

	return rawOptions.options || [];
};

const getCombatState = (session: SessionData): PhaseOptions["combatState"] => {
	const rawOptions = session.current_options;
	if (rawOptions && !Array.isArray(rawOptions) && rawOptions.combatState) {
		return rawOptions.combatState;
	}
	return undefined;
};

const getSelectedCrystalIdFromSession = (session: SessionData): string => {
	const core = session.team?.units?.find((u) => u.isCore);
	if (core?.cardId) {
		return core.cardId;
	}

	return deferredSelectedCrystalId || "crystal_core";
};

const ensureRunQueue = (session: SessionData): void => {
	if (!deferredModeActive || runQueue) {
		return;
	}

	const runId = session.id || `run-${Date.now()}`;
	const resumed = RunActionQueue.resume(runId);
	if (resumed) {
		runQueue = resumed;
		logger.info("Resumed deferred run queue", { runId, actionCount: resumed.length });
		return;
	}

	runQueue = RunActionQueue.start(
		playerId,
		getSelectedCrystalIdFromSession(session),
		session.initial_seed,
		getClientVersion(),
		runId
	);
	logger.info("Started deferred run queue", { runId });
};

const syncDeferredSession = (session: SessionData): void => {
	deferredSession = cloneSession(session);
	ensureRunQueue(deferredSession);
	persistDeferredSession(deferredSession);
};

const submitDeferredManifestIfNeeded = async (): Promise<void> => {
	if (!deferredModeActive || runSubmitted || !runQueue || !deferredSession) {
		return;
	}

	if (deferredSession.phase !== "victory" && deferredSession.phase !== "game_over") {
		return;
	}

	const { data } = await supabase.auth.getSession();
	const token = data.session?.access_token;
	if (!token) {
		logger.warn("Skipping deferred manifest submission: missing auth token");
		return;
	}

	const result = await submitRunManifest(runQueue.build(), token);
	if (!result.submitted) {
		logger.warn("Deferred run submission failed", { reason: result.reason });
		return;
	}

	runSubmitted = true;
	logger.info("Deferred run submitted", {
		accepted: result.accepted,
		idempotent: result.idempotent,
	});

	if (result.accepted || result.idempotent) {
		runQueue.clear();
		clearDeferredRunState({ clearPersisted: true });
	}
};

export async function finalizeCompletedRun(): Promise<boolean> {
	if (!deferredModeActive) {
		return true;
	}

	if (!deferredSession) {
		const restored = restorePersistedDeferredSession();
		if (restored) {
			syncDeferredSession(restored);
		}
	}

	if (!hasTerminalPhase(deferredSession)) {
		return true;
	}

	await submitDeferredManifestIfNeeded();

	return !hasTerminalPhase(deferredSession);
}

const buildPhaseOptionsFromSession = (session: SessionData): PhaseOptions => ({
	phase: session.phase as PhaseType,
	round: session.round,
	options: getOptionsList(session) as PhaseOptions["options"],
	team: session.team,
	wins: session.wins,
	losses: session.losses,
	combatState: getCombatState(session),
});

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

const safeClonePayload = (payload: unknown): unknown => {
	if (payload === undefined) {
		return undefined;
	}

	try {
		return JSON.parse(JSON.stringify(payload));
	} catch {
		return undefined;
	}
};

const isFunctionsFetchError = (error: unknown): boolean => {
	if (!error || typeof error !== "object") {
		return false;
	}

	const maybeError = error as { name?: string };
	return maybeError.name === "FunctionsFetchError";
};

export function disableMultiplayer() {
	isMultiplayer = false;
	deferredModeActive = false;
	clearDeferredRunState();
	logger.info("Multiplayer mode disabled");
}

export async function enableMultiplayer(selectedCrystalId?: string) {
	isMultiplayer = true;
	deferredModeActive = true;
	deferredSelectedCrystalId = selectedCrystalId || null;
	await initializeAuthSession();
	logger.info("Multiplayer mode enabled with deterministic deferred processing", {
		hasSelectedCrystal: Boolean(selectedCrystalId),
	});
	if (!selectedCrystalId) {
		logger.info("Resuming existing session without crystal selection");
	}
	logger.info("Connected to multiplayer session");
}
export async function sendOptionSelection(optionId: string, payload?: unknown): Promise<boolean> {
	const sanitizedPayload = safeClonePayload(payload);

	if (deferredModeActive) {
		if (!deferredSession) {
			logger.error("Deferred mode action received without initialized session", { optionId });
			return false;
		}

		const teamSnapshot = cloneSession(deferredSession).team;
		if (optionId !== "update_team" && runQueue) {
			runQueue.append(optionId, sanitizedPayload as ActionPayload | undefined, teamSnapshot);
		}

		const result = GameLogic.transitionToNextState(
			deferredSession,
			optionId,
			sanitizedPayload as ActionPayload | undefined
		);
		syncDeferredSession(result.session);
		await submitDeferredManifestIfNeeded();
		return true;
	}

	const body =
		sanitizedPayload === undefined
			? { actionId: optionId }
			: { actionId: optionId, payload: sanitizedPayload };

	logger.debug("Sending option selection", {
		optionId,
		hasPayload: sanitizedPayload !== undefined,
	});

	for (let attempt = 1; attempt <= 2; attempt += 1) {
		const { error } = await supabase.functions.invoke("action", { body });

		if (!error) {
			return true;
		}

		const shouldRetry = attempt === 1 && isFunctionsFetchError(error);
		if (!shouldRetry) {
			logger.error("Edge function action invoke failed", { optionId, attempt, error });
			return false;
		}

		logger.warn("Transient edge function fetch failure, retrying", { optionId, attempt, error });
		await new Promise((resolve) => setTimeout(resolve, 150));
	}

	return false;
}

export async function sendTeamUpdate(team: { units: Unit[] }): Promise<boolean> {
	if (deferredModeActive) {
		return await sendOptionSelection("update_team", { team });
	}

	logger.debug("Sending team update", { unitCount: team.units.length });

	const { error } = await supabase.functions.invoke("action", {
		body: { actionId: "update_team", payload: { team } },
	});
	return !error;
}

// TODO: if arena, fetch from supabase, else, localhost
export async function checkActiveSession(): Promise<boolean> {
	await initializeAuthSession();
	const localSession = restorePersistedDeferredSession();
	if (localSession) {
		return !hasTerminalPhase(localSession);
	}

	return false;
}

// Requests the current phase options from the server
export async function getPhaseOptions(_state: State): Promise<PhaseOptions> {
	if (deferredModeActive) {
		if (deferredSession) {
			return buildPhaseOptionsFromSession(deferredSession);
		}

		const restored = restorePersistedDeferredSession();
		if (restored) {
			logger.info("Restored deferred session from local storage", {
				runId: restored.id,
				phase: restored.phase,
				round: restored.round,
			});
			syncDeferredSession(restored);
			if (deferredSession) {
				return buildPhaseOptionsFromSession(deferredSession);
			}
		}

		logger.info("Bootstrapping deferred session from server");
		const { data: session, error } = await supabase
			.from("player_sessions")
			.select("*")
			.eq("player_id", playerId)
			.single();

		if (error || !session) {
			throw new Error("Failed to bootstrap deferred state from DB");
		}

		syncDeferredSession(session as SessionData);
		if (!deferredSession) {
			throw new Error("Deferred session bootstrap failed");
		}

		return buildPhaseOptionsFromSession(deferredSession);
	}

	logger.debug("Fetching phase options from server", { playerId });

	const { data: session, error } = await supabase
		.from("player_sessions")
		.select("*")
		.eq("player_id", playerId)
		.single();

	if (error || !session) {
		throw new Error("Failed to fetch state from DB");
	}

	let combatState: PhaseOptions["combatState"] = undefined;
	if (session.phase === "combat") {
		const optionsCombatState = (session.current_options as Record<string, unknown>)?.combatState as
			| Record<string, unknown>
			| undefined;
		if (optionsCombatState && Array.isArray(optionsCombatState.logs)) {
			logger.debug("Using server-provided combat logs");
			combatState = {
				units: Array.isArray(optionsCombatState.initialUnits)
					? (optionsCombatState.initialUnits as Unit[])
					: [],
				enemyTeam: Array.isArray(optionsCombatState.enemyTeam)
					? (optionsCombatState.enemyTeam as Unit[])
					: [],
				logs: optionsCombatState.logs as import("@Scenes/Battleground/ServerCombatEffects").CombatLogEntry[],
				seed: session.seed,
			};
		} else {
			logger.warn("Combat logs missing from server response; simulating locally");
			const simResult = GameLogic.simulateCombat(session as unknown as SessionData);
			combatState = {
				units: simResult.initialUnits,
				enemyTeam: simResult.initialUnits.filter((u: Unit) => u.force === FORCE_ID_CPU),
				logs: simResult.logs,
				seed: session.seed,
			};
		}
	}

	// Map DB session to PhaseOptions
	// Handle both Array and Object format for options
	const rawOptions = session.current_options;
	const rawOptionsRecord =
		rawOptions && typeof rawOptions === "object" ? (rawOptions as Record<string, unknown>) : null;
	const optionsList = Array.isArray(rawOptions)
		? rawOptions
		: (rawOptionsRecord?.options as unknown[] | undefined) || [];

	return {
		phase: session.phase as PhaseType,
		round: session.round,
		options: optionsList,
		team: session.team,
		wins: session.wins,
		losses: session.losses,
		combatState: combatState,
	};
}

export function primeDeferredSession(session: SessionData, selectedCrystalId?: string) {
	deferredModeActive = true;
	deferredSelectedCrystalId = selectedCrystalId || deferredSelectedCrystalId;
	runSubmitted = false;
	syncDeferredSession(session);
}

type SteamworksAPI = {
	auth: { getSessionTicket(): Promise<{ ticket: { toString(encoding: string): string } }> };
};

export async function handleSteamAuth(): Promise<PlayerProfile | null> {
	const steamworks = (window as Window & { steamworks?: SteamworksAPI }).steamworks;
	if (!steamworks) {
		logger.warn("Steamworks not available");
		return null;
	}

	// Get Ticket using steamworks.js
	logger.info("Requesting Steam auth ticket");
	const ticket = await steamworks.auth.getSessionTicket();
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

export async function handleAuthGuest(): Promise<PlayerProfile | undefined> {
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

export async function handleAuthLogin(
	username: string,
	password: string
): Promise<PlayerProfile | undefined> {
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

export async function getPlayerProfile(profilePlayerId: string): Promise<PlayerProfile> {
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
		if (
			key.startsWith(DEFERRED_SESSION_STORAGE_KEY_PREFIX) ||
			key.startsWith("mana_run_manifest_")
		) {
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
