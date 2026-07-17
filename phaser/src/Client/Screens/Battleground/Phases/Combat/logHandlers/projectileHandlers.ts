import type { PlaybackState } from "./types";
import * as CombatLogger from "@Core/Combat/CombatLogger";
import * as Chara from "@Systems/Chara/Chara";
import * as AudioManager from "@Systems/AudioManager";
import * as damageFx from "@TriggerSystem/effects/visuals/damage";
import * as healFx from "@TriggerSystem/effects/visuals/heal";
import * as shieldFx from "@TriggerSystem/effects/visuals/shield";
import * as poisonFx from "@TriggerSystem/effects/visuals/poison";
import * as ForceStats from "@Screens/Battleground/Components/ForceStats";

// ---- Cast handlers (launch missile) ----

export const handleDamageCast = (
	log: CombatLogger.DamageCastEntry,
	_playbackState: PlaybackState,
) => {
	AudioManager.playSoundEffect("sfx_spell_truestrike");
	const source = Chara.mustGetCharaById(log.sourceId);
	const target = Chara.mustGetCharaById(log.targetId);
	damageFx.damageFx([source.x, source.y], [target.x, target.y], () => { });
};

export const handleHealCast = (
	log: CombatLogger.HealCastEntry,
	_playbackState: PlaybackState,
) => {
	const source = Chara.mustGetCharaById(log.sourceId);
	const target = Chara.mustGetCharaById(log.targetId);
	healFx.healFx([source.x, source.y], [target.x, target.y], () => { });
};

export const handleShieldCast = (
	log: CombatLogger.ShieldCastEntry,
	_playbackState: PlaybackState,
) => {
	AudioManager.playSoundEffect("sfx_spell_manavortex");
	const source = Chara.mustGetCharaById(log.sourceId);
	const target = Chara.mustGetCharaById(log.targetId);
	shieldFx.shieldFx([source.x, source.y], [target.x, target.y], () => { });
};

export const handlePoisonCast = (
	log: CombatLogger.PoisonCastEntry,
	_playbackState: PlaybackState,
) => {
	const source = Chara.mustGetCharaById(log.sourceId);
	const target = Chara.mustGetCharaById(log.targetId);
	poisonFx.poisonFx([source.x, source.y], [target.x, target.y], () => { });
};

// ---- Hit handlers (apply damage/heal/shield/poison) ----

export const handleDamageHit = (
	log: CombatLogger.DamageHitEntry,
	_playbackState: PlaybackState,
) => {
	const target = Chara.mustGetCharaById(log.targetId);
	const unit = Chara.getUnit(target);
	Chara.shake(target);

	ForceStats.updateLifeDisplay(
		unit.force,
		log.newLife,
		log.lifeDelta,
	);

	if (log.shieldDelta === 0) return;

	ForceStats.updateShieldDisplay(
		unit.force,
		log.newShield,
		log.shieldDelta,
	);
};

export const handleHealHit = (
	log: CombatLogger.HealHitEntry,
	_playbackState: PlaybackState,
) => {
	const target = Chara.mustGetCharaById(log.targetId);
	Chara.shake(target);

	const unit = Chara.getUnit(target);
	ForceStats.updateLifeDisplay(
		unit.force,
		log.newLife,
		log.lifeDelta,
	);
};

export const handleShieldHit = (
	log: CombatLogger.ShieldHitEntry,
	_playbackState: PlaybackState,
) => {
	const target = Chara.mustGetCharaById(log.targetId);
	const unit = Chara.getUnit(target);
	Chara.shake(target);

	ForceStats.updateShieldDisplay(
		unit.force,
		log.newShield,
		log.shieldDelta,
	);
};

export const handlePoisonHit = (
	log: CombatLogger.PoisonHitEntry,
	_playbackState: PlaybackState,
) => {
	const target = Chara.mustGetCharaById(log.targetId);
	Chara.shake(target);
	const unit = Chara.getUnit(target);

	ForceStats.updatePoisonDisplay(
		unit.force,
		log.amount,
		log.amount,
	);
};

// ---- Tick handlers (poison/regen periodic damage/healing) ----

export const handlePoisonTick = (
	log: CombatLogger.PoisonTickEntry,
	_playbackState: PlaybackState,
) => {
	ForceStats.updateLifeDisplay(
		log.force,
		log.newLife,
		log.lifeDelta,
	);
};

export const handleRegenTick = (
	log: CombatLogger.RegenTickEntry,
	_playbackState: PlaybackState,
) => {
	ForceStats.updateLifeDisplay(
		log.force,
		log.newLife,
		log.lifeDelta ?? log.amount,
	);
};

export const handleTimeoutDamage = (
	log: CombatLogger.TimeoutDamageEntry,
	_playbackState: PlaybackState,
) => {
	ForceStats.updateLifeDisplay(
		log.force,
		log.newLife,
		log.lifeDelta,
	);
};