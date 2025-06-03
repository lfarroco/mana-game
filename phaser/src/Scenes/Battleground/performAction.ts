import { Unit } from "../../Models/Unit";
import BattlegroundScene from "./BattlegroundScene";
import { getAllActiveFoes } from "../../Models/State";
import { highlightCardAnimation } from "../../Systems/Chara/Animations/highlightCardAnimation";
import { getChara } from "./Systems/CharaManager";
import { traitSpecs } from "../../Models/Traits";

export const performAction = (scene: BattlegroundScene) => (unit: Unit) => async () => {

	console.log("[action] :: ", unit.job, ":: start", unit.id)

	highlightCardAnimation(getChara(unit.id))

	const activeFoes = getAllActiveFoes(scene.state)(unit.force);

	if (activeFoes.length === 0) return;

	if (unit.statuses.stun?.duration > 0) return;

	unit.traits.forEach(traitData => {
		const spec = traitSpecs[traitData.id];
		if (!spec) return;
		spec.events.onAction.forEach(e => {
			e(unit, traitData)(); // TODO: pass arguments from traitdata
		});
	});

	console.log("[action] :: ", unit.job, ":: end")

};
