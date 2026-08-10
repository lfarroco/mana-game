import type * as CombatLogger from "@game/Combat/CombatLogger";

/**
 * Collapse the per-force status tick pair into a single playback entry.
 *
 * `StatusEffectSystem.tickForce` logs poison damage first and regen healing
 * second, as two consecutive entries for the same force at the same timeMs
 * (e.g. poison_tick -10, regen_tick +12). Rendering both produces two
 * overlapping popups on the same life chip, which reads as clutter. Since
 * only the net life change matters to the player, merge each pair into one
 * entry that carries the final life (from the regen entry, applied last) and
 * the net delta (e.g. +2).
 *
 * The merged entry reuses the `regen_tick` shape — its `newLife` is the final
 * life for the tick and its `lifeDelta`/`amount` are the net deltas — so the
 * existing regen tick handler renders it unchanged. Poison-only or regen-only
 * ticks pass through untouched.
 */
export const collapseStatusTickPairs = (
	logs: CombatLogger.CombatLogEntry[]
): CombatLogger.CombatLogEntry[] => {
	const collapsed: CombatLogger.CombatLogEntry[] = [];

	for (let i = 0; i < logs.length; i++) {
		const log = logs[i];
		const next = logs[i + 1];

		if (
			log.type === "poison_tick" &&
			next &&
			next.type === "regen_tick" &&
			next.force === log.force &&
			next.timeMs === log.timeMs
		) {
			collapsed.push({
				...next,
				amount: next.amount - log.amount,
				lifeDelta: log.lifeDelta + next.lifeDelta,
			});
			i++; // skip the regen_tick we just merged
			continue;
		}

		collapsed.push(log);
	}

	return collapsed;
};
