import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as GameLogic from "./_shared.js";

import { corsHeaders } from "../_shared/cors.ts";

// ---------------------------------------------------------------------------
// JWT helpers (shared pattern from action/index.ts)
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
// Supabase service-role client (module-level, one per warm isolate)
// ---------------------------------------------------------------------------

const supabaseAdmin = createClient(
	Deno.env.get("SUPABASE_URL") ?? "",
	Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const deletePlayerSession = async (playerId: string): Promise<void> => {
	const { error } = await supabaseAdmin.from("player_sessions").delete().eq("player_id", playerId);
	if (error) {
		console.error("[replay-commit] player session delete failed:", error.message);
	}
};

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	try {
		const authorizationHeader = req.headers.get("Authorization");

		// JWT verification and body parsing are independent — run in parallel.
		const [playerId, manifest] = await Promise.all([
			extractPlayerIdFromAuthorization(authorizationHeader),
			req.json(),
		]);

		// ---------------------------------------------------------------------------
		// Input validation
		// ---------------------------------------------------------------------------
		const { runId, selectedCrystalId, initialSeed, clientVersion, actions } = manifest ?? {};

		if (
			typeof runId !== "string" ||
			typeof selectedCrystalId !== "string" ||
			typeof initialSeed !== "string" ||
			typeof clientVersion !== "string" ||
			!Array.isArray(actions)
		) {
			return new Response(JSON.stringify({ error: "Invalid manifest: missing required fields." }), {
				status: 400,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
		}

		// Prevent cross-player submission: the manifest's playerId must match the JWT.
		if (manifest.playerId !== playerId) {
			return new Response(
				JSON.stringify({ error: "Unauthorized: manifest playerId does not match token." }),
				{ status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
			);
		}

		// Max action-list size guard (prevent DoS via huge manifests)
		const MAX_ACTIONS = 2000;
		if (actions.length > MAX_ACTIONS) {
			return new Response(
				JSON.stringify({ error: `Manifest exceeds maximum action count (${MAX_ACTIONS}).` }),
				{ status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
			);
		}

		// ---------------------------------------------------------------------------
		// Idempotency check: if this runId was already committed, return stored result
		// ---------------------------------------------------------------------------
		const { data: existingCommit, error: commitLookupError } = await supabaseAdmin
			.from("completed_run_manifests")
			.select("run_id, snapshot, accepted")
			.eq("run_id", runId)
			.eq("player_id", playerId)
			.maybeSingle();

		if (commitLookupError) {
			console.error("[replay-commit] idempotency lookup error:", commitLookupError.message);
		}

		if (existingCommit) {
			if (existingCommit.accepted) {
				await deletePlayerSession(playerId);
			}

			// Already processed — return the stored result without re-running replay.
			return new Response(
				JSON.stringify({
					success: true,
					idempotent: true,
					accepted: existingCommit.accepted,
					snapshot: existingCommit.snapshot,
				}),
				{ headers: { ...corsHeaders, "Content-Type": "application/json" } }
			);
		}

		// ---------------------------------------------------------------------------
		// Server-side replay
		// ---------------------------------------------------------------------------
		const { session: replayedSession, rejectReason } = GameLogic.replayManifest(manifest);

		if (rejectReason) {
			return new Response(JSON.stringify({ success: false, rejectReason }), {
				status: 422,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
		}

		const snapshot = GameLogic.buildReplaySnapshot(replayedSession);
		const sessionCompleted =
			replayedSession.phase === "victory" || replayedSession.phase === "game_over";

		// ---------------------------------------------------------------------------
		// Persist the commit record (idempotency + audit trail)
		// ---------------------------------------------------------------------------
		const { error: insertError } = await supabaseAdmin.from("completed_run_manifests").insert({
			run_id: runId,
			player_id: playerId,
			selected_crystal_id: selectedCrystalId,
			initial_seed: initialSeed,
			client_version: clientVersion,
			action_count: actions.length,
			snapshot,
			accepted: sessionCompleted,
			created_at: new Date().toISOString(),
		});

		if (insertError) {
			// A unique constraint violation on (run_id, player_id) means a concurrent
			// request already inserted this run — treat as idempotent success.
			if (insertError.code === "23505") {
				return new Response(
					JSON.stringify({ success: true, idempotent: true, accepted: sessionCompleted, snapshot }),
					{ headers: { ...corsHeaders, "Content-Type": "application/json" } }
				);
			}
			throw insertError;
		}

		// ---------------------------------------------------------------------------
		// Side effects: rating update (only for completed PVE runs)
		// ---------------------------------------------------------------------------
		if (sessionCompleted) {
			await deletePlayerSession(playerId);

			const ratingAmount = replayedSession.phase === "victory" ? 25 : -25;
			supabaseAdmin
				.rpc("increment_rating", { player_id: playerId, amount: ratingAmount })
				.then(({ error }) => {
					if (error) console.error("[replay-commit] rating update failed:", error.message);
				});
		}

		return new Response(JSON.stringify({ success: true, accepted: sessionCompleted, snapshot }), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});
	} catch (error: any) {
		return new Response(JSON.stringify({ error: error.message }), {
			status: 400,
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});
	}
});
