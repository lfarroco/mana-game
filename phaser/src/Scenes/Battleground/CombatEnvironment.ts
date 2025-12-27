import { State } from "@Models/State";
import { Unit } from "@Models/Entities/Unit";
import { CombatSystemStates } from "./Systems/CombatSystemStates";

export type WaveOutcome = "player_won" | "player_lost";

export type CombatEffects = {
	onUnitPop: (unitId: string) => void;
	onChargeBarUpdate: (unitId: string) => void;
	onCombatEnd: (state: State, outcome: WaveOutcome, combatStates: CombatSystemStates) => Promise<void>;
	getTimeScale: () => number;
	getScene: () => any;
	// Update functions now accept optional state to bypass global lookup
	updateLifeDisplay: (force: string, life: number, delta: number, forceStatsState?: any) => void;
	updateShieldDisplay: (force: string, shield: number, delta: number, forceStatsState?: any) => void;
	updateRegenDisplay: (force: string, regen: number, delta: number) => void; // Regen display logic usually simpler, but might need state later? No, currently it just updates chip.
	updatePoisonDisplay: (force: string, poison: number, delta: number) => void;
	initBlackHole?: () => any;
	initCountdownTimer?: (blackHoleState: any) => any;
	initForceStats?: () => any;
	onReactionVisual?: (unitId: string) => Promise<void>;
	onDamage?: (sourceId: string, targetId: string, onHit: () => void) => void;
	onHeal?: (sourceId: string, targetId: string, onHit: () => void) => void;
	onShield?: (sourceId: string, targetId: string, onHit: () => void) => void;
	onPoison?: (sourceId: string, targetId: string, onHit: () => void) => void;
	onRegen?: (sourceId: string, targetId: string, onHit: () => void) => void;
	onHaste?: (sourceId: string, targetId: string, duration: number, onHit: () => void) => void;
	onSlow?: (sourceId: string, targetId: string, duration: number, onHit: () => void) => void;
	onCharge?: (sourceId: string, targetId: string, amount: number, onHit: () => void) => void;
	onIncreasePower?: (sourceId: string | undefined, targetId: string, onHit: () => void) => void;
	onDecreasePower?: (sourceId: string | undefined, targetId: string, onHit: () => void) => void;
	onIncreaseCritical?: (sourceId: string | undefined, targetId: string, onHit: () => void) => void;
	onPowerUpdate?: (unitId: string) => void;
	onTimeoutDamageVisual?: (targetForceId: string, damage: number, onHit: () => void) => void;
};

export type CombatEnvironment = {
	state: State;
	combatStates: CombatSystemStates;
	effects: CombatEffects;
	processReactions: (env: CombatEnvironment, triggeringUnit: Unit, effect: any, scale?: number) => void;
};
