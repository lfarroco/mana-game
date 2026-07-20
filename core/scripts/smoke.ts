/**
 * Headless smoke test for @mana/core.
 *
 * Runs in plain Node.js via tsx — no jsdom, no Phaser mocks, no browser shims.
 * It proves two things:
 *
 * 1. Purity: importing core modules creates/references no browser globals
 *    (window, document, localStorage, Phaser). If a module-level side effect
 *    ever sneaks into core, this test fails.
 * 2. Determinism: the seeded RNG and seed-derivation functions produce exact
 *    golden values. Server-side replay validation depends on these never
 *    drifting, so changes here are deliberate and reviewed.
 *
 * Run from the phaser package: npm run test:core
 * Or directly:               npx tsx scripts/smoke.ts
 */

import * as Random from "../src/Random";

let failures = 0;

const check = (name: string, condition: boolean, detail?: unknown): void => {
	if (condition) {
		console.log(`  ok    ${name}`);
	} else {
		failures += 1;
		console.error(`  FAIL  ${name}`, detail ?? "");
	}
};

const g = globalThis as Record<string, unknown>;

console.log("purity: no browser globals after import");
check("window is undefined", typeof g.window === "undefined");
check("document is undefined", typeof g.document === "undefined");
check("localStorage is undefined", typeof g.localStorage === "undefined");
check("Phaser is undefined", typeof g.Phaser === "undefined");

console.log("determinism: golden values (server/client replay must match)");
const v = Random.value(123);
check("Random.value(123).result", v.result === 0.7872516233474016, v.result);
check("Random.value(123).seed", v.seed === 1831565936, v.seed);
check("Random.stringToSeed('mana')", Random.stringToSeed("mana") === 3343943, Random.stringToSeed("mana"));
check(
	"Random.generateNextSeed('seed','action')",
	Random.generateNextSeed("seed", "action") === "vx7ms9",
	Random.generateNextSeed("seed", "action"),
);
check(
	"Random.getDeterministicRandomOptionIndex('s',1,2,4)",
	Random.getDeterministicRandomOptionIndex("s", 1, 2, 4) === 0,
);
check(
	"Random.shuffleWithSeed([1..5], 42)",
	JSON.stringify(Random.shuffleWithSeed([1, 2, 3, 4, 5], 42)) === "[1,5,3,2,4]",
	Random.shuffleWithSeed([1, 2, 3, 4, 5], 42),
);
check(
	"Random.pickRandomItemsSeeded('mana',[x,y,z],2)",
	JSON.stringify(Random.pickRandomItemsSeeded("mana", ["x", "y", "z"], 2)) === '["x","y"]',
);

console.log("determinism: stateful RNG is reproducible after re-seeding");
Random.setSeed(7);
const first = [Random.nextValue(), Random.nextValue(), Random.nextValue()];
Random.setSeed(7);
const second = [Random.nextValue(), Random.nextValue(), Random.nextValue()];
check("setSeed(7) reproduces the same sequence", JSON.stringify(first) === JSON.stringify(second), { first, second });

if (failures > 0) {
	console.error(`\n@mana/core smoke test FAILED (${failures} failure(s))`);
	process.exit(1);
}

console.log("\n@mana/core smoke test passed — core loads headless and is deterministic.");
