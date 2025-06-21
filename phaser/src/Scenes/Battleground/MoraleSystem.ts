/**
 * Manages the morale of each force during combat.
 * - Resets morale at the start of combat.
 * - Reduces morale when units take damage.
 * - Emits events to show, hide, and update morale bar UI.
 */

import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "../../constants/constants";
import { GameEvents } from "../../constants/events";
import { cpuForce, playerForce } from "../../Models/Entities/Force";
import { Unit } from "../../Models/Entities/Unit";
import { BattlegroundScene } from "./BattlegroundScene";

const MORALE_DAMAGE_MULTIPLIER = 0.2; // Morale lost per point of damage

let scene: BattlegroundScene;

export const init = (sceneRef: BattlegroundScene) => {
	scene = sceneRef;
	registerEventListeners();
}

function registerEventListeners() {
	scene.events.on(GameEvents.UNIT_TOOK_DAMAGE, handleUnitTookDamage);
	scene.events.on(GameEvents.COMBAT_START_EXECUTION_TRIGGER, handleCombatStart);
	scene.events.on(GameEvents.COMBAT_ENDED_VICTORY, handleCombatEnd);
	scene.events.on(GameEvents.COMBAT_ENDED_DEFEAT, handleCombatEnd);
}

function calculateForceMorale(forceId: string): number {
	return scene.state.battleData.units
		.filter(u => u.force === forceId)
		.map(u => u.maxHp)
		.reduce((a, b) => a + b, 0);
}

function handleCombatStart() {

	const playerMorale = calculateForceMorale(FORCE_ID_PLAYER);
	const cpuMorale = calculateForceMorale(FORCE_ID_CPU)

	playerForce.morale = playerMorale;
	playerForce.maxMorale = playerMorale;

	cpuForce.morale = cpuMorale;
	cpuForce.maxMorale = cpuMorale;

	scene.events.emit(GameEvents.MORALE_BARS_SHOW);
	scene.events.emit(
		GameEvents.MORALE_UPDATED,
		{
			forceId: FORCE_ID_PLAYER,
			newMorale: playerForce.morale,
			maxMorale: playerForce.morale,
		}
	);
	scene.events.emit(
		GameEvents.MORALE_UPDATED,
		{
			forceId: FORCE_ID_CPU,
			newMorale: cpuForce.morale,
			maxMorale: cpuForce.morale
		}
	);
}

function handleCombatEnd() {
	scene.events.emit(GameEvents.MORALE_BARS_HIDE);
}

function handleUnitTookDamage(payload: { unit: Unit, damage: number }) {
	const { unit, damage } = payload;
	const moraleLoss = damage * MORALE_DAMAGE_MULTIPLIER;

	const targetForce = unit.force === FORCE_ID_PLAYER ?
		playerForce : unit.force === FORCE_ID_CPU ?
			cpuForce : null;

	if (!targetForce) return;

	targetForce.morale = Math.max(0, targetForce.morale - moraleLoss);
	scene.events.emit(
		GameEvents.MORALE_UPDATED,
		{
			forceId: targetForce.id,
			newMorale: targetForce.morale,
			maxMorale: targetForce.maxMorale,
		}
	);
}

export function destroy() {
	scene.events.off(GameEvents.UNIT_TOOK_DAMAGE, handleUnitTookDamage);
	scene.events.off(GameEvents.COMBAT_START_EXECUTION_TRIGGER, handleCombatStart);
	scene.events.off(GameEvents.COMBAT_ENDED_VICTORY, handleCombatEnd);
	scene.events.off(GameEvents.COMBAT_ENDED_DEFEAT, handleCombatEnd);
}