import type { PlaybackState } from "./types";
import * as CombatLogger from "@game/Combat/CombatLogger";
import * as Chara from "@Components/Chara/Chara";
import * as AudioManager from "@Systems/AudioManager";
import * as damageFx from "@Screens/Battleground/Phases/Combat/logHandlers/visuals/damage";
import * as healFx from "@Screens/Battleground/Phases/Combat/logHandlers/visuals/heal";
import * as shieldFx from "@Screens/Battleground/Phases/Combat/logHandlers/visuals/shield";
import * as poisonFx from "@Screens/Battleground/Phases/Combat/logHandlers/visuals/poison";
import * as ForceStats from "@Screens/Battleground/Components/ForceStats";
import * as Effects from "../../../../../FX";
import * as Constants from "@Constants";
import * as CoreConstants from "@game/Constants";
import { getCombatState } from "./combatStateStore";

// ---- Cast handlers (launch missile) ----

export const handleDamageCast = (
	log: CombatLogger.DamageCastEntry,
	_playbackState: PlaybackState
) => {
	AudioManager.playSoundEffect("sfx_spell_truestrike");
	const source = Chara.mustGetCharaById(log.sourceId);
	const target = Chara.mustGetCharaById(log.targetId);
	damageFx.damageFx([source.x, source.y], [target.x, target.y], () => {});
};

export const handleHealCast = (log: CombatLogger.HealCastEntry, _playbackState: PlaybackState) => {
	AudioManager.playSoundEffect("sfx_spell_heal");
	const source = Chara.mustGetCharaById(log.sourceId);
	const target = Chara.mustGetCharaById(log.targetId);
	healFx.healFx([source.x, source.y], [target.x, target.y], () => {});
};

export const handleShieldCast = (
	log: CombatLogger.ShieldCastEntry,
	_playbackState: PlaybackState
) => {
	AudioManager.playSoundEffect("sfx_spell_manavortex");
	const source = Chara.mustGetCharaById(log.sourceId);
	const target = Chara.mustGetCharaById(log.targetId);
	shieldFx.shieldFx([source.x, source.y], [target.x, target.y], () => {});
};

export const handlePoisonCast = (
	log: CombatLogger.PoisonCastEntry,
	_playbackState: PlaybackState
) => {
	AudioManager.playSoundEffect("sfx_spell_graspofagony");
	const source = Chara.mustGetCharaById(log.sourceId);
	const target = Chara.mustGetCharaById(log.targetId);
	poisonFx.poisonFx([source.x, source.y], [target.x, target.y], () => {});
};

// ---- Hit handlers (apply damage/heal/shield/poison) ----

export const handleDamageHit = (
	log: CombatLogger.DamageHitEntry,
	_playbackState: PlaybackState
) => {
	const target = Chara.mustGetCharaById(log.targetId);
	const unit = Chara.getUnit(target);
	Chara.shake(target);

	ForceStats.updateLifeDisplay(unit.force, log.newLife, log.lifeDelta);

	if (log.shieldDelta === 0) return;

	ForceStats.updateShieldDisplay(unit.force, log.newShield, log.shieldDelta);
};

export const handleHealHit = (log: CombatLogger.HealHitEntry, _playbackState: PlaybackState) => {
	const target = Chara.mustGetCharaById(log.targetId);
	Chara.shake(target);

	const unit = Chara.getUnit(target);
	ForceStats.updateLifeDisplay(unit.force, log.newLife, log.lifeDelta);
	// A heal also cleanses the force's poison stacks (reducePoison) — the
	// post-cleanse total rides on the hit entry, so sync the chip here or it
	// only ever moves on poison_hit and drifts from the true stack.
	ForceStats.syncPoisonDisplay(unit.force, log.newPoison);
};

export const handleShieldHit = (
	log: CombatLogger.ShieldHitEntry,
	_playbackState: PlaybackState
) => {
	const target = Chara.mustGetCharaById(log.targetId);
	const unit = Chara.getUnit(target);
	Chara.shake(target);

	ForceStats.updateShieldDisplay(unit.force, log.newShield, log.shieldDelta);
};

export const handlePoisonHit = (
	log: CombatLogger.PoisonHitEntry,
	_playbackState: PlaybackState
) => {
	const target = Chara.mustGetCharaById(log.targetId);
	Chara.shake(target);
	const unit = Chara.getUnit(target);

	// Show the cumulative poison stack (newPoison), not just this hit's
	// increment — amount is only the per-hit delta, so displaying it leaves
	// the chip stuck at the last hit's value (~power * 0.1).
	ForceStats.updatePoisonDisplay(unit.force, log.newPoison, log.poisonDelta);
};

// ---- Tick handlers (poison/regen periodic damage/healing) ----

export const handlePoisonTick = (
	log: CombatLogger.PoisonTickEntry,
	_playbackState: PlaybackState
) => {
	ForceStats.updateLifeDisplay(log.force, log.newLife, log.lifeDelta);
};

export const handleRegenTick = (
	log: CombatLogger.RegenTickEntry,
	_playbackState: PlaybackState
) => {
	ForceStats.updateLifeDisplay(log.force, log.newLife, log.lifeDelta ?? log.amount);
};

export const handleTimeoutDamageCast = (
	log: CombatLogger.TimeoutDamageCastEntry,
	_playbackState: PlaybackState
) => {
	// Fire a projectile from the black hole at center to the force's core
	const core =
		log.force === CoreConstants.FORCE_ID_PLAYER
			? getCombatState()!.playerCore
			: getCombatState()!.cpuCore;
	const coreChara = Chara.mustGetCharaById(core.id);
	void Effects.arcaneMissileTargeted(Constants.MIDDLE_SCREEN, [coreChara.x, coreChara.y], {
		// Match the cast→hit timing in the logs (400ms) so the missile lands
		// exactly when the timeout_damage_hit entry updates the life display.
		duration: log.travelTime,
		// Black shards torn from the black hole — NORMAL blend so black is
		// actually visible (ADD would render 0x000000 as nothing).
		colors: [0x000000, 0x111111, 0x222222],
		amplitudeMin: 8,
		amplitudeMax: 25,
		particleScale: 1.5, // smaller rects than the previous purple missile (was 2)
		blendMode: Phaser.BlendModes.NORMAL,
		impact: {
			colors: [0x000000, 0x111111],
			scale: 2,
			speed: 250,
			lifespan: 500,
			alpha: 0.5,
		},
	});
};

export const handleTimeoutDamageHit = (
	log: CombatLogger.TimeoutDamageHitEntry,
	_playbackState: PlaybackState
) => {
	// Shake the core chara when projectile lands
	const core =
		log.force === CoreConstants.FORCE_ID_PLAYER
			? getCombatState()!.playerCore
			: getCombatState()!.cpuCore;
	const coreChara = Chara.mustGetCharaById(core.id);
	Chara.shake(coreChara);

	ForceStats.updateLifeDisplay(log.force, log.newLife, log.lifeDelta);
};
