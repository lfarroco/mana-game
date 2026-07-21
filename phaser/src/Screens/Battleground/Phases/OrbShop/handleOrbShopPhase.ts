import { ClientState } from "@Models/ClientState";
import * as GameController from "../../../../GameController";
import * as Models from "@game/Models";
import * as OrbShop from "@Screens/Battleground/Components/Shop/OrbShop";
import * as Chara from "@Systems/Chara/Chara";
import * as PowerDisplay from "@Systems/Chara/PowerDisplay";

let initialized = false;

function init(clientState: ClientState) {
	if (initialized) return;
	initialized = true;

	const { events } = io.screens.battleground;
	events.orbApplyRequested.listen((args) => onOrbApplyRequested({ ...args, clientState }));
	events.phaseFinished.listen(closeOrbShop);
}

export async function handleOrbShopPhase(clientState: ClientState): Promise<void> {
	init(clientState);
	await OrbShop.openOrbShop(clientState);
}

async function onOrbApplyRequested({
	clientState,
	orbId,
	targetUnitId,
}: {
	clientState: ClientState,
	orbId: string;
	targetUnitId: string;
}) {
	if (clientState.session.phase !== "orb_shop") return;
	await GameController.applyOrb(
		clientState, orbId, targetUnitId);
}

export async function onOrbApplied({
	clientState,
	orbId,
	targetUnitId,
}: {
	clientState: ClientState,
	orbId: string;
	targetUnitId: string;
}) {
	const isRowOrb = orbId === "absorb_power_orb" || orbId === "distribute_power_orb";
	const targetUnit = clientState.session.team.units.find((unit) => unit.id === targetUnitId);
	if (!targetUnit) return;

	const [, targetRow] = targetUnit.position;

	for (const serverUnit of clientState.session.team.units) {
		const [, row] = serverUnit.position;
		const isTarget = serverUnit.id === targetUnitId;
		const isInSameRow = isRowOrb && row === targetRow && !isTarget;

		if (!isTarget && !isInSameRow) continue;

		if (isRowOrb) {
			if (Chara.hasCharaById(serverUnit.id)) {
				PowerDisplay.updatePowerDisplay(clientState, serverUnit.id);
			}
			continue;
		}

		await Chara.refreshChara(clientState, serverUnit);
	}

	//ForceStats.syncPlayerPersistentForceStats();
}

async function closeOrbShop({ previousPhase }: { previousPhase: Models.PhaseType }) {
	if (previousPhase !== "orb_shop") return;
	await OrbShop.closeOrbShop();
}