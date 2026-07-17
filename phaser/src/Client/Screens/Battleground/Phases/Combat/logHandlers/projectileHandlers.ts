import type { LogHandler } from "./types";
import * as Chara from "@Systems/Chara/Chara";
import * as AudioManager from "@Systems/AudioManager";
import * as damageFx from "@TriggerSystem/effects/visuals/damage";
import * as healFx from "@TriggerSystem/effects/visuals/heal";
import * as shieldFx from "@TriggerSystem/effects/visuals/shield";
import * as poisonFx from "@TriggerSystem/effects/visuals/poison";
import * as ForceStats from "@Screens/Battleground/Components/ForceStats";
import * as Card from "@Models/Entities/Card";

export const handleDamage: LogHandler = (log, _playbackState) => {
	if (!log.sourceId || !log.targetId || log.amount === undefined) return;
	const damage = log.amount;
	AudioManager.playSoundEffect("sfx_spell_truestrike");
	const source = Chara.mustGetCharaById(log.sourceId);
	const target = Chara.mustGetCharaById(log.targetId);

	const unit = Chara.getUnit(target);
	const core = Card.getBattleCore(state)(unit.force);

	damageFx.damageFx([source.x, source.y], [target.x, target.y], () => {
		Chara.shake(target);
		ForceStats.updateLifeDisplay(unit.force, core.life - damage, damage)
	});
};

export const handleHeal: LogHandler = (log, _playbackState) => {
	if (!log.sourceId || !log.targetId || log.amount === undefined) return;
	const source = Chara.mustGetCharaById(log.sourceId);
	const target = Chara.mustGetCharaById(log.targetId);
	healFx.healFx([source.x, source.y], [target.x, target.y], () => {
		Chara.shake(target);
	});
};

export const handleShield: LogHandler = (log, _playbackState) => {
	if (!log.sourceId || !log.targetId || log.amount === undefined) return;
	AudioManager.playSoundEffect("sfx_spell_manavortex");
	const source = Chara.mustGetCharaById(log.sourceId);
	const target = Chara.mustGetCharaById(log.targetId);
	shieldFx.shieldFx([source.x, source.y], [target.x, target.y], () => {
		Chara.shake(target);
	});
};

export const handlePoison: LogHandler = (log, _playbackState) => {
	if (!log.sourceId || !log.targetId || log.amount === undefined) return;
	const source = Chara.mustGetCharaById(log.sourceId);
	const target = Chara.mustGetCharaById(log.targetId);
	poisonFx.poisonFx([source.x, source.y], [target.x, target.y], () => {
		Chara.shake(target);
	});
};