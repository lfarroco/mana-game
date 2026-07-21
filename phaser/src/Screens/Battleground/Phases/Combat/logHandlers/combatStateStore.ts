import { CombatState } from "@game/Models";

let currentCombatState: CombatState | undefined;

export function setCombatState(combatState: CombatState): void {
	currentCombatState = combatState;
}

export function getCombatState(): CombatState | undefined {
	return currentCombatState;
}