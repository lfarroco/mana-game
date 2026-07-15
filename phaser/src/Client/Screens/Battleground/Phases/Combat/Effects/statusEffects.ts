import * as Chara from "@Systems/Chara/Chara";
import * as AudioManager from "@Systems/AudioManager";
import * as Effects from "Client/FX";

export const createRegenEffect = () => (
	sourceId: string,
	targetId: string,
	_amount: number,
	onHit: () => void
) => {
	AudioManager.playSoundEffect("sfx_spell_tranquility");

	const source = Chara.mustGetCharaById(sourceId);
	const target = Chara.mustGetCharaById(targetId);
	Effects.arcaneMissileTargeted(
		[source.x, source.y],
		[target.x, target.y],
		{
			colors: [0x00ff00, 0x32cd32, 0x7fff00, 0x00ff00], //dark green tones
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
			onHit,
		});
};

export const createHasteEffect = () => (
	sourceId: string,
	targetId: string,
	_duration: number,
	onHit: () => void
) => {
	const effect = async () => {
		onHit();
		Effects.hasteEffect(Chara.mustGetCharaById(targetId), {
			duration: 1000,
			intensity: 1.5,
			color: 0x00eaff,
		});
	};

	const source = Chara.mustGetCharaById(sourceId);
	const target = Chara.mustGetCharaById(targetId);
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
};

export const createSlowEffect = () => (
	sourceId: string,
	targetId: string,
	_duration: number,
	onHit: () => void
) => {
	const effect = async () => {
		onHit();
		Effects.slowEffect(Chara.mustGetCharaById(targetId), {
			duration: 1000,
			intensity: 1.5,
			color: 0xd2691e,
		});
	};

	const source = Chara.mustGetCharaById(sourceId);
	const target = Chara.mustGetCharaById(targetId);
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
};

export const createChargeEffect = () => (
	sourceId: string,
	targetId: string,
	_amount: number,
	onHit: () => void
) => {
	const effect = async () => {
		onHit();
		Effects.hasteEffect(Chara.mustGetCharaById(targetId), {
			duration: 1000,
			intensity: 1.5,
			color: 0xffd700,
		});
	};

	const source = Chara.mustGetCharaById(sourceId);
	const target = Chara.mustGetCharaById(targetId);
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
};