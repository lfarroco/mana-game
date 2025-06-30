import { EnergyBeam } from "../../../Effects";
import { getRangedTargets } from "../../../Models/Board";
import { Unit } from "../../../Models/Entities/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import * as UnitManager from "../../../Scenes/Battleground/Systems/CharaManager";
import { delay } from "../../../Utils/animation";
import { applyStatusEffect } from "../../../Systems/StatusEffects/StatusEffectManager";

export async function slow(
	scene: BattlegroundScene,
	unit: Unit,
) {
	const activeChara = UnitManager.getChara(unit.id);
	if (!activeChara) return;

	activeChara.showPopText("Slow", "damage");

	const enemies = getRangedTargets(scene.state, unit, 1)

	enemies
		.map(e => e.id)
		.map(UnitManager.getChara).forEach(async enemy => {

			if (!enemy) return;

			const beam = new EnergyBeam(scene, {
				start: activeChara,
				end: enemy,
				color: 0x964B00,
			})
			const update = () => {
				beam.updateBeam()
			}

			scene.events.on(Phaser.Scenes.Events.UPDATE, update);

			await delay(scene, 200);

			// Apply slow status effect (2 seconds)
			applyStatusEffect(enemy.unit, {
				type: 'slow',
				remainingDuration: 2000,
				cooldownMultiplier: 1.5,
				displayName: 'Slowed'
			});

			enemy.showPopText("Slowed", "heal");

			await delay(scene, 700)
			scene.events.off(Phaser.Scenes.Events.UPDATE, update);
			beam.destroy();

		});

}
