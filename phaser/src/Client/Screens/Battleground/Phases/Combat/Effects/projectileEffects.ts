import * as Chara from "@Systems/Chara/Chara";
import * as AudioManager from "@Systems/AudioManager";
import * as damage from "@TriggerSystem/effects/visuals/damage";
import * as heal from "@TriggerSystem/effects/visuals/heal";
import * as shield from "@TriggerSystem/effects/visuals/shield";
import * as poison from "@TriggerSystem/effects/visuals/poison";

export const createDamageEffect = () => (
	sourceId: string,
	targetId: string,
	_amount: number,
	onHit: () => void
) => {
	AudioManager.playSoundEffect("sfx_spell_truestrike");
	const source = Chara.mustGetCharaById(sourceId);
	const target = Chara.mustGetCharaById(targetId);
	damage.damageFx([source.x, source.y], [target.x, target.y], () => {
		onHit();
		Chara.shake(target);
	});
};

export const createHealEffect = () => (
	sourceId: string,
	targetId: string,
	_amount: number,
	onHit: () => void
) => {
	const source = Chara.mustGetCharaById(sourceId);
	const target = Chara.mustGetCharaById(targetId);
	heal.healFx([source.x, source.y], [target.x, target.y], () => {
		onHit();
		Chara.shake(target);
	});
};

export const createShieldEffect = () => (
	sourceId: string,
	targetId: string,
	_amount: number,
	onHit: () => void
) => {
	AudioManager.playSoundEffect("sfx_spell_manavortex");
	const source = Chara.mustGetCharaById(sourceId);
	const target = Chara.mustGetCharaById(targetId);
	shield.shieldFx([source.x, source.y], [target.x, target.y], () => {
		onHit();
		Chara.shake(target);
	});
};

export const createPoisonEffect = () => (
	sourceId: string,
	targetId: string,
	_amount: number,
	onHit: () => void
) => {
	const source = Chara.mustGetCharaById(sourceId);
	const target = Chara.mustGetCharaById(targetId);
	poison.poisonFx([source.x, source.y], [target.x, target.y], () => {
		onHit();
		Chara.shake(target);
	});
};