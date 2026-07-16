import type { LogHandler } from "./types";
import * as Chara from "@Systems/Chara/Chara";
import * as AudioManager from "@Systems/AudioManager";
import * as damageFx from "@TriggerSystem/effects/visuals/damage";
import * as healFx from "@TriggerSystem/effects/visuals/heal";
import * as shieldFx from "@TriggerSystem/effects/visuals/shield";
import * as poisonFx from "@TriggerSystem/effects/visuals/poison";

export const handleDamage: LogHandler = (log, _playbackState) => {
	if (!log.sourceId || !log.targetId || log.amount === undefined) return;
	AudioManager.playSoundEffect("sfx_spell_truestrike");
	const source = Chara.mustGetCharaById(log.sourceId);
	const target = Chara.mustGetCharaById(log.targetId);
	damageFx.damageFx([source.x, source.y], [target.x, target.y], () => {
		Chara.shake(target);
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