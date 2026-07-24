import * as OrbShop from "@Screens/Battleground/Components/Shop/OrbShop";
import * as Chara from "@Systems/Chara/Chara";
import * as PowerDisplay from "@Systems/Chara/PowerDisplay";
import { env } from "@Env";
import { BattlegroundEvent } from "../../../../Events";
import { advancePhase, registerPhaseCleanup } from "../../BattlegroundScreen";

export function registerListeners(): (() => void)[] {
	return [
		BattlegroundEvent.orbApplyRequested.listen(onOrbApplyRequested),
		BattlegroundEvent.orbApplied.listen(onOrbApplied),
	];
}

export async function handleOrbShopPhase(): Promise<void> {
	await OrbShop.openOrbShop();
	registerPhaseCleanup(async () => {
		await OrbShop.closeOrbShop();
	});
}

async function onOrbApplyRequested({
	orbId,
	targetUnitId,
}: {
	orbId: string;
	targetUnitId: string;
}) {
	if (env.state.session.phase !== "orb_shop") return;
	await advancePhase({ type: "apply_orb", orbId, targetUnitId }, async () => {
		await BattlegroundEvent.orbApplied.emit({ orbId, targetUnitId });
	});
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