import { EnergyBeam } from "../../../Effects";
import { Unit } from "../../../Models/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import * as UnitManager from "../../../Scenes/Battleground/Systems/UnitManager";
import { delay } from "../../../Utils/animation";
import { popText } from "../Animations/popText";

export async function song(
	scene: BattlegroundScene,
	unit: Unit,
) {
	const activeChara = UnitManager.getChara(unit.id);

	popText({
		text: "Song",
		targetId: unit.id,
		type: "heal",
	})

	const allies = UnitManager.getSurroundingAllies(activeChara.unit);

	allies.forEach(async ally => {

		const beam = new EnergyBeam(scene, {
			start: activeChara.container,
			end: ally.container,
			color: 0x3322ff,
		})
		const update = () => {
			beam.updateBeam()
		}

		scene.events.on(Phaser.Scenes.Events.UPDATE, update);

		await delay(scene, 200)

		ally.unit.hasted += 2000;
		popText({
			text: "Hasted",
			targetId: ally.id,
			type: "heal",
		})

		await delay(scene, 700)
		scene.events.off(Phaser.Scenes.Events.UPDATE, update);
		beam.destroy();

	});

}

