const DEFAULT_PLAYER_RATING = 1000;
const CLOSEST_MATCHMAKING_POOL_SIZE = 5;

export type MultiplayerSessionType = "multiplayer_ranked" | "multiplayer_casual";

export const normalizeSessionType = (rawValue: unknown): MultiplayerSessionType =>
	rawValue === "multiplayer_ranked" ? "multiplayer_ranked" : "multiplayer_casual";

export const normalizePlayerRating = (
	rawValue: unknown,
	fallback: number = DEFAULT_PLAYER_RATING
): number => {
	const raw = Number(rawValue ?? fallback);
	if (Number.isNaN(raw) || raw < 0) {
		return fallback;
	}
	return Math.floor(raw);
};

export const hasValidCombatTeam = (team: unknown): team is { units: any[] } => {
	if (!team || typeof team !== "object") return false;
	const units = (team as { units?: unknown }).units;
	if (!Array.isArray(units) || units.length === 0) return false;
	return units.some((unit) => unit && typeof unit === "object" && Boolean((unit as any).isCore));
};

export const sanitizeEnemyTeam = (team: { units: any[] }): any[] => {
	return team.units.slice(0, 9).map((unit, index) => {
		const source = unit && typeof unit === "object" ? unit : {};
		const x = Math.max(0, Math.min(2, Number((source as any).position?.x ?? index % 3)));
		const y = Math.max(
			0,
			Math.min(2, Number((source as any).position?.y ?? Math.floor(index / 3)))
		);
		const maxLife = Number((source as any).maxLife ?? (source as any).life ?? 1);
		return {
			...source,
			id: `match-${(source as any).cardId ?? (source as any).id ?? "unit"}-${index}`,
			force: "CPU",
			position: { x, y },
			maxLife,
			life: maxLife,
		};
	});
};

export const pickRandom = <T>(items: T[], randomFn: () => number = Math.random): T => {
	return items[Math.floor(randomFn() * items.length)];
};

export type MatchCandidateSession = {
	player_id?: string;
	player_name?: string;
	rating?: unknown;
	team?: unknown;
};

type GhostCandidate = MatchCandidateSession;

type SupabaseClientLike = {
	from: (table: string) => {
		select: (columns: string) => any;
		delete: () => any;
		insert: (values: Record<string, unknown>) => Promise<{ error: { message?: string } | null }>;
	};
};

export const pickMatchedEnemySession = (
	candidateSessions: MatchCandidateSession[],
	randomFn: () => number = Math.random
): MatchCandidateSession | null => {
	const validSessions = (Array.isArray(candidateSessions) ? candidateSessions : []).filter(
		(row): row is MatchCandidateSession & { team: { units: any[] } } =>
			hasValidCombatTeam(row?.team)
	);

	if (validSessions.length === 0) {
		return null;
	}

	return pickRandom(validSessions, randomFn);
};

export const pickClosestRatedEnemySession = (
	candidateSessions: MatchCandidateSession[],
	targetRating: number,
	randomFn: () => number = Math.random
): MatchCandidateSession | null => {
	const validSessions = (Array.isArray(candidateSessions) ? candidateSessions : []).filter(
		(row): row is MatchCandidateSession & { team: { units: any[] } } =>
			hasValidCombatTeam(row?.team)
	);

	if (validSessions.length === 0) {
		return null;
	}

	const closestSessions = validSessions
		.map((session) => {
			const rating = normalizePlayerRating(session.rating);
			return {
				session,
				rating,
				distance: Math.abs(rating - targetRating),
			};
		})
		.sort(
			(left, right) =>
				left.distance - right.distance ||
				left.rating - right.rating ||
				String(left.session.player_id ?? "").localeCompare(String(right.session.player_id ?? ""))
		)
		.slice(0, CLOSEST_MATCHMAKING_POOL_SIZE)
		.map(({ session }) => session);

	return pickRandom(closestSessions, randomFn);
};

export const pickMatchedEnemyTeam = (
	candidateSessions: MatchCandidateSession[],
	randomFn: () => number = Math.random
): any[] | null => {
	const matchedSession = pickMatchedEnemySession(candidateSessions, randomFn);
	if (!matchedSession || !hasValidCombatTeam(matchedSession.team)) {
		return null;
	}

	return sanitizeEnemyTeam(matchedSession.team);
};

export const persistRoundGhost = async (
	supabaseAdmin: SupabaseClientLike,
	playerId: string,
	round: number,
	sessionType: MultiplayerSessionType,
	team: unknown,
	logPrefix: string
): Promise<void> => {
	if (round < 1 || !hasValidCombatTeam(team)) {
		return;
	}

	let playerName = "Guest";
	const { data: playerRow, error: playerError } = await supabaseAdmin
		.from("players")
		.select("username")
		.eq("id", playerId)
		.maybeSingle();

	if (playerError) {
		console.error(`[${logPrefix}] failed to read player username for ghost:`, playerError.message);
	} else if (typeof playerRow?.username === "string" && playerRow.username.trim().length > 0) {
		playerName = playerRow.username.trim();
	}

	const timestamp = new Date().toISOString();
	const { error: deleteError } = await supabaseAdmin
		.from("ghosts")
		.delete()
		.eq("player_id", playerId)
		.eq("round", round)
		.eq("session_type", sessionType);

	if (deleteError) {
		console.error(`[${logPrefix}] failed to delete previous ghost:`, deleteError.message);
		return;
	}

	const { error: insertError } = await supabaseAdmin.from("ghosts").insert({
		player_id: playerId,
		player_name: playerName,
		round,
		session_type: sessionType,
		team,
		created_at: timestamp,
		updated_at: timestamp,
	});

	if (insertError) {
		console.error(`[${logPrefix}] failed to save ghost:`, insertError.message);
	}
};

const readPlayerRating = async (
	supabaseAdmin: SupabaseClientLike,
	playerId: string,
	logPrefix: string,
	context: string
): Promise<number> => {
	const { data: playerRow, error: playerError } = await supabaseAdmin
		.from("players")
		.select("rating")
		.eq("id", playerId)
		.maybeSingle();

	if (playerError) {
		console.error(`[${logPrefix}] failed to read ${context} rating:`, playerError.message);
		return DEFAULT_PLAYER_RATING;
	}

	return normalizePlayerRating(playerRow?.rating);
};

const buildPlayerRatingMap = async (
	supabaseAdmin: SupabaseClientLike,
	playerIds: string[],
	logPrefix: string
): Promise<Map<string, number>> => {
	if (playerIds.length === 0) {
		return new Map();
	}

	const { data: playerRows, error: playerError } = await supabaseAdmin
		.from("players")
		.select("id, rating")
		.in("id", playerIds);

	if (playerError) {
		console.error(`[${logPrefix}] failed to read candidate ratings:`, playerError.message);
		return new Map();
	}

	return new Map(
		(Array.isArray(playerRows) ? playerRows : [])
			.filter(
				(row): row is { id: string; rating?: unknown } =>
					Boolean(row) && typeof row === "object" && typeof row.id === "string"
			)
			.map((row) => [row.id, normalizePlayerRating(row.rating)])
	);
};

export const selectRoundGhostOpponent = async (
	supabaseAdmin: SupabaseClientLike,
	playerId: string,
	round: number,
	sessionType: MultiplayerSessionType,
	logPrefix: string
): Promise<{ enemyTeam: any[]; enemyPlayerName?: string } | null> => {
	const currentPlayerRating = await readPlayerRating(
		supabaseAdmin,
		playerId,
		logPrefix,
		"current player"
	);
	const { data: candidateGhosts, error: ghostError } = await supabaseAdmin
		.from("ghosts")
		.select("player_id, player_name, team")
		.eq("round", round)
		.eq("session_type", sessionType)
		.neq("player_id", playerId)
		.not("team", "is", null);

	if (ghostError) {
		console.error(`[${logPrefix}] failed to query ghosts:`, ghostError.message);
		return null;
	}

	const candidatePlayerIds = Array.from(
		new Set(
			(Array.isArray(candidateGhosts) ? candidateGhosts : [])
				.map((ghost) => (typeof ghost?.player_id === "string" ? ghost.player_id : null))
				.filter((ghostPlayerId): ghostPlayerId is string => ghostPlayerId !== null)
		)
	);
	const playerRatings = await buildPlayerRatingMap(supabaseAdmin, candidatePlayerIds, logPrefix);
	const matchedGhost = pickClosestRatedEnemySession(
		(Array.isArray(candidateGhosts) ? candidateGhosts : []).map((ghost) => ({
			...(ghost as GhostCandidate),
			rating:
				typeof ghost?.player_id === "string"
					? playerRatings.get(ghost.player_id)
					: DEFAULT_PLAYER_RATING,
		})),
		currentPlayerRating
	);
	if (!matchedGhost || !hasValidCombatTeam(matchedGhost.team)) {
		return null;
	}

	let enemyPlayerName =
		typeof matchedGhost.player_name === "string" && matchedGhost.player_name.trim().length > 0
			? matchedGhost.player_name.trim()
			: undefined;
	if (!enemyPlayerName && typeof matchedGhost.player_id === "string") {
		const { data: enemyPlayer, error: playerError } = await supabaseAdmin
			.from("players")
			.select("username")
			.eq("id", matchedGhost.player_id)
			.maybeSingle();

		if (playerError) {
			console.error(`[${logPrefix}] failed to read ghost owner username:`, playerError.message);
		} else if (typeof enemyPlayer?.username === "string") {
			enemyPlayerName = enemyPlayer.username.trim() || undefined;
		}
	}

	return {
		enemyTeam: sanitizeEnemyTeam(matchedGhost.team),
		enemyPlayerName: enemyPlayerName || "Guest",
	};
};
