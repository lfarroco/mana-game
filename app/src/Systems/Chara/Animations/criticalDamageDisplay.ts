import { Unit } from "../../../Models/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";

function criticalDamageDisplay(scene: BattlegroundScene, targetUnit: Unit) {

	const targetChara = scene.getChara(targetUnit.id);

	const damageBg = scene.add.image(
		0, 0,
		"damage_display"
	)
		.setOrigin(0.5, 0.5);

	const damage = scene.add.text(
		0, 0,
		"10",
		{
			fontSize: "96px",
			color: "#ff0000",
			stroke: "#000000",
			strokeThickness: 2,
			align: "center",
			fontStyle: "bold",
			shadow: {
				offsetX: 2,
				offsetY: 2,
				color: "#000",
				blur: 0,
				stroke: false,
				fill: true,
			}
		})
		.setOrigin(0.5, 0.5);

	const container = scene.add.container(
		targetChara.container.x, targetChara.container.y, [damageBg, damage]
	).setScale(0);

	return container;
}
