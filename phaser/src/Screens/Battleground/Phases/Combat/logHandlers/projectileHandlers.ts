import type { PlaybackState } from "./types";
import * as CombatLogger from "@game/Combat/CombatLogger";
import * as Chara from "@Systems/Chara/Chara";
import * as AudioManager from "@Systems/AudioManager";
import * as damageFx from "@Screens/Battleground/Phases/Combat/logHandlers/visuals/damage";
import * as healFx from "@Screens/Battleground/Phases/Combat/logHandlers/visuals/heal";
import * as shieldFx from "@Screens/Battleground/Phases/Combat/logHandlers/visuals/shield";
import * as poisonFx from "@Screens/Battleground/Phases/Combat/logHandlers/visuals/poison";
import * as ForceStats from "@Screens/Battleground/Components/ForceStats";
import * as Effects from "@FX";
import * as Constants from "@Constants";
import * as CoreConstants from "@game/Constants";

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

export const handleTimeoutDamageCast = (
	log: CombatLogger.TimeoutDamageCastEntry,
	_playbackState: PlaybackState,
) => {
	// Fire a projectile from the black hole at center to the force's core
	const core = log.force === CoreConstants.FORCE_ID_PLAYER
		? state.combatState!.playerCore
		: state.combatState!.cpuCore;
	const coreChara = Chara.mustGetCharaById(core.id);
	void Effects.arcaneMissileTargeted(
		Constants.MIDDLE_SCREEN,
		[coreChara.x, coreChara.y],
		{
			colors: [0x4b0082, 0x8b00ff, 0x9400d3], // dark violet / purple
			amplitudeMin: 8,
			amplitudeMax: 25,
			particleScale: 2,
			impact: {
				colors: [0x4b0082, 0x800080],
				scale: 5,
				speed: 250,
				lifespan: 500,
				alpha: 0.5,
			},
		},
	);
};

export const handleTimeoutDamageHit = (
	log: CombatLogger.TimeoutDamageHitEntry,
	_playbackState: PlaybackState,
) => {
	// Shake the core chara when projectile lands
	const core = log.force === CoreConstants.FORCE_ID_PLAYER
		? state.combatState!.playerCore
		: state.combatState!.cpuCore;
	const coreChara = Chara.mustGetCharaById(core.id);
	Chara.shake(coreChara);

	ForceStats.updateLifeDisplay(
		log.force,
		log.newLife,
		log.lifeDelta,
	);
};