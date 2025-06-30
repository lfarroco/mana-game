/**
 * @file Trait Sniper implementation
 * Effect: If the source unit is in the back row, it gains an attack bonus.
 */

import { Unit } from "../../../Models/Entities/Unit";
import { playerForce } from "../../../Models/Entities/Force";
import { TraitEffectContext, TraitEffectFn } from "../../TraitEffectSystem";
import { getEffectParams } from "../../TraitSystem.pure";

export interface TraitSniperLogicParams {
	amount: number;
}

export interface TraitSniperLogicState {
	sourceUnit: Unit;
	boardHeightInTiles?: number;
}

/**
 * Pure function to determine if a unit is in the back row and should receive sniper bonus
 */
export function traitSniperLogic(
	params: TraitSniperLogicParams,
	state: TraitSniperLogicState
): { shouldApplyBonus: boolean; attackBonus: number } {
	const { amount } = params;
	const { sourceUnit, boardHeightInTiles = 3 } = state;

	let isBackRow = false;

	if (sourceUnit.force === playerForce.id) {
		isBackRow = sourceUnit.position.y === boardHeightInTiles - 1;
	} else {
		isBackRow = sourceUnit.position.y === 0;
	}

	return {
		shouldApplyBonus: isBackRow,
		attackBonus: amount
	};
}

/**
 * Runtime wrapper for trait sniper effect
 */
export const traitSniper: TraitEffectFn = async (context: TraitEffectContext) => {
	const { getChara } = await import("../../../Scenes/Battleground/Systems/CharaManager");

	const { sourceUnit } = context;
	const amount = getEffectParams(context.traitInstanceParams, context.effectInstance, 'amount', 10);

	const result = traitSniperLogic(
		{ amount },
		{ sourceUnit }
	);

	if (result.shouldApplyBonus) {
		const chara = getChara(sourceUnit.id);
		if (!chara) return;
		await chara.updateUnitAttribute("power", result.attackBonus);
	}
};
