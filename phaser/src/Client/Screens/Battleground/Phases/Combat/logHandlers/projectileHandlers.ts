import type { LogHandler } from "./types";
import * as Chara from "@Systems/Chara/Chara";
import * as AudioManager from "@Systems/AudioManager";
import * as damageFx from "@TriggerSystem/effects/visuals/damage";
import * as healFx from "@TriggerSystem/effects/visuals/heal";
import * as shieldFx from "@TriggerSystem/effects/visuals/shield";
import * as poisonFx from "@TriggerSystem/effects/visuals/poison";
import * as ForceStats from "@Screens/Battleground/Components/ForceStats";

// ---- Cast handlers (launch missile) ----

export const handleDamageCast: LogHandler = (log, _playbackState) => {
	if (!log.sourceId || !log.targetId || log.amount === undefined) return;
	AudioManager.playSoundEffect("sfx_spell_truestrike");
	const source = Chara.mustGetCharaById(log.sourceId);
	const target = Chara.mustGetCharaById(log.targetId);
	// Launch missile visual (onHit is a no-op; _hit log handles state)
	damageFx.damageFx([source.x, source.y], [target.x, target.y], () => { });
};

export const handleHealCast: LogHandler = (log, _playbackState) => {
	if (!log.sourceId || !log.targetId || log.amount === undefined) return;
	const source = Chara.mustGetCharaById(log.sourceId);
	const target = Chara.mustGetCharaById(log.targetId);
	healFx.healFx([source.x, source.y], [target.x, target.y], () => { });
};

export const handleShieldCast: LogHandler = (log, _playbackState) => {
	if (!log.sourceId || !log.targetId || log.amount === undefined) return;
	AudioManager.playSoundEffect("sfx_spell_manavortex");
	const source = Chara.mustGetCharaById(log.sourceId);
	const target = Chara.mustGetCharaById(log.targetId);
	shieldFx.shieldFx([source.x, source.y], [target.x, target.y], () => { });
};

export const handlePoisonCast: LogHandler = (log, _playbackState) => {
	if (!log.sourceId || !log.targetId || log.amount === undefined) return;
	const source = Chara.mustGetCharaById(log.sourceId);
	const target = Chara.mustGetCharaById(log.targetId);
	poisonFx.poisonFx([source.x, source.y], [target.x, target.y], () => { });
};

// ---- Hit handlers (apply damage/heal/shield/poison) ----

export const handleDamageHit: LogHandler = (log, _playbackState) => {
	if (!log.sourceId || !log.targetId || log.amount === undefined) return;
	const target = Chara.mustGetCharaById(log.targetId);
	const unit = Chara.getUnit(target);
	Chara.shake(target);

	// TODO: have proper typing for logs, instead of checks attributes
	if (!log.newLife || !log.lifeDelta) throw new Error("invalid state");

	ForceStats.updateLifeDisplay(
		unit.force,
		log.newLife,
		log.lifeDelta,
	);

	if (log.newShield !== undefined && log.shieldDelta) {
		ForceStats.updateShieldDisplay(
			unit.force,
			log.newShield,
			log.shieldDelta,
		);
	}
};

export const handleHealHit: LogHandler = (log, _playbackState) => {
	if (!log.sourceId || !log.targetId || log.amount === undefined) return;
	const target = Chara.mustGetCharaById(log.targetId);
	Chara.shake(target);

	const unit = Chara.getUnit(target);
	ForceStats.updateLifeDisplay(
		unit.force,
		log.newLife || 0,
		log.lifeDelta || 0
	);
};

export const handleShieldHit: LogHandler = (log, _playbackState) => {
	if (!log.sourceId || !log.targetId || log.amount === undefined) return;
	const target = Chara.mustGetCharaById(log.targetId);
	const unit = Chara.getUnit(target);
	Chara.shake(target);
	if (!log.newShield || !log.amount || !log.shieldDelta)
		throw new Error("invalid state")

	ForceStats.updateShieldDisplay(
		unit.force,
		log.newShield,
		log.shieldDelta
	)
};

export const handlePoisonHit: LogHandler = (log, _playbackState) => {
	if (!log.sourceId || !log.targetId || log.amount === undefined) return;
	const target = Chara.mustGetCharaById(log.targetId);
	Chara.shake(target);
	const unit = Chara.getUnit(target);

	ForceStats.updatePoisonDisplay(
		unit.force,
		log.amount,
		log.amount
	)
};

// ---- Tick handlers (poison/regen periodic damage/healing) ----

export const handlePoisonTick: LogHandler = (log, _playbackState) => {
	if (!log.force || log.amount === undefined) return;
	if (log.newLife !== undefined) {
		ForceStats.updateLifeDisplay(
			log.force,
			log.newLife,
			log.lifeDelta ?? -log.amount,
		);
	}
};

export const handleRegenTick: LogHandler = (log, _playbackState) => {
	if (!log.force || log.amount === undefined) return;
	if (log.newLife !== undefined) {
		ForceStats.updateLifeDisplay(
			log.force,
			log.newLife,
			log.lifeDelta ?? log.amount,
		);
	}
};

export const handleTimeoutDamage: LogHandler = (log, _playbackState) => {
	if (!log.force || log.damage === undefined) return;
	if (log.newLife !== undefined) {
		ForceStats.updateLifeDisplay(
			log.force,
			log.newLife,
			log.lifeDelta ?? -log.damage,
		);
	}
};