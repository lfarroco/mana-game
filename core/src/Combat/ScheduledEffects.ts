import { CombatEnvironment } from "../Models";
import * as effects from "../TriggerSystem/effects";

/**
 * A pending hit that has been cast but not yet landed.
 * Stored in a queue and processed each simulation frame when its hitTimeMs arrives.
 */
export type PendingHit = {
	type: string;
	hitTimeMs: number;
	sourceId: string;
	targetId: string;
	amount: number;
	effectDuration?: number;
	isCritical?: boolean;
	hasOnCritReaction?: boolean;
	hasOnOverHealReaction?: boolean;
	hasReHaste?: boolean;
	hasReSlow?: boolean;
};

export type ScheduledEffectsState = {
	pendingHits: PendingHit[];
};

export const initialize = (): ScheduledEffectsState => ({
	pendingHits: [],
});

/**
 * Queue a pending hit to be processed later.
 */
export const scheduleHit = (
	state: ScheduledEffectsState,
	hit: PendingHit,
): ScheduledEffectsState => ({
	...state,
	pendingHits: [...state.pendingHits, hit],
});

/**
 * Get all pending hits whose time has arrived, sorted by hit time.
 * Returns the hits due and the remaining pending hits.
 */
export const getDueHits = (
	state: ScheduledEffectsState,
	currentTimeMs: number,
): { dueHits: PendingHit[]; remaining: ScheduledEffectsState } => {
	const sorted = [...state.pendingHits].sort((a, b) => a.hitTimeMs - b.hitTimeMs);

	const splitIndex = sorted.findIndex((h) => h.hitTimeMs > currentTimeMs);

	if (splitIndex === -1) {
		return {
			dueHits: sorted,
			remaining: { pendingHits: [] },
		};
	}

	if (splitIndex === 0) {
		return {
			dueHits: [],
			remaining: state,
		};
	}

	return {
		dueHits: sorted.slice(0, splitIndex),
		remaining: { pendingHits: sorted.slice(splitIndex) },
	};
};

/**
 * Process a single pending hit: apply the effect and log the _hit entry.
 */
export const processHit = (
	env: CombatEnvironment,
	hit: PendingHit,
): void => {
	const { combatState: { units } } = env;
	const sourceUnit = units.find((u) => u.id === hit.sourceId);
	const targetUnit = units.find((u) => u.id === hit.targetId);

	if (!sourceUnit || !targetUnit) return;

	// If target core is already dead, skip the hit
	if (targetUnit.isCore && targetUnit.life <= 0) return;

	switch (hit.type) {
		case "damage":
			effects.applyDamageHit(env, hit);
			break;
		case "heal":
			effects.applyHealHit(env, hit);
			break;
		case "shield":
			effects.applyShieldHit(env, hit);
			break;
		case "poison":
			effects.applyPoisonHit(env, hit);
			break;
		case "regen":
			effects.applyRegenHit(env, hit);
			break;
		case "haste":
			effects.applyHasteHit(env, hit);
			break;
		case "slow":
			effects.applySlowHit(env, hit);
			break;
		case "charge":
			effects.applyChargeHit(env, hit);
			break;
	}
};

