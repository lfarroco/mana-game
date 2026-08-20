import type { PlaybackState } from "./types";
import * as CombatLogger from "@game/Combat/CombatLogger";
import * as CoreConstants from "@game/Constants";
import { applyLogEntryToCombatState } from "@game/Combat/applyLogEntryToCombatState";
import * as ChargeBarDisplay from "@Components/Chara/ChargeBarDisplay";
import { getCombatState } from "./combatStateStore";

export const handleHasteEnd = (log: CombatLogger.HasteEndEntry, _playbackState: PlaybackState) => {
	const combatState = getCombatState();
	if (!combatState) return;
	applyLogEntryToCombatState(combatState, log);
	ChargeBarDisplay.updateChargeBar(log.unitId);
};

export const handleSlowEnd = (log: CombatLogger.SlowEndEntry, _playbackState: PlaybackState) => {
	const combatState = getCombatState();
	if (!combatState) return;
	applyLogEntryToCombatState(combatState, log);
	ChargeBarDisplay.updateChargeBar(log.unitId);
};

export const handleSilenceEnd = (
	log: CombatLogger.SilenceEndEntry,
	_playbackState: PlaybackState
) => {
	const combatState = getCombatState();
	if (!combatState) return;
	applyLogEntryToCombatState(combatState, log);
	ChargeBarDisplay.updateChargeBar(log.unitId);
};

export const handleSilenceSkip = (
	log: CombatLogger.SilenceSkipEntry,
	_playbackState: PlaybackState
) => {
	// D1: a silenced unit reached its turn and wasted it. The sim resets its
	// charge to zero and starts a refresh lockout (CombatRunner.chargeUnits);
	// mirror that so the charge bar drops back to zero during playback.
	const combatState = getCombatState();
	if (!combatState) return;
	const unit = combatState.unitById.get(log.unitId);
	if (unit) {
		unit.charge = 0;
		unit.refresh = CoreConstants.MIN_REFRESH_MS;
		ChargeBarDisplay.updateChargeBar(log.unitId);
	}
};
