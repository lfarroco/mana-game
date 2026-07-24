import { tween } from "@Utils/animation";
import { mustGetCharaById, mustGetState } from "@Systems/Chara/Chara";
import { env } from "@Env";

const POP_ANIMATION_DURATION_MS = 300;

export async function pop(id: string) {
	const chara = mustGetCharaById(id);
	const s = mustGetState(chara);
	if (s.isAnimating) return;
	s.isAnimating = true;

	const attackAnimKey = `${s.unit.pic}_attack`;
	const idleAnimKey = `${s.unit.pic}_idle`;

	if (env.scene.anims.exists(attackAnimKey)) {
		s.sprite.anims.play(attackAnimKey, true);
		s.sprite.playAfterRepeat(idleAnimKey);
	}

	await tween({
		targets: [chara],
		scale: 1.4,
		yoyo: true,
		duration: POP_ANIMATION_DURATION_MS,
		repeat: 0,
	});

	s.isAnimating = false;
}
