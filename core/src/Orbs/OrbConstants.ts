/**
 * Orb-related game balance constants.
 * Single source of truth shared across client and server.
 */

/** Minimum cooldown in milliseconds — orbs cannot reduce below this. */
export const ORB_MIN_COOLDOWN_MS = 1000;

/** Cooldown reduction factor applied by decrease_cooldown orbs. */
export const COOLDOWN_REDUCTION_FACTOR = 0.1;

/** Duration (ms) for haste status applied by reaction orbs. */
export const HASTE_DURATION_MS = 1000;

/** Duration (ms) for slow status applied by reaction orbs. */
export const SLOW_DURATION_MS = 1000;

/** Duration (ms) for charge status applied by reaction orbs. */
export const CHARGE_DURATION_MS = 500;

/** Power increase factor for increase_power_on_X orbs (10% of current power). */
export const ORB_POWER_INCREASE_FACTOR = 0.1;

/** Flat power increase for increasePowerOnWeakest reaction effect. */
export const WEAKEST_POWER_INCREASE = 10;

/** Flat power decrease for decreaseRandomEnemyPower and decreaseStrongestEnemyPower. */
export const ENEMY_POWER_DECREASE = 10;

/** Flat critical increase for increaseCriticalEffect. */
export const CRITICAL_INCREASE = 5;
/** Flat power increase for the sacrifice orb (matching combat sacrificeEffect bonus). */
export const SACRIFICE_POWER_INCREASE = 10;
