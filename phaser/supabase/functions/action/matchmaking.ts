const DEFAULT_MATCHMAKING_RATING_DELTA = 150;
const MATCHMAKING_CANDIDATE_LIMIT = 50;

export type MultiplayerSessionType = "multiplayer_ranked" | "multiplayer_casual";

export const normalizeSessionType = (rawValue: unknown): MultiplayerSessionType =>
	rawValue === "multiplayer_ranked" ? "multiplayer_ranked" : "multiplayer_casual";

export const readRatingDelta = (
	rawValue: unknown,
	fallback: number = DEFAULT_MATCHMAKING_RATING_DELTA
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
		(row): row is MatchCandidateSession & { team: { units: any[] } } => hasValidCombatTeam(row?.team)
	);

	if (validSessions.length === 0) {
		return null;
	}

	return pickRandom(validSessions, randomFn);
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

export const selectRoundGhostOpponent = async (
	supabaseAdmin: SupabaseClientLike,
	playerId: string,
	round: number,
	sessionType: MultiplayerSessionType,
	logPrefix: string
): Promise<{ enemyTeam: any[]; enemyPlayerName?: string } | null> => {
	const { data: candidateGhosts, error: ghostError } = await supabaseAdmin
		.from("ghosts")
		.select("player_id, team")
		.eq("round", round)
		.eq("session_type", sessionType)
		.neq("player_id", playerId)
		.not("team", "is", null)
		.limit(MATCHMAKING_CANDIDATE_LIMIT);

	if (ghostError) {
		console.error(`[${logPrefix}] failed to query ghosts:`, ghostError.message);
		return null;
	}

	const matchedGhost = pickMatchedEnemySession(
		Array.isArray(candidateGhosts) ? (candidateGhosts as GhostCandidate[]) : []
	);
	if (!matchedGhost || !hasValidCombatTeam(matchedGhost.team)) {
		return null;
	}

	let enemyPlayerName: string | undefined;
	if (typeof matchedGhost.player_id === "string") {
		const { data: enemyPlayer, error: playerError } = await supabaseAdmin
			.from("players")
			.select("username")
			.eq("id", matchedGhost.player_id)
			.maybeSingle();

		if (playerError) {
			console.error(`[${logPrefix}] failed to read ghost owner username:`, playerError.message);
		} else if (typeof enemyPlayer?.username === "string") {
			enemyPlayerName = enemyPlayer.username;
		}
	}

	return {
		enemyTeam: sanitizeEnemyTeam(matchedGhost.team),
		enemyPlayerName,
	};
};
