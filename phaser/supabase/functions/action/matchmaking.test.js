import {
	assert,
	assertEquals,
	assertMatch,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
	hasValidCombatTeam,
	pickMatchedEnemyTeam,
	readRatingDelta,
	sanitizeEnemyTeam,
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
