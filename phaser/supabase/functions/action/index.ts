import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MultiplayerLogic } from "./_shared.js";

import { corsHeaders } from "../_shared/cors.ts";

// TODO: each action should have an isolated handler
// should create new endpoints, one for each goal, instead of checking payload

const MIN_SESSION_CACHE_TTL_MS = 30_000;
const MAX_SESSION_CACHE_TTL_MS = 120_000;
const DEFAULT_SESSION_CACHE_TTL_MS = 60_000;

const clamp = (value: number, min: number, max: number): number => {
	if (Number.isNaN(value)) return min;
	if (value < min) return min;
	if (value > max) return max;
	return value;
};

const sessionCacheTtlMs = clamp(
	Number(Deno.env.get("SESSION_CACHE_TTL_MS") ?? DEFAULT_SESSION_CACHE_TTL_MS),
	MIN_SESSION_CACHE_TTL_MS,
	MAX_SESSION_CACHE_TTL_MS
);

type SessionCacheEntry = {
	expiresAt: number;
	session: any;
};

const sessionCache = new Map<string, SessionCacheEntry>();

const getCachedSession = (playerId: string): any | null => {
	const cached = sessionCache.get(playerId);
	if (!cached) return null;

	if (cached.expiresAt <= Date.now()) {
		sessionCache.delete(playerId);
		return null;
	}

	return cached.session;
};

const setCachedSession = (playerId: string, session: any): void => {
	sessionCache.set(playerId, {
		expiresAt: Date.now() + sessionCacheTtlMs,
		session,
	});
};

const decodeBase64Url = (input: string): Uint8Array => {
	const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
	const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
	const raw = atob(padded);
	const bytes = new Uint8Array(raw.length);
	for (let i = 0; i < raw.length; i += 1) {
		bytes[i] = raw.charCodeAt(i);
	}
	return bytes;
};

const decodeJwtPayload = (token: string): Record<string, unknown> => {
	const parts = token.split(".");
	if (parts.length !== 3) {
		throw new Error("Unauthorized");
	}

	const payloadBytes = decodeBase64Url(parts[1]);
	const payloadJson = new TextDecoder().decode(payloadBytes);
	const parsed = JSON.parse(payloadJson);

	if (!parsed || typeof parsed !== "object") {
		throw new Error("Unauthorized");
	}

	return parsed as Record<string, unknown>;
};

const verifyJwtHs256 = async (token: string, secret: string): Promise<void> => {
	const parts = token.split(".");
	if (parts.length !== 3) {
		throw new Error("Unauthorized");
	}

	const [headerB64, payloadB64, signatureB64] = parts;
	const signingInput = `${headerB64}.${payloadB64}`;

	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["verify"]
	);

	const signature = decodeBase64Url(signatureB64);
	const valid = await crypto.subtle.verify(
		"HMAC",
		key,
		signature,
		new TextEncoder().encode(signingInput)
	);

	if (!valid) {
		throw new Error("Unauthorized");
	}
};

const extractPlayerIdFromAuthorization = async (
	authorizationHeader: string | null
): Promise<string> => {
	if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
		throw new Error("Unauthorized");
	}

	const token = authorizationHeader.slice("Bearer ".length).trim();
	if (!token) {
		throw new Error("Unauthorized");
	}

	const jwtSecret = Deno.env.get("SUPABASE_JWT_SECRET");
	if (!jwtSecret) {
		throw new Error("Missing Server Configuration (SUPABASE_JWT_SECRET)");
	}

	await verifyJwtHs256(token, jwtSecret);
	const payload = decodeJwtPayload(token);

	const now = Math.floor(Date.now() / 1000);
	const exp = typeof payload.exp === "number" ? payload.exp : undefined;
	const nbf = typeof payload.nbf === "number" ? payload.nbf : undefined;

	if (typeof exp === "number" && now >= exp) {
		throw new Error("Unauthorized");
	}

	if (typeof nbf === "number" && now < nbf) {
		throw new Error("Unauthorized");
	}

	const playerId = typeof payload.sub === "string" ? payload.sub : null;
	if (!playerId) {
		throw new Error("Unauthorized");
	}

	return playerId;
};

Deno.serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	try {
		const authorizationHeader = req.headers.get("Authorization");
		const playerId = await extractPlayerIdFromAuthorization(authorizationHeader);

		const supabaseClient = createClient(
			Deno.env.get("SUPABASE_URL") ?? "",
			Deno.env.get("SUPABASE_ANON_KEY") ?? "",
			{ global: { headers: { Authorization: authorizationHeader! } } }
		);

		const { actionId, payload } = await req.json();

		// Handle Start Session
		if (actionId === "start_session") {
			const selectedCrystalId = payload?.selectedCrystalId;
			const newSession = MultiplayerLogic.createInitialSession(playerId, selectedCrystalId);

			// Upsert Session
			const { data, error } = await supabaseClient
				.from("player_sessions")
				.upsert(
					{
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
						updated_at: new Date(),
					},
					{ onConflict: "player_id" }
				)
				.select()
				.single();

			if (error) throw error;
			setCachedSession(playerId, data);
			return new Response(JSON.stringify(data), {
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
		}

		// Fetch Session (prefer L1 cache for bursty action traffic)
		let session = getCachedSession(playerId);
		if (!session) {
			const { data: dbSession, error: sessError } = await supabaseClient
				.from("player_sessions")
				.select("*")
				.eq("player_id", playerId)
				.single();

			if (sessError || !dbSession) throw new Error("Session not found");
			session = dbSession;
			setCachedSession(playerId, session);
		}

		console.log(`Player ${playerId} requesting ${actionId}`);

		// Handle Team Update (Non-progression)
		if (actionId === "update_team" && payload && payload.team) {
			// Validate and Apply Team Update (Security Check)
			const { team, valid } = MultiplayerLogic.validateAndApplyTeamUpdate(session, payload.team);

			if (!valid) {
				return new Response(JSON.stringify({ success: false, error: "Invalid Team Update" }), {
					status: 400,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				});
			}

			const { error: teamUpdateError } = await supabaseClient
				.from("player_sessions")
				.update({ team, updated_at: new Date() })
				.eq("id", session.id);

			if (teamUpdateError) throw teamUpdateError;
			setCachedSession(playerId, {
				...session,
				team,
				updated_at: new Date().toISOString(),
			});

			return new Response(JSON.stringify({ success: true }), {
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
		}

		// Logic: Transition State
		// transitionToNextState already resolves the action and applies team updates,
		// so calling resolveAction separately here would apply the same action twice.
		const transitionResult = MultiplayerLogic.transitionToNextState(session, actionId, payload);
		const nextSession = transitionResult.session;
		const combatResult = transitionResult.combatResult;

		// Persist New State
		const { error: saveError } = await supabaseClient
			.from("player_sessions")
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
				updated_at: new Date(),
			})
			.eq("id", session.id);

		if (saveError) throw saveError;
		setCachedSession(playerId, {
			...session,
			...nextSession,
			id: session.id,
			player_id: playerId,
			updated_at: new Date().toISOString(),
		});

		// Side Effects (Rating)
		if (combatResult) {
			const wonCombat = combatResult.won;
			const ratingAmount = wonCombat ? 25 : -25;
			await supabaseClient.rpc("increment_rating", { player_id: playerId, amount: ratingAmount });
		}

		// Determine response formatting
		// If we just finished combat (won/lost), the client might expect specific fields
		if (combatResult) {
			// This is the response for entering combat
			return new Response(
				JSON.stringify({
					success: true,
					nextPhase: "combat",
					wonCombat: combatResult.won,
				}),
				{ headers: { ...corsHeaders, "Content-Type": "application/json" } }
			);
		}

		return new Response(
			JSON.stringify({
				success: true,
				nextPhase: nextSession.phase,
			}),
			{ headers: { ...corsHeaders, "Content-Type": "application/json" } }
		);
	} catch (error: any) {
		return new Response(JSON.stringify({ error: error.message }), {
			status: 400,
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});
	}
});
