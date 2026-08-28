import type { PlaybackState } from "./types";
import * as CombatLogger from "@game/Combat/CombatLogger";
import { applyLogEntryToCombatState } from "@game/Combat/applyLogEntryToCombatState";
import * as Chara from "@Components/Chara/Chara";
import * as ChargeBarDisplay from "@Components/Chara/ChargeBarDisplay";
import * as AudioManager from "@Systems/AudioManager";
import * as Effects from "../../../../../FX";
import * as ForceStats from "@Screens/Battleground/Components/ForceStats";
import { getCombatState } from "./combatStateStore";

// ---- Cast handlers (launch missile) ----

export const handleRegenCast = (
	log: CombatLogger.RegenCastEntry,
	_playbackState: PlaybackState
) => {
	AudioManager.playSoundEffect("sfx_spell_tranquility");
	const source = Chara.mustGetCharaById(log.sourceId);
	const target = Chara.mustGetCharaById(log.targetId);
	Effects.arcaneMissileTargeted([source.x, source.y], [target.x, target.y], {
		colors: [0x00ff00, 0x32cd32, 0x7fff00, 0x00ff00],
		amplitudeMin: 5,
		amplitudeMax: 15,
		particleScale: 1.5,
		impact: {
			colors: [0x00ff00, 0x32cd32],
			scale: 2,
			speed: 200,
			lifespan: 300,
			alpha: 0.4,
		},
		onHit: () => {},
	});
};

export const handleHasteCast = (
	log: CombatLogger.HasteCastEntry,
	_playbackState: PlaybackState
) => {
	const source = Chara.mustGetCharaById(log.sourceId);
	const target = Chara.mustGetCharaById(log.targetId);
	Effects.arcaneMissileTargeted([source.x, source.y], [target.x, target.y], {
		colors: [0x00ffff, 0x87ceeb, 0xadd8e6],
		amplitudeMin: 5,
		amplitudeMax: 15,
		particleScale: 1.5,
		impact: {
			colors: [0x00ffff, 0x87ceeb],
			scale: 2,
			speed: 200,
			lifespan: 300,
			alpha: 0.4,
		},
		onHit: () => {},
	});
};

export const handleSlowCast = (log: CombatLogger.SlowCastEntry, _playbackState: PlaybackState) => {
	AudioManager.playSoundEffect("sfx_spell_icepillar");
	const source = Chara.mustGetCharaById(log.sourceId);
	const target = Chara.mustGetCharaById(log.targetId);
	Effects.arcaneMissileTargeted([source.x, source.y], [target.x, target.y], {
		colors: [0x6e260e, 0x7b3f00, 0x6f4e37],
		amplitudeMin: 5,
		amplitudeMax: 20,
		particleScale: 1.5,
		blendMode: Phaser.BlendModes.NORMAL,
		impact: {
			colors: [0x6e260e, 0x954535],
			scale: 2,
			speed: 200,
			lifespan: 300,
			alpha: 0.4,
		},
		onHit: () => {},
	});
};

export const handleChargeCast = (
	log: CombatLogger.ChargeCastEntry,
	_playbackState: PlaybackState
) => {
	const source = Chara.mustGetCharaById(log.sourceId);
	const target = Chara.mustGetCharaById(log.targetId);
	Effects.arcaneMissileTargeted([source.x, source.y], [target.x, target.y], {
		colors: [0xffd700, 0xffa500, 0xff8c00],
		amplitudeMin: 5,
		amplitudeMax: 15,
		particleScale: 1.5,
		impact: {
			colors: [0xffd700, 0xffa500],
			scale: 2,
			speed: 200,
			lifespan: 300,
			alpha: 0.4,
		},
		onHit: () => {},
	});
};

// ---- Hit handlers (apply effect to unit state) ----

export const handleRegenHit = (log: CombatLogger.RegenHitEntry, _playbackState: PlaybackState) => {
	const target = Chara.mustGetCharaById(log.targetId);
	const unit = Chara.getUnit(target);
	ForceStats.updateRegenDisplay(unit, log.newRegen, log.amount);
};

export const handleHasteHit = (log: CombatLogger.HasteHitEntry, _playbackState: PlaybackState) => {
	const combatState = getCombatState();
	if (!combatState) return;
	const hasteTarget = combatState.unitById.get(log.targetId);
	if (hasteTarget) {
		applyLogEntryToCombatState(combatState, log);
		ChargeBarDisplay.updateChargeBar(log.targetId);
		Effects.hasteEffect(Chara.mustGetCharaById(log.targetId), {
			duration: 1000,
			intensity: 1.5,
			color: 0x00eaff,
		});
	}
};

export const handleSlowHit = (log: CombatLogger.SlowHitEntry, _playbackState: PlaybackState) => {
	const combatState = getCombatState();
	if (!combatState) return;
	const slowTarget = combatState.unitById.get(log.targetId);
	if (slowTarget) {
		applyLogEntryToCombatState(combatState, log);
		ChargeBarDisplay.updateChargeBar(log.targetId);
		Effects.slowEffect(Chara.mustGetCharaById(log.targetId), {
			duration: 1000,
			intensity: 1.5,
			color: 0xd2691e,
		});
	}
};

export const handleChargeHit = (
	log: CombatLogger.ChargeHitEntry,
	_playbackState: PlaybackState
) => {
	const combatState = getCombatState();
	if (!combatState) return;
	const chargeTarget = combatState.unitById.get(log.targetId);
	if (chargeTarget) {
		applyLogEntryToCombatState(combatState, log);
		ChargeBarDisplay.updateChargeBar(log.targetId);
		Effects.hasteEffect(Chara.mustGetCharaById(log.targetId), {
			duration: 1000,
			intensity: 1.5,
			color: 0xffd700,
		});
	}
};

// ---- D1/D2 (wacky content): silence & dispel status effects ----

export const handleSilenceCast = (
	log: CombatLogger.SilenceCastEntry,
	_playbackState: PlaybackState
) => {
	AudioManager.playSoundEffect("sfx_spell_voidwalk");
	const source = Chara.mustGetCharaById(log.sourceId);
	const target = Chara.mustGetCharaById(log.targetId);
	Effects.arcaneMissileTargeted([source.x, source.y], [target.x, target.y], {
		colors: [0x9775fa, 0x845ef7, 0x7950f2],
		amplitudeMin: 5,
		amplitudeMax: 15,
		particleScale: 1.5,
		impact: {
			colors: [0x9775fa, 0x845ef7],
			scale: 2,
			speed: 200,
			lifespan: 300,
			alpha: 0.4,
		},
		onHit: () => {},
	});
};

export const handleSilenceHit = (
	log: CombatLogger.SilenceHitEntry,
	_playbackState: PlaybackState
) => {
	const combatState = getCombatState();
	if (!combatState) return;
	const silenceTarget = combatState.unitById.get(log.targetId);
	if (silenceTarget) {
		applyLogEntryToCombatState(combatState, log);
		ChargeBarDisplay.updateChargeBar(log.targetId);
	}
};

export const handleDispelCast = (
	log: CombatLogger.DispelCastEntry,
	_playbackState: PlaybackState
) => {
	AudioManager.playSoundEffect("sfx_spell_bladebreaker");
	const source = Chara.mustGetCharaById(log.sourceId);
	const target = Chara.mustGetCharaById(log.targetId);
	Effects.arcaneMissileTargeted([source.x, source.y], [target.x, target.y], {
		colors: [0xe64980, 0xd6336c, 0xc2255c],
		amplitudeMin: 5,
		amplitudeMax: 15,
		particleScale: 1.5,
		impact: {
			colors: [0xe64980, 0xd6336c],
			scale: 2,
			speed: 200,
			lifespan: 300,
			alpha: 0.4,
		},
		onHit: () => {},
	});
};

export const handleDispelHit = (
	log: CombatLogger.DispelHitEntry,
	_playbackState: PlaybackState
) => {
	const combatState = getCombatState();
	if (!combatState) return;
	const dispelTarget = combatState.unitById.get(log.targetId);
	if (dispelTarget) {
		applyLogEntryToCombatState(combatState, log);
		ChargeBarDisplay.updateChargeBar(log.targetId);
	}
};
