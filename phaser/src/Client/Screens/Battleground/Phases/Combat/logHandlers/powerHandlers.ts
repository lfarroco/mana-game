import type { LogHandler } from "./types";
import * as State from "@Models/State";
import * as ChargeBarDisplay from "@Systems/Chara/ChargeBarDisplay";

export const handleIncreasePower: LogHandler = (log, _playbackState) => {
	if (!log.targetId || log.amount === undefined || log.permanent === undefined) return;
	const { state } = window as unknown as { state: State.State };
	const powerTargetId = log.targetId;
	const powerAmount = log.amount;
	const powerPermanent = log.permanent;
	const powerTarget = state.battleData.units.find((u) => u.id === powerTargetId);
	if (powerTarget) {
		powerTarget.power += powerAmount;
		if (powerPermanent) {
			powerTarget.bonusPower += powerAmount;
		}
		ChargeBarDisplay.updateChargeBar(powerTargetId);
	}
};

export const handleDecreasePower: LogHandler = (log, _playbackState) => {
	if (!log.targetId || log.amount === undefined || log.permanent === undefined) return;
	const { state } = window as unknown as { state: State.State };
	const decreaseTargetId = log.targetId;
	const decreaseAmount = log.amount;
	const decreasePermanent = log.permanent;
	const affectedUnitId = log.affectedUnitId ?? decreaseTargetId;
	const affectedUnit = state.battleData.units.find((u) => u.id === affectedUnitId);
	if (affectedUnit) {
		affectedUnit.power -= decreaseAmount;
		if (decreasePermanent) {
			affectedUnit.bonusPower -= decreaseAmount;
		}
		ChargeBarDisplay.updateChargeBar(affectedUnitId);
	}
};