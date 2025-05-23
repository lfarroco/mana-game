import { EnergyBeam } from "../../../Effects";
import { getRangedTargets } from "../../../Models/Board";
import { Unit } from "../../../Models/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import * as UnitManager from "../../../Scenes/Battleground/Systems/UnitManager";
import { delay } from "../../../Utils/animation";
import { popText } from "../Animations/popText";

export async function slow(
	scene: BattlegroundScene,
	unit: Unit,
) {
	const activeChara = UnitManager.getChara(unit.id);

	popText({
		text: "Slow",
		targetId: unit.id,
		type: "damage",
	})

	const enemies = getRangedTargets(scene.state, unit, 1)

	enemies
		.map(e => e.id)
		.map(UnitManager.getChara).forEach(async enemy => {

			const beam = new EnergyBeam(scene, {
				start: activeChara.container,
				end: enemy.container,
				color: 0x964B00,
			})
			const update = () => {
				beam.updateBeam()
			}

			scene.events.on(Phaser.Scenes.Events.UPDATE, update);

			await delay(scene, 200);

			enemy.unit.slowed += 2000;
			popText({
				text: "Slowed",
				targetId: enemy.id,
				type: "heal",
			})

			await delay(scene, 700)
			scene.events.off(Phaser.Scenes.Events.UPDATE, update);
			beam.destroy();

		});

}

