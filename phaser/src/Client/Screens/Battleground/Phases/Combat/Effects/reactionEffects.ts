import * as Chara from "@Systems/Chara/Chara";
import * as Effects from "Client/FX";

export const createReactionVisualEffect = () => async (unitId: string) => {
	const chara = Chara.mustGetCharaById(unitId);
	Effects.summonEffect(chara);
};