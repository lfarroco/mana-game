import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as GameLogic from "./_shared.js";
import {
	normalizeSessionType,
	persistRoundGhost,
	selectRoundGhostOpponent,
} from "../action/matchmaking.ts";

import { corsHeaders } from "../_shared/cors.ts";

// ---------------------------------------------------------------------------
// JWT helpers (same pattern as replay-commit/index.ts)
// ---------------------------------------------------------------------------

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
	if (parts.length !== 3) throw new Error("Unauthorized");
	const payloadBytes = decodeBase64Url(parts[1]);
	const payloadJson = new TextDecoder().decode(payloadBytes);
	const parsed = JSON.parse(payloadJson);
	if (!parsed || typeof parsed !== "object") throw new Error("Unauthorized");
	return parsed as Record<string, unknown>;
};

let _cachedJwtKey: CryptoKey | null = null;
const getJwtSigningKey = async (): Promise<CryptoKey> => {
	if (_cachedJwtKey) return _cachedJwtKey;
	const jwtSecret = Deno.env.get("JWT_SECRET");
	if (!jwtSecret) throw new Error("Missing Server Configuration (JWT_SECRET)");
	_cachedJwtKey = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(jwtSecret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["verify"]
	);
	return _cachedJwtKey;
};

const verifyJwtHs256 = async (token: string, key: CryptoKey): Promise<void> => {
	const parts = token.split(".");
	if (parts.length !== 3) throw new Error("Unauthorized");
	const [headerB64, payloadB64, signatureB64] = parts;
	const signature = decodeBase64Url(signatureB64);
	const valid = await crypto.subtle.verify(
		"HMAC",
		key,
		signature,
		new TextEncoder().encode(`${headerB64}.${payloadB64}`)
	);
	if (!valid) throw new Error("Unauthorized");
};

const extractPlayerIdFromAuthorization = async (
	authorizationHeader: string | null
): Promise<string> => {
	if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
		throw new Error("Unauthorized");
	}
	const token = authorizationHeader.slice("Bearer ".length).trim();
	if (!token) throw new Error("Unauthorized");

	const key = await getJwtSigningKey();
	await verifyJwtHs256(token, key);
	const payload = decodeJwtPayload(token);

	const now = Math.floor(Date.now() / 1000);
	const exp = typeof payload.exp === "number" ? payload.exp : undefined;
	const nbf = typeof payload.nbf === "number" ? payload.nbf : undefined;
	if (typeof exp === "number" && now >= exp) throw new Error("Unauthorized");
	if (typeof nbf === "number" && now < nbf) throw new Error("Unauthorized");

	const playerId = typeof payload.sub === "string" ? payload.sub : null;
	if (!playerId) throw new Error("Unauthorized");
	return playerId;
};

// ---------------------------------------------------------------------------
// Supabase service-role client
// ---------------------------------------------------------------------------

const supabaseAdmin = createClient(
	Deno.env.get("SUPABASE_URL") ?? "",
	Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	try {
		const authorizationHeader = req.headers.get("Authorization");

		const [playerId, body] = await Promise.all([
			extractPlayerIdFromAuthorization(authorizationHeader),
			req.json(),
		]);

		const {
			runId,
			combatIndex,
			round,
			wins,
			sessionType: rawSessionType,
			currentTeam,
		} = body ?? {};
		const sessionType = normalizeSessionType(rawSessionType);

		if (
			typeof runId !== "string" ||
			typeof combatIndex !== "number" ||
			typeof round !== "number" ||
			typeof wins !== "number"
		) {
			return new Response(
				JSON.stringify({ error: "Invalid request: missing or invalid fields." }),
				{ status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
			);
		}

		if (combatIndex < 0 || combatIndex > 500 || round < 1 || wins < 0) {
			return new Response(
				JSON.stringify({ error: "Invalid request: out-of-range values." }),
				{ status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
			);
		}

		// ---------------------------------------------------------------------------
		// Idempotency: return the stored enemy team if already generated for this combat
		// ---------------------------------------------------------------------------
		const { data: existing, error: lookupError } = await supabaseAdmin
			.from("combat_encounters")
			.select("enemy_team, enemy_player_name")
			.eq("run_id", runId)
			.eq("player_id", playerId)
			.eq("combat_index", combatIndex)
			.maybeSingle();

		if (lookupError) {
			console.error("[get-enemy-team] lookup error:", lookupError.message);
		}

		if (existing) {
			return new Response(
				JSON.stringify({
					enemyTeam: existing.enemy_team,
					enemyPlayerName:
						typeof existing.enemy_player_name === "string"
							? existing.enemy_player_name
							: undefined,
				}),
				{
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				}
			);
		}

		// ---------------------------------------------------------------------------
		// Prefer a stored ghost from the same round and queue.
		// Fall back to the single-player PvE generator only when no valid ghost exists.
		// ---------------------------------------------------------------------------
		await persistRoundGhost(
			supabaseAdmin,
			playerId,
			round,
			sessionType,
			currentTeam,
			"get-enemy-team"
		);
		const matchedEnemy = await selectRoundGhostOpponent(
			supabaseAdmin,
			playerId,
			round,
			sessionType,
			"get-enemy-team"
		);
		const enemyTeam = matchedEnemy?.enemyTeam ?? GameLogic.generateEnemyTeamForRound(round, wins);
		const enemyPlayerName = matchedEnemy?.enemyPlayerName;

		// ---------------------------------------------------------------------------
		// Persist it so replay-commit can retrieve it later
		// ---------------------------------------------------------------------------
		const { error: insertError } = await supabaseAdmin.from("combat_encounters").insert({
			run_id: runId,
			player_id: playerId,
			combat_index: combatIndex,
			round,
			wins,
			enemy_team: enemyTeam,
			enemy_player_name: enemyPlayerName,
			created_at: new Date().toISOString(),
		});

		if (insertError) {
			// Concurrent insert race: another request already stored this encounter. Return theirs.
			if (insertError.code === "23505") {
				const { data: concurrent } = await supabaseAdmin
					.from("combat_encounters")
					.select("enemy_team, enemy_player_name")
					.eq("run_id", runId)
					.eq("player_id", playerId)
					.eq("combat_index", combatIndex)
					.single();
				return new Response(
					JSON.stringify({
						enemyTeam: concurrent?.enemy_team ?? enemyTeam,
						enemyPlayerName:
							typeof concurrent?.enemy_player_name === "string"
								? concurrent.enemy_player_name
								: enemyPlayerName,
					}),
					{ headers: { ...corsHeaders, "Content-Type": "application/json" } }
				);
			}
			throw insertError;
		}

		return new Response(JSON.stringify({ enemyTeam, enemyPlayerName }), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});
	} catch (error: any) {
		return new Response(JSON.stringify({ error: error.message }), {
			status: 400,
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});
	}
});
