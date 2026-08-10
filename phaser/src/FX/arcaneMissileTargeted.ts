import * as EnergyBeam from "./EnergyBeam";
import * as animation from "@Utils/animation";
import { getSettings } from "@Models/OptionsStore";
import * as Geometry from "@game/Geometry";
import { env } from "@Env";

export interface TargetedArcaneMissileOptions {
	colors?: number[];
	blendMode?: Phaser.BlendModes;
	amplitudeMin?: number;
	amplitudeMax?: number;
	frequencyMin?: number;
	frequencyMax?: number;
	particleScale?: number;
	/** Travel time of the missile in ms (defaults to 200). */
	duration?: number;
	impact?: {
		colors?: number[];
		scale?: number;
		speed?: number;
		lifespan?: number;
		alpha?: number;
	};
	onHit?: () => void | Promise<void>;
}

export async function arcaneMissileTargeted(
	source: Vec2,
	target: Vec2,
	options: TargetedArcaneMissileOptions = {}
): Promise<void> {
	const scene = env.scene;
	const {
		colors = [0x00ffff, 0x87ceeb, 0xadd8e6], // Light blue neon colors
		amplitudeMin = 5,
		amplitudeMax = 15,
		frequencyMin = 1,
		frequencyMax = 2,
		particleScale = 1.5,
		duration = 200,
		impact = {
			colors: [0x00ffff, 0x87ceeb],
			scale: 2,
			speed: 200,
			lifespan: 300,
			alpha: 0.4,
		},
		blendMode = Phaser.BlendModes.ADD,
		onHit = () => {},
	} = options;

	const distance = Geometry.distanceBetween(source, target);

	const positiveOrNegative = Math.random() > 0.5 ? 1 : -1;
	const amplitude =
		(Math.random() * (amplitudeMax - amplitudeMin) + amplitudeMin) * positiveOrNegative;
	const frequency = Math.floor(Math.random() * (frequencyMax - frequencyMin + 1) + frequencyMin);

	const particlesOption = getSettings().particles;
	let particleDivisor = 30;
	if (particlesOption === "low") particleDivisor = 45;
	else if (particlesOption === "high") particleDivisor = 15;

	const beam = new EnergyBeam.EnergyBeam({
		start: source,
		end: target,
		thickness: 1,
		amplitude,
		frequency,
		segments: Math.floor(distance / particleDivisor),
		color: colors[0],
	});

	beam.updateBeam();
	beam.setVisible(false);

	const points = beam.points;
	beam.destroy();
	const totalSegments = points.length - 1;
	const amplitudeForSegments = amplitude * 2.2;
	const travelTime = duration;
	const segmentDelay = travelTime / totalSegments;

	const [sx, sy] = source;
	const [tx, ty] = target;

	const vec = new Phaser.Math.Vector2(tx - sx, ty - sy);
	const normal = new Phaser.Math.Vector2(-vec.y, vec.x).normalize();

	const segmentSize = 12 * particleScale;

	for (let i = 0; i < totalSegments; i++) {
		const p0 = points[i];
		const p1 = points[i + 1];
		const angle = Phaser.Math.Angle.Between(p0.x, p0.y, p1.x, p1.y);
		const t = i / totalSegments;
		const midX = (p0.x + p1.x) / 2;
		const midY = (p0.y + p1.y) / 2;
		const wave = Math.sin(t * Math.PI * frequency);
		const offsetX = normal.x * wave * amplitudeForSegments;
		const offsetY = normal.y * wave * amplitudeForSegments;

		scene.time.delayedCall(i * segmentDelay, () => {
			const rect = scene.add.rectangle(
				midX + offsetX,
				midY + offsetY,
				segmentSize,
				segmentSize,
				colors[i % colors.length],
				1
			);
			rect.setRotation(angle);
			rect.setScale(particleScale * 2, particleScale * 2);
			rect.setBlendMode(blendMode);
			scene.tweens.add({
				targets: rect,
				alpha: 0,
				scaleX: 0,
				scaleY: 0,
				duration: duration * 2,
				delay: 0,
				x: rect.x + (Math.random() - 0.5) * 40,
				y: rect.y + (Math.random() - 0.5) * 40,
				ease: "Cubic.easeIn",
				onComplete: () => {
					rect.destroy();
				},
			});
		});
	}

	await animation.delay(duration);

	const impactLifespan = impact.lifespan || 300;
	const impactSpeed = impact.speed || 200;
	const impactColors = impact.colors || [0x00ffff, 0x87ceeb];
	const impactAlpha = impact.alpha || 0.4;
	const impactScale = impact.scale || 2;
	const impactRectCount = Math.max(6, Math.round(impactScale * 3));
	const impactRects: Phaser.GameObjects.Rectangle[] = [];

	for (let i = 0; i < impactRectCount; i++) {
		const angle = Math.random() * Math.PI * 2;
		const speed = impactSpeed * (0.6 + Math.random() * 0.8);
		const travelDistance = (speed * impactLifespan) / 1000;
		const color = impactColors[Math.floor(Math.random() * impactColors.length)];
		const size = Phaser.Math.FloatBetween(14, 26);

		// Spawn each rect at a small random offset from the impact point so they
		// don't all stack on top of each other (which would over-brighten the center).
		const spawnRadius = Phaser.Math.FloatBetween(4, 12);
		const spawnX = tx + Math.cos(angle) * spawnRadius;
		const spawnY = ty + Math.sin(angle) * spawnRadius;

		const rect = scene.add.rectangle(spawnX, spawnY, size, size, color, impactAlpha);
		rect.setBlendMode(blendMode);
		impactRects.push(rect);

		scene.tweens.add({
			targets: rect,
			x: spawnX + Math.cos(angle) * travelDistance,
			y: spawnY + Math.sin(angle) * travelDistance,
			alpha: 0,
			scaleX: 0,
			scaleY: 0,
			duration: impactLifespan,
			ease: "Cubic.easeOut",
			onComplete: () => {
				rect.destroy();
			},
		});
	}

	onHit();

	await animation.delay(impactLifespan);

	impactRects.forEach((rect) => {
		if (rect.active) {
			rect.destroy();
		}
	});
}
