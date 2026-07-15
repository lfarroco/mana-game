import * as ForceStats from "@Screens/Battleground/Components/ForceStats";
import * as ForceStatsState from "@Core/Combat/ForceStatsState";
import * as CoreConstants from "@Core/Constants";
import * as CombatSystemStates from "@Systems/CombatSystemStates";

export const createUpdateLifeDisplayEffect = () => (
	force: string,
	life: number,
	delta: number,
	forceStatsState?: ForceStatsState.ForceStatsState
) => {
	ForceStats.updateLifeDisplay(force, life, delta, forceStatsState);
};

export const createUpdateShieldDisplayEffect = () => (
	force: string,
	shield: number,
	delta: number,
	forceStatsState?: ForceStatsState.ForceStatsState
) => {
	ForceStats.updateShieldDisplay(force, shield, delta, forceStatsState);
};

export const createUpdateRegenDisplayEffect = () => (force: string, regen: number, delta: number) => {
	ForceStats.updateRegenDisplay(force, regen, delta);
};

export const createUpdatePoisonDisplayEffect = () => (force: string, poison: number, delta: number) => {
	ForceStats.updatePoisonDisplay(force, poison, delta);
};

export const createInitForceStatsEffect = () => () => {
	let state = CombatSystemStates.isInitialized()
		? CombatSystemStates.getCombatSystemStates().forceStatsState
		: ForceStats.initializeForceStatsState();
	state = ForceStats.ensureForceStats(state, CoreConstants.FORCE_ID_PLAYER);
	state = ForceStats.ensureForceStats(state, CoreConstants.FORCE_ID_CPU);
	return state;
};