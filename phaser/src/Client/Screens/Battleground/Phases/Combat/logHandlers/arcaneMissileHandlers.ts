import type { LogHandler } from "./types";
import * as State from "@Models/State";
import * as Chara from "@Systems/Chara/Chara";
import * as ChargeBarDisplay from "@Systems/Chara/ChargeBarDisplay";
import * as AudioManager from "@Systems/AudioManager";
import * as Effects from "Client/FX";

export const handleRegen: LogHandler = (log, _playbackState) => {
	if (!log.sourceId || !log.targetId || log.amount === undefined) return;
	AudioManager.playSoundEffect("sfx_spell_tranquility");
	const source = Chara.mustGetCharaById(log.sourceId);
	const target = Chara.mustGetCharaById(log.targetId);
	Effects.arcaneMissileTargeted(
		[source.x, source.y],
		[target.x, target.y],
		{
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
			onHit: () => { },
		});
};

export const handleHaste: LogHandler = (log, _playbackState) => {
	if (!log.sourceId || !log.targetId || log.effectDuration === undefined) return;
	const { state } = window as unknown as { state: State.State };
	const hasteTargetId = log.targetId;
	const hasteDuration = log.effectDuration;
	const hasteTarget = state.battleData.units.find((u) => u.id === hasteTargetId);
	if (hasteTarget) {
		const effect = async () => {
			hasteTarget.hasted += hasteDuration;
			ChargeBarDisplay.updateChargeBar(hasteTargetId);
			Effects.hasteEffect(Chara.mustGetCharaById(hasteTargetId), {
				duration: 1000,
				intensity: 1.5,
				color: 0x00eaff,
			});
		};
		const source = Chara.mustGetCharaById(log.sourceId);
		const target = Chara.mustGetCharaById(hasteTargetId);
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
			onHit: effect,
		});
	}
};

export const handleSlow: LogHandler = (log, _playbackState) => {
	if (!log.sourceId || !log.targetId || log.effectDuration === undefined) return;
	const { state } = window as unknown as { state: State.State };
	const slowTargetId = log.targetId;
	const slowDuration = log.effectDuration;
	const slowTarget = state.battleData.units.find((u) => u.id === slowTargetId);
	if (slowTarget) {
		const effect = async () => {
			slowTarget.slowed += slowDuration;
			ChargeBarDisplay.updateChargeBar(slowTargetId);
			Effects.slowEffect(Chara.mustGetCharaById(slowTargetId), {
				duration: 1000,
				intensity: 1.5,
				color: 0xd2691e,
			});
		};
		const source = Chara.mustGetCharaById(log.sourceId);
		const target = Chara.mustGetCharaById(slowTargetId);
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
			onHit: effect,
		});
	}
};

export const handleCharge: LogHandler = (log, _playbackState) => {
	if (!log.sourceId || !log.targetId || log.amount === undefined) return;
	const { state } = window as unknown as { state: State.State };
	const chargeTargetId = log.targetId;
	const chargeAmount = log.amount;
	const chargeTarget = state.battleData.units.find((u) => u.id === chargeTargetId);
	if (chargeTarget) {
		const effect = async () => {
			chargeTarget.charge += chargeAmount;
			ChargeBarDisplay.updateChargeBar(chargeTargetId);
			Effects.hasteEffect(Chara.mustGetCharaById(chargeTargetId), {
				duration: 1000,
				intensity: 1.5,
				color: 0xffd700,
			});
		};
		const source = Chara.mustGetCharaById(log.sourceId);
		const target = Chara.mustGetCharaById(chargeTargetId);
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
			onHit: effect,
		});
	}
};