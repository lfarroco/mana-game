import type { LogHandler } from "./types";
import * as Chara from "@Systems/Chara/Chara";
import * as AudioManager from "@Systems/AudioManager";
import * as damageFx from "@TriggerSystem/effects/visuals/damage";
import * as healFx from "@TriggerSystem/effects/visuals/heal";
import * as shieldFx from "@TriggerSystem/effects/visuals/shield";
import * as poisonFx from "@TriggerSystem/effects/visuals/poison";
import * as ForceStats from "@Screens/Battleground/Components/ForceStats";
import * as Card from "@Models/Entities/Card";
import * as State from "@Models/State";

// ---- Cast handlers (launch missile) ----

export const handleDamageCast: LogHandler = (log, _playbackState) => {
	if (!log.sourceId || !log.targetId || log.amount === undefined) return;
	AudioManager.playSoundEffect("sfx_spell_truestrike");
	const source = Chara.mustGetCharaById(log.sourceId);
	const target = Chara.mustGetCharaById(log.targetId);
	// Launch missile visual (onHit is a no-op; _hit log handles state)
	damageFx.damageFx([source.x, source.y], [target.x, target.y], () => {});
};

export const handleHealCast: LogHandler = (log, _playbackState) => {
	if (!log.sourceId || !log.targetId || log.amount === undefined) return;
	const source = Chara.mustGetCharaById(log.sourceId);
	const target = Chara.mustGetCharaById(log.targetId);
	healFx.healFx([source.x, source.y], [target.x, target.y], () => {});
};

export const handleShieldCast: LogHandler = (log, _playbackState) => {
	if (!log.sourceId || !log.targetId || log.amount === undefined) return;
	AudioManager.playSoundEffect("sfx_spell_manavortex");
	const source = Chara.mustGetCharaById(log.sourceId);
	const target = Chara.mustGetCharaById(log.targetId);
	shieldFx.shieldFx([source.x, source.y], [target.x, target.y], () => {});
};

export const handlePoisonCast: LogHandler = (log, _playbackState) => {
	if (!log.sourceId || !log.targetId || log.amount === undefined) return;
	const source = Chara.mustGetCharaById(log.sourceId);
	const target = Chara.mustGetCharaById(log.targetId);
	poisonFx.poisonFx([source.x, source.y], [target.x, target.y], () => {});
};

// ---- Hit handlers (apply damage/heal/shield/poison) ----

export const handleDamageHit: LogHandler = (log, _playbackState) => {
	if (!log.sourceId || !log.targetId || log.amount === undefined) return;
	const { state } = window as unknown as { state: State.State };
	const target = Chara.mustGetCharaById(log.targetId);
	const unit = Chara.getUnit(target);
	const core = Card.getBattleCore(state)(unit.force);
	Chara.shake(target);
	// Use newLife/newShield from log if available, otherwise calculate
	if (log.newLife !== undefined && core) {
		const oldLife = core.life;
		core.life = log.newLife;
		ForceStats.updateLifeDisplay(unit.force, log.newLife, oldLife - log.newLife);
	} else {
		ForceStats.updateLifeDisplay(unit.force, core.life - log.amount, log.amount);
	}
};

export const handleHealHit: LogHandler = (log, _playbackState) => {
	if (!log.sourceId || !log.targetId || log.amount === undefined) return;
	const target = Chara.mustGetCharaById(log.targetId);
	Chara.shake(target);
};

export const handleShieldHit: LogHandler = (log, _playbackState) => {
	if (!log.sourceId || !log.targetId || log.amount === undefined) return;
	const target = Chara.mustGetCharaById(log.targetId);
	Chara.shake(target);
};

export const handlePoisonHit: LogHandler = (log, _playbackState) => {
	if (!log.sourceId || !log.targetId || log.amount === undefined) return;
	const target = Chara.mustGetCharaById(log.targetId);
	Chara.shake(target);
};

// ---- Tick handlers (poison/regen periodic damage/healing) ----

export const handlePoisonTick: LogHandler = (log, _playbackState) => {
	if (!log.force || log.amount === undefined) return;
	const { state } = window as unknown as { state: State.State };
	const unit = state.battleData.units.find(u => u.force === log.force && u.isCore);
	if (!unit) return;
	if (log.newLife !== undefined) {
		const oldLife = unit.life;
		unit.life = log.newLife;
		ForceStats.updateLifeDisplay(unit.force, log.newLife, oldLife - log.newLife);
	}
	if (log.newShield !== undefined) {
		unit.shield = log.newShield;
	}
};

export const handleRegenTick: LogHandler = (log, _playbackState) => {
	if (!log.force || log.amount === undefined) return;
	const { state } = window as unknown as { state: State.State };
	const unit = state.battleData.units.find(u => u.force === log.force && u.isCore);
	if (!unit) return;
	if (log.newLife !== undefined) {
		const oldLife = unit.life;
		unit.life = log.newLife;
		ForceStats.updateLifeDisplay(unit.force, log.newLife, log.newLife - oldLife);
	}
	if (log.newShield !== undefined) {
		unit.shield = log.newShield;
	}
};

export const handleTimeoutDamage: LogHandler = (log, _playbackState) => {
	if (!log.force || log.damage === undefined) return;
	const { state } = window as unknown as { state: State.State };
	const unit = state.battleData.units.find(u => u.force === log.force && u.isCore);
	if (!unit) return;
	if (log.newLife !== undefined) {
		const oldLife = unit.life;
		unit.life = log.newLife;
		ForceStats.updateLifeDisplay(unit.force, log.newLife, oldLife - log.newLife);
	}
	if (log.newShield !== undefined) {
		unit.shield = log.newShield;
	}
};