export type PoisonSystemState = {
  poisonRates: Map<string, number>;
};

export function initializePoisonSystem(): PoisonSystemState {
  return {
    poisonRates: new Map(),
  };
}

export function applyPoison(
  poisonState: PoisonSystemState,
  targetForce: string,
  amount: number,
  _isCritical = false,
): PoisonSystemState {
  if (amount <= 0) return poisonState;
  const currentRate = poisonState.poisonRates.get(targetForce) || 0;

  const newRate = currentRate + amount;
  const newRates = new Map(poisonState.poisonRates);
  newRates.set(targetForce, newRate);

  return {
    ...poisonState,
    poisonRates: newRates,
  };
}

export function getPoisonRate(
  poisonState: PoisonSystemState,
  forceId: string,
): number {
  return poisonState.poisonRates.get(forceId) || 0;
}

/**
 * Reduce a force's poison stacks from a heal cast.
 *
 * `healAmount` is the RAW heal — heal + overheal (the caster's power × crit ×
 * scale), not the life actually restored. Do not pass `actualHealing`: a core at
 * full life heals entirely into overheal and would dispel nothing, which is the
 * exact situation the mechanic needs to cover. Reduction is 5% of the raw heal,
 * ignored for heals under 20.
 */
export function reducePoison(
  poisonState: PoisonSystemState,
  forceId: string,
  healAmount: number,
): PoisonSystemState {
  if (healAmount < 20) return poisonState;
  const currentRate = poisonState.poisonRates.get(forceId);
  if (!currentRate || currentRate === 0) return poisonState;

  const reduction = Math.min(currentRate, Math.floor(healAmount * 0.05));
  const newRate = currentRate - reduction;

  const newRates = new Map(poisonState.poisonRates);
  if (newRate <= 0) {
    newRates.delete(forceId);
  } else {
    newRates.set(forceId, newRate);
  }

  return {
    ...poisonState,
    poisonRates: newRates,
  };
}

export function clearPoison(
  poisonState: PoisonSystemState,
  forceId: string,
): PoisonSystemState {
  const newRates = new Map(poisonState.poisonRates);
  newRates.delete(forceId);

  return {
    ...poisonState,
    poisonRates: newRates,
  };
}
