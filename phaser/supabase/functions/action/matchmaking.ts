const DEFAULT_MATCHMAKING_RATING_DELTA = 150;

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

export const pickMatchedEnemyTeam = (
	candidateSessions: Array<{ team?: unknown }>,
	randomFn: () => number = Math.random
): any[] | null => {
	const validTeams = (Array.isArray(candidateSessions) ? candidateSessions : [])
		.map((row) => row?.team)
		.filter((team): team is { units: any[] } => hasValidCombatTeam(team));

	if (validTeams.length === 0) {
		return null;
	}

	return sanitizeEnemyTeam(pickRandom(validTeams, randomFn));
};
