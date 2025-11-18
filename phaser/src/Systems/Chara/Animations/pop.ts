import { tween } from "@Utils/animation";
import { getCharaById, mustGetState } from "../Chara";

export async function pop(id: string) {
	const chara = getCharaById(id);
	const s = mustGetState(chara);
	if (s.isAnimating) return;
	s.isAnimating = true;

	const attackAnimKey = `${s.unit.pic}_attack`;
	const idleAnimKey = `${s.unit.pic}_idle`;

	s.sprite.anims.play(attackAnimKey, true);
	s.sprite.playAfterRepeat(idleAnimKey);

	await tween({
		targets: [chara],
		scale: 1.4,
		yoyo: true,
		duration: 300,
		repeat: 0,
	});

	s.isAnimating = false;
}
