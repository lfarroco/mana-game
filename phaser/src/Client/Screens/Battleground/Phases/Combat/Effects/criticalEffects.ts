import * as Chara from "@Systems/Chara/Chara";
import * as AudioManager from "@Systems/AudioManager";
import * as Effects from "Client/FX";

export const createIncreaseCriticalEffect = () => (
	sourceId: string | undefined,
	targetId: string,
	onHit: () => void
) => {
	const effect = async () => {
		onHit();
		// Note: Manual handling of critical popText might be needed here if updateUnitCritical was removed,
		// but for now we assume onHit updates data and we just play sound/projectiles.
		// Actually original code played innerfocus sound.
		AudioManager.playSoundEffect("sfx_spell_innerfocus");
	};

	if (!sourceId) {
		effect();
		return;
	}

	const source = Chara.mustGetCharaById(sourceId);
	const target = Chara.mustGetCharaById(targetId);
	Effects.arcaneMissileTargeted([source.x, source.y], [target.x, target.y], {
		colors: [0xffa500, 0xff8c00, 0xff4500],
		amplitudeMin: 5,
		amplitudeMax: 15,
		particleScale: 1.5,
		impact: {
			colors: [0xffa500, 0xff8c00],
			scale: 2,
			speed: 200,
			lifespan: 300,
			alpha: 0.4,
		},
		onHit: effect,
	});
};