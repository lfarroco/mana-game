import * as GameController from "../../../../GameController";
import * as Models from "@game/Models";
import * as OrbShop from "@Screens/Battleground/Components/Shop/OrbShop";
import * as Chara from "@Systems/Chara/Chara";
import * as PowerDisplay from "@Systems/Chara/PowerDisplay";
import { env } from "@Env";
import { BattlegroundEvent } from "../../../../Events";

let initialized = false;

function init() {
	if (initialized) return;
	initialized = true;

	BattlegroundEvent.orbApplyRequested.listen(onOrbApplyRequested);
	BattlegroundEvent.phaseFinished.listen(closeOrbShop);
}

export async function handleOrbShopPhase(): Promise<void> {
	init();
	await OrbShop.openOrbShop();
}

async function onOrbApplyRequested({
	orbId,
	targetUnitId,
}: {
	orbId: string;
	targetUnitId: string;
}) {
	if (env.state.session.phase !== "orb_shop") return;
	await GameController.applyOrb(orbId, targetUnitId);
}

export async function onOrbApplied({
	orbId,
	targetUnitId,
}: {
	orbId: string;
	targetUnitId: string;
}) {
	const isRowOrb = orbId === "absorb_power_orb" || orbId === "distribute_power_orb";
	const targetUnit = env.state.session.team.units.find((unit) => unit.id === targetUnitId);
	if (!targetUnit) return;

	const [, targetRow] = targetUnit.position;

	for (const serverUnit of env.state.session.team.units) {
		const [, row] = serverUnit.position;
		const isTarget = serverUnit.id === targetUnitId;
		const isInSameRow = isRowOrb && row === targetRow && !isTarget;

		if (!isTarget && !isInSameRow) continue;

		if (isRowOrb) {
			if (Chara.hasCharaById(serverUnit.id)) {
				PowerDisplay.updatePowerDisplay(serverUnit.id);
			}
			continue;
		}

		await Chara.refreshChara(serverUnit);
	}

	//ForceStats.syncPlayerPersistentForceStats();
}

async function closeOrbShop({ previousPhase }: { previousPhase: Models.PhaseType }) {
	if (previousPhase !== "orb_shop") return;
	await OrbShop.closeOrbShop();
}