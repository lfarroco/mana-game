import type { LogHandler } from "./types";
import * as State from "@Models/State";
import * as ChargeBarDisplay from "@Systems/Chara/ChargeBarDisplay";

export const handleHasteEnd: LogHandler = (log, _playbackState) => {
	if (!log.unitId) return;
	const { state } = window as unknown as { state: State.State };
	const hasteEndTarget = state.battleData.units.find((u) => u.id === log.unitId);
	if (hasteEndTarget) {
		hasteEndTarget.hasted = 0;
		ChargeBarDisplay.updateChargeBar(log.unitId);
	}
};

export const handleSlowEnd: LogHandler = (log, _playbackState) => {
	if (!log.unitId) return;
	const { state } = window as unknown as { state: State.State };
	const slowEndTarget = state.battleData.units.find((u) => u.id === log.unitId);
	if (slowEndTarget) {
		slowEndTarget.slowed = 0;
		ChargeBarDisplay.updateChargeBar(log.unitId);
	}
};