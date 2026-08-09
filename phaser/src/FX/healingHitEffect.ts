import { delay } from "@Utils/animation";
import { env } from "@Env";

const HEALING_HIT_EFFECT_CONFIG = {
	PARTICLE_SPEED: 50,
	PARTICLE_SCALE_START: 3,
	PARTICLE_SCALE_END: 0,
	PARTICLE_QUANTITY: 5,
	LIFESPAN_RATIO: 0.5,
	HEALING_COLORS: [
		0x00ff00, 0x32cd32, 0x3cb371, 0x2e8b57, 0x228b22, 0x556b2f, 0x6b8e23, 0x8b4513, 0xcd853f,
		0xdaa520, 0xffd700,
	] as number[],
};

export async function healingHitEffect([x, y]: Vec2, lifespan: number): Promise<void> {
	const scene = env.scene;
	const rects: Phaser.GameObjects.Rectangle[] = [];

	const count = HEALING_HIT_EFFECT_CONFIG.PARTICLE_QUANTITY;
	for (let i = 0; i < count; i++) {
		const angle = Math.random() * Math.PI * 2;
		const speed = HEALING_HIT_EFFECT_CONFIG.PARTICLE_SPEED;
		const travelDistance = (speed * lifespan) / 1000;
		const color =
			HEALING_HIT_EFFECT_CONFIG.HEALING_COLORS[
				Math.floor(Math.random() * HEALING_HIT_EFFECT_CONFIG.HEALING_COLORS.length)
			];
		const size = Phaser.Math.FloatBetween(12, 24);

		const rect = scene.add.rectangle(x, y, size, size, color, 1);
		rect.setBlendMode(Phaser.BlendModes.ADD);
		rect.setScale(HEALING_HIT_EFFECT_CONFIG.PARTICLE_SCALE_START);
		rects.push(rect);

		scene.tweens.add({
			targets: rect,
			x: x + Math.cos(angle) * travelDistance,
			y: y + Math.sin(angle) * travelDistance,
			scaleX: HEALING_HIT_EFFECT_CONFIG.PARTICLE_SCALE_END,
			scaleY: HEALING_HIT_EFFECT_CONFIG.PARTICLE_SCALE_END,
			alpha: 0,
			duration: lifespan,
			ease: "Cubic.easeOut",
			onComplete: () => {
				rect.destroy();
			},
		});
	}

	await delay(lifespan * HEALING_HIT_EFFECT_CONFIG.LIFESPAN_RATIO);

	rects.forEach((rect) => {
		if (rect.active) {
			rect.destroy();
		}
	});
}
