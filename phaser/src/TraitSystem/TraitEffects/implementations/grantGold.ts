/**
 * @file Grant gold to player trait effect implementation
 * 
 * This module contains the logic for granting gold to the player when triggered by a trait.
 */
import { playerForce, updatePlayerGoldIO } from "../../../Models/Entities/Force";
import { getChara } from "../../../Scenes/Battleground/Systems/CharaManager";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { Unit } from "../../../Models/Entities/Unit";

/**
 * Pure function version of grant gold logic for testing
 */
export function grantGoldLogicPure(
	amount: number,
	sourceUnitForceId: string,
	playerForceId: string
): { shouldGrantGold: boolean; popTextMessage?: string } {
	if (amount === 0 || sourceUnitForceId !== playerForceId) {
		return { shouldGrantGold: false };
	}

	return {
		shouldGrantGold: true,
		popTextMessage: `+${amount} Gold`
	};
}

/**
 * Runtime implementation of grant gold logic
 */
export const grantGoldLogic = async (context: {
	forceId: string;
	amount: number;
	scene: BattlegroundScene;
	sourceUnit: Unit;
}) => {
	const { sourceUnit, scene, amount } = context;

	const result = grantGoldLogicPure(
		amount,
		sourceUnit.force,
		playerForce.id
	);

	if (result.shouldGrantGold) {
		const chara = getChara(sourceUnit.id);
		if (chara && result.popTextMessage) {
			await chara.showPopText(result.popTextMessage);
		}
		updatePlayerGoldIO(scene, amount);
	}
};
