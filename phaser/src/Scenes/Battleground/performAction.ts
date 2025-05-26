import { Unit } from "../../Models/Unit";
import BattlegroundScene from "./BattlegroundScene";
import { getAllActiveFoes } from "../../Models/State";
import { getCard } from "../../Models/Card";
import { getTrait } from "../../Models/Traits";
import { highlightCardAnimation } from "../../Systems/Chara/Animations/highlightCardAnimation";
import { getChara } from "./Systems/CharaManager";

export const performAction = (scene: BattlegroundScene) => (unit: Unit) => async () => {

	console.log("[action] :: ", unit.job, ":: start", unit.id)

	highlightCardAnimation(getChara(unit.id))

	const activeFoes = getAllActiveFoes(scene.state)(unit.force);

	if (activeFoes.length === 0) return;

	if (unit.statuses.stun?.duration > 0) return;

	const card = getCard(unit.job);

	card.traits.forEach(t => {
		const trait = getTrait()(t);
		trait.events.onAction.forEach(e => {
			e(unit)();
		});
	});

	console.log("[action] :: ", unit.job, ":: end")

};
