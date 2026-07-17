import * as GameController from "@Core/GameController";
import * as Models from "@Core/Models";
import * as OrbShop from "@Screens/Battleground/Components/Shop/OrbShop";
import * as Chara from "@Systems/Chara/Chara";
import * as PowerDisplay from "@Systems/Chara/PowerDisplay";

let initialized = false;

function init() {
	if (initialized) return;
	initialized = true;

	const { events } = io.screens.battleground;
	events.orbApplyRequested.listen(onOrbApplyRequested);
	events.phaseFinished.listen(closeOrbShop);
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
	if (state.session.phase !== "orb_shop") return;
	await GameController.applyOrb(orbId, targetUnitId);
}

export async function onOrbApplied({
	session,
	orbId,
	targetUnitId,
}: {
	session: Models.SessionData;
	orbId: string;
	targetUnitId: string;
}) {
	const isRowOrb = orbId === "absorb_power_orb" || orbId === "distribute_power_orb";
	const targetUnit = session.team.units.find((unit) => unit.id === targetUnitId);
	if (!targetUnit) return;

	const [, targetRow] = targetUnit.position;

	for (const serverUnit of session.team.units) {
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