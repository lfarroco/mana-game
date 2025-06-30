import { EnergyBeam } from "../../../Effects";
import { Unit } from "../../../Models/Entities/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import * as UnitManager from "../../../Scenes/Battleground/Systems/CharaManager";
import { delay } from "../../../Utils/animation";
import { applyStatusEffect } from "../../../Systems/StatusEffects/StatusEffectManager";

export async function haste(
	scene: BattlegroundScene,
	unit: Unit,
) {
	const activeChara = UnitManager.getChara(unit.id);
	if (!activeChara)
		return;

	activeChara.showPopText("Haste", "heal");

	const allies = UnitManager.getSurroundingAllies(activeChara.unit);

	// Process allies sequentially to avoid race conditions
	for (const ally of allies) {
		const beam = new EnergyBeam(scene, {
			start: activeChara,
			end: ally,
			color: 0x3322ff,
		})
		const update = () => {
			beam.updateBeam()
		}

		scene.events.on(Phaser.Scenes.Events.UPDATE, update);

		await delay(scene, 200);

		// Apply haste status effect (2 seconds)
		applyStatusEffect(ally.unit, {
			type: 'haste',
			remainingDuration: 2000,
			cooldownMultiplier: 0.5,
			displayName: 'Hasted'
		});

		ally.showPopText("Hasted", "heal");

		await delay(scene, 700)
		scene.events.off(Phaser.Scenes.Events.UPDATE, update);
		beam.destroy();
	}

}
