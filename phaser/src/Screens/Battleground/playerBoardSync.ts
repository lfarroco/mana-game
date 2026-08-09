import * as Chara from "@Components/Chara/Chara";
import * as animation from "@Utils/animation";
import { env } from "@Env";

const shouldRefreshPlayerUnit = (
	unitId: string,
	expectedPower: number,
	expectedRank: number
): boolean => {
	if (!Chara.hasCharaById(unitId)) {
		return false;
	}

	const renderedUnit = Chara.getUnit(Chara.mustGetCharaById(unitId));
	return renderedUnit.power !== expectedPower || renderedUnit.rank !== expectedRank;
};

export const syncPlayerBoardUnits = async (): Promise<void> => {
	// Destroy any chara whose unit is no longer in the team (e.g. sold or removed).
	const currentUnitIds = new Set(env.state.session.team.units.map((u) => u.id));
	for (const chara of Chara.getAllCharas()) {
		const unitId = Chara.getId(chara);
		if (!currentUnitIds.has(unitId)) {
			Chara.destroy(chara);
		}
	}

	const summonPromises = env.state.session.team.units.map(async (unit, index) => {
		if (!Chara.hasCharaById(unit.id)) {
			await animation.delay(index * 200);
			await Chara.summon(unit, true);
			return;
		}

		if (!shouldRefreshPlayerUnit(unit.id, unit.power, unit.rank)) {
			return;
		}

		const chara = Chara.mustGetCharaById(unit.id);
		Chara.destroy(chara);
		await Chara.summon(unit, true);
	});

	await Promise.all(summonPromises);
};
