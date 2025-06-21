import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "../../constants/constants";
import { GameEvents } from "../../constants/events";
import { cpuForce, playerForce } from "../../Models/Entities/Force";
import { Unit } from "../../Models/Entities/Unit";
import { BattlegroundScene } from "./BattlegroundScene";

const MORALE_DAMAGE_MULTIPLIER = 0.05; // Morale lost per point of damage
const MAX_MORALE = 100;

/**
 * Manages the morale of each force during combat.
 * - Resets morale at the start of combat.
 * - Reduces morale when units take damage.
 * - Emits events to show, hide, and update morale bar UI.
 */
export class MoraleSystem {
	private scene: BattlegroundScene;

	constructor(scene: BattlegroundScene) {
		this.scene = scene;
		this.registerEventListeners();
	}

	private registerEventListeners(): void {
		this.scene.events.on(GameEvents.UNIT_TOOK_DAMAGE, this.handleUnitTookDamage, this);
		this.scene.events.on(GameEvents.COMBAT_START_EXECUTION_TRIGGER, this.handleCombatStart, this);
		this.scene.events.on(GameEvents.COMBAT_ENDED_VICTORY, this.handleCombatEnd, this);
		this.scene.events.on(GameEvents.COMBAT_ENDED_DEFEAT, this.handleCombatEnd, this);
	}

	private handleCombatStart(): void {
		playerForce.morale = MAX_MORALE;
		cpuForce.morale = MAX_MORALE;

		this.scene.events.emit(GameEvents.MORALE_BARS_SHOW);
		this.scene.events.emit(GameEvents.MORALE_UPDATED, { forceId: FORCE_ID_PLAYER, newMorale: playerForce.morale, maxMorale: MAX_MORALE });
		this.scene.events.emit(GameEvents.MORALE_UPDATED, { forceId: FORCE_ID_CPU, newMorale: cpuForce.morale, maxMorale: MAX_MORALE });
	}

	private handleCombatEnd(): void {
		this.scene.events.emit(GameEvents.MORALE_BARS_HIDE);
	}

	private handleUnitTookDamage(payload: { unit: Unit, damage: number }): void {
		const { unit, damage } = payload;
		const moraleLoss = damage * MORALE_DAMAGE_MULTIPLIER;

		const targetForce = unit.force === FORCE_ID_PLAYER ? playerForce : unit.force === FORCE_ID_CPU ? cpuForce : null;
		if (!targetForce) return;

		targetForce.morale = Math.max(0, targetForce.morale - moraleLoss);
		this.scene.events.emit(GameEvents.MORALE_UPDATED, { forceId: targetForce.id, newMorale: targetForce.morale, maxMorale: MAX_MORALE });
	}

	public destroy(): void {
		this.scene.events.off(GameEvents.UNIT_TOOK_DAMAGE, this.handleUnitTookDamage, this);
		this.scene.events.off(GameEvents.COMBAT_START_EXECUTION_TRIGGER, this.handleCombatStart, this);
		this.scene.events.off(GameEvents.COMBAT_ENDED_VICTORY, this.handleCombatEnd, this);
		this.scene.events.off(GameEvents.COMBAT_ENDED_DEFEAT, this.handleCombatEnd, this);
	}
}