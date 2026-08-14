import * as Chara from "@Components/Chara/Chara";
import * as animation from "@Utils/animation";
import { env } from "@Env";
import { planBoardSync } from "@game/board/boardSync";

export const syncPlayerBoardUnits = async (): Promise<void> => {
	const teamUnits = env.state.session.team.units;

	const rendered = Chara.getAllCharas().map((chara) => {
		const unit = Chara.getUnit(chara);
		return { id: Chara.getId(chara), power: unit.power, rank: unit.rank };
	});

	const plan = planBoardSync(teamUnits, rendered);

	for (const unitId of plan.toDestroy) {
		Chara.destroy(Chara.mustGetCharaById(unitId));
	}

	const summonPromises = plan.toSummon.map(async (unit, index) => {
		await animation.delay(index * 200);
		await Chara.summon(unit, true);
	});

	for (const unit of plan.toRefresh) {
		Chara.refreshCharaInPlace(unit);
	}

	await Promise.all(summonPromises);
};
