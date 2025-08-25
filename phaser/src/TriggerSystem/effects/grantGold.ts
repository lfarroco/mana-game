import { playerForce, updatePlayerGoldIO } from "../../Models/Entities/Force";
import { Chara } from "../../Systems/Chara";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";
import { Unit } from "../../Models/Entities/Unit";
import { popText } from "../../Systems/Chara/Animations/popText";

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

export const grantGoldLogic = async (context: {
	forceId: string;
	amount: number;
	scene: BattlegroundScene;
	sourceUnit: Unit;
}) => {
	const { sourceUnit, amount } = context;

	const result = grantGoldLogicPure(
		amount,
		sourceUnit.force,
		playerForce.id
	);

	if (result.shouldGrantGold) {
		const chara = Chara.getCharaById(sourceUnit.id);
		if (result.popTextMessage)
			await popText({
				x: chara.x, y: chara.y, text: result.popTextMessage, type: "shield"
			});
		updatePlayerGoldIO(amount);
	}
};
