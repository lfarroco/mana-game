import {
	assert,
	assertEquals,
	assertMatch,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
	hasValidCombatTeam,
	normalizeSessionType,
	pickMatchedEnemySession,
	pickMatchedEnemyTeam,
	persistRoundGhost,
	readRatingDelta,
	sanitizeEnemyTeam,
	selectRoundGhostOpponent,
} from "./matchmaking.ts";

Deno.test("readRatingDelta returns fallback for invalid values", () => {
	assertEquals(readRatingDelta(undefined, 150), 150);
	assertEquals(readRatingDelta("not-a-number", 150), 150);
	assertEquals(readRatingDelta(-5, 150), 150);
});

Deno.test("readRatingDelta floors valid positive values", () => {
	assertEquals(readRatingDelta(220.9, 150), 220);
	assertEquals(readRatingDelta("301", 150), 301);
});

Deno.test("readRatingDelta supports a 50-point fallback window", () => {
	assertEquals(readRatingDelta(undefined, 50), 50);
	assertEquals(readRatingDelta("bad-value", 50), 50);
});

Deno.test("normalizeSessionType keeps ranked and defaults everything else to casual", () => {
	assertEquals(normalizeSessionType("multiplayer_ranked"), "multiplayer_ranked");
	assertEquals(normalizeSessionType("multiplayer_casual"), "multiplayer_casual");
	assertEquals(normalizeSessionType("ranked"), "multiplayer_casual");
	assertEquals(normalizeSessionType(undefined), "multiplayer_casual");
});

Deno.test("hasValidCombatTeam accepts non-empty team with a core", () => {
	assertEquals(
		hasValidCombatTeam({ units: [{ id: "u1", isCore: false }, { id: "core", isCore: true }] }),
		true
	);
});

Deno.test("hasValidCombatTeam rejects empty teams or teams without core", () => {
	assertEquals(hasValidCombatTeam({ units: [] }), false);
	assertEquals(hasValidCombatTeam({ units: [{ id: "u1", isCore: false }] }), false);
	assertEquals(hasValidCombatTeam(null), false);
});

Deno.test("sanitizeEnemyTeam clamps to 9 units and normalizes combat fields", () => {
	const units = Array.from({ length: 11 }).map((_, i) => ({
		id: `u-${i}`,
		cardId: `card-${i}`,
		position: { x: 9, y: -2 },
		force: "PLAYER",
		life: 5,
		maxLife: 10,
	}));

	const sanitized = sanitizeEnemyTeam({ units });
	assertEquals(sanitized.length, 9);
	assertEquals(sanitized[0].force, "CPU");
	assertEquals(sanitized[0].life, 10);
	assertEquals(sanitized[0].maxLife, 10);
	assertEquals(sanitized[0].position, { x: 2, y: 0 });
	assertMatch(sanitized[0].id, /^match-card-0-0$/);
});

Deno.test("pickMatchedEnemyTeam returns null when no valid candidate team exists", () => {
	const picked = pickMatchedEnemyTeam([
		{ team: { units: [] } },
		{ team: { units: [{ id: "u1", isCore: false }] } },
		{ team: null },
	]);
	assertEquals(picked, null);
});

Deno.test("pickMatchedEnemySession returns the selected source session", () => {
	const picked = pickMatchedEnemySession(
		[
			{ player_id: "player-a", team: { units: [{ id: "a", isCore: true }] } },
			{ player_id: "player-b", team: { units: [{ id: "b", isCore: true }] } },
		],
		() => 0.99
	);

	assertEquals(picked?.player_id, "player-b");
});

Deno.test("pickMatchedEnemyTeam selects and sanitizes a valid team", () => {
	const picked = pickMatchedEnemyTeam(
		[
			{ team: { units: [{ id: "a", cardId: "wolf", isCore: true, life: 100, maxLife: 200 }] } },
			{ team: { units: [{ id: "b", cardId: "mage", isCore: true, life: 70, maxLife: 90 }] } },
		],
		() => 0
	);

	assert(picked);
	assertEquals(Array.isArray(picked), true);
	assertEquals(picked[0].force, "CPU");
	assertEquals(picked[0].life, picked[0].maxLife);
	assertMatch(picked[0].id, /^match-wolf-0$/);
});

Deno.test("persistRoundGhost replaces the previous ghost for the same round and queue", async () => {
	const deleted = [];
	const inserted = [];
	const supabaseAdmin = {
		from: (table) => {
			if (table === "players") {
				return {
					select: () => ({
						eq: () => ({
							maybeSingle: async () => ({
								data: { username: "PlayerA" },
								error: null,
							}),
						}),
					}),
				};
			}

			assertEquals(table, "ghosts");
			return {
				delete: () => ({
					eq: (column, value) => ({
						eq: (column2, value2) => ({
							eq: async (column3, value3) => {
								deleted.push([column, value], [column2, value2], [column3, value3]);
								return { error: null };
							},
						}),
					}),
				}),
				insert: async (value) => {
					inserted.push(value);
					return { error: null };
				},
			};
		},
	};

	await persistRoundGhost(
		supabaseAdmin,
		"player-a",
		3,
		"multiplayer_ranked",
		{ units: [{ id: "core", isCore: true }] },
		"test"
	);

	assertEquals(deleted, [
		["player_id", "player-a"],
		["round", 3],
		["session_type", "multiplayer_ranked"],
	]);
	assertEquals(inserted.length, 1);
	assertEquals(inserted[0].player_id, "player-a");
	assertEquals(inserted[0].player_name, "PlayerA");
	assertEquals(inserted[0].round, 3);
	assertEquals(inserted[0].session_type, "multiplayer_ranked");
});

Deno.test("selectRoundGhostOpponent returns a sanitized same-round ghost with stored username", async () => {
	const supabaseAdmin = {
		from: (table) => {
			if (table === "ghosts") {
				return {
					select: () => ({
						eq: () => ({
							eq: () => ({
								neq: () => ({
									not: () => ({
										limit: async () => ({
											data: [
												{
													player_id: "player-b",
													player_name: "GhostPlayer",
													team: {
														units: [
															{
																id: "ghost-core",
																cardId: "wolf",
																isCore: true,
																life: 10,
																maxLife: 12,
															},
														],
													},
												},
											],
											error: null,
										}),
									}),
								}),
							}),
						}),
					}),
				};
			}

			throw new Error(`Unexpected table ${table}`);
		},
	};

	const opponent = await selectRoundGhostOpponent(
		supabaseAdmin,
		"player-a",
		1,
		"multiplayer_ranked",
		"test"
	);

	assert(opponent);
	assertEquals(opponent.enemyPlayerName, "GhostPlayer");
	assertEquals(opponent.enemyTeam[0].force, "CPU");
	assertEquals(opponent.enemyTeam[0].life, 12);
});

Deno.test("selectRoundGhostOpponent falls back to Guest when no username is available", async () => {
	const supabaseAdmin = {
		from: (table) => {
			if (table === "ghosts") {
				return {
					select: () => ({
						eq: () => ({
							eq: () => ({
								neq: () => ({
									not: () => ({
										limit: async () => ({
											data: [
												{
													player_id: "player-b",
													team: {
														units: [{ id: "ghost-core", cardId: "wolf", isCore: true }],
													},
												},
											],
											error: null,
										}),
									}),
								}),
							}),
						}),
					}),
				};
			}

			if (table === "players") {
				return {
					select: () => ({
						eq: () => ({
							maybeSingle: async () => ({
								data: null,
								error: null,
							}),
						}),
					}),
				};
			}

			throw new Error(`Unexpected table ${table}`);
		},
	};

	const opponent = await selectRoundGhostOpponent(
		supabaseAdmin,
		"player-a",
		1,
		"multiplayer_ranked",
		"test"
	);

	assert(opponent);
	assertEquals(opponent.enemyPlayerName, "Guest");
});
