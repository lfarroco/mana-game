import * as OrbShop from "@Screens/Battleground/Components/Shop/OrbShop";
import * as Chara from "@Systems/Chara/Chara";
import * as PowerDisplay from "@Systems/Chara/PowerDisplay";
import { env } from "@Env";
import { BattlegroundEvent } from "../../../../Events";
import { advancePhase } from "../../BattlegroundScreen";
import type { PhaseHandler } from "../../BattlegroundScreen";

export const OrbShopPhase: PhaseHandler = {
	name: "orb_shop",

	async start() {
		const container = env.scene.add.container();

		// --- Event listeners (tied to this instance, auto-disposed on exit) ---
		const listeners: (() => void)[] = [];

		listeners.push(
			BattlegroundEvent.orbApplyRequested.listen(async ({ orbId, targetUnitId }) => {
				if (env.state.session.phase !== "orb_shop") return;
				await advancePhase({ type: "apply_orb", orbId, targetUnitId }, async () => {
					await BattlegroundEvent.orbApplied.emit({ orbId, targetUnitId });
				});
			}),
		);

		listeners.push(
			BattlegroundEvent.orbApplied.listen(async ({ orbId, targetUnitId }) => {
				await onOrbApplied(orbId, targetUnitId);
			}),
		);

		// --- Open UI ---
		await OrbShop.openOrbShop();

		// --- Return teardown ---
		return async () => {
			listeners.forEach((d) => d());
			await OrbShop.closeOrbShop();
			container.destroy(true);
		};
	},
};

async function onOrbApplied(orbId: string, targetUnitId: string) {
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
}