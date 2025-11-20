import { EnergyBeam } from "./EnergyBeam";
import { images } from "../assets";
import { delay } from "../Utils/animation";
import { getCurrentScene } from "@Models/State";

export interface TargetedArcaneMissileOptions {
	colors?: number[];
	blendMode?: Phaser.BlendModes;
	amplitudeMin?: number;
	amplitudeMax?: number;
	frequencyMin?: number;
	frequencyMax?: number;
	particleScale?: number;
	speedMultiplier?: number;
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
	source: { x: number; y: number },
	target: { x: number; y: number },
	options: TargetedArcaneMissileOptions = {}
): Promise<void> {
	const scene = getCurrentScene();
	const {
		colors = [0x00ffff, 0x87ceeb, 0xadd8e6], // Light blue neon colors
		amplitudeMin = 5,
		amplitudeMax = 15,
		frequencyMin = 1,
		frequencyMax = 2,
		particleScale = 1.5,
		speedMultiplier = 2,
		impact = {
			colors: [0x00ffff, 0x87ceeb],
			scale: 2,
			speed: 200,
			lifespan: 300,
			alpha: 0.4,
		},
		blendMode = "ADD",
		onHit = () => { },
	} = options;

	const duration = 200;

	const distance = Phaser.Math.Distance.BetweenPoints(source, target);

	const positiveOrNegative = Math.random() > 0.5 ? 1 : -1;
	const amplitude =
		(Math.random() * (amplitudeMax - amplitudeMin) + amplitudeMin) * positiveOrNegative;
	const frequency = Math.floor(Math.random() * (frequencyMax - frequencyMin + 1) + frequencyMin);

	const beam = new EnergyBeam(scene, {
		start: source,
		end: target,
		thickness: 1,
		amplitude,
		frequency,
		segments: Math.floor(distance / 15),
		color: colors[0],
	});

	beam.updateBeam();
	beam.setVisible(false);

	const rectKey = "arcane_missile_rect_big";
	const rectWidth = 12;
	const rectHeight = 12;
	if (!scene.textures.exists(rectKey)) {
		const g = scene.make.graphics({ x: 0, y: 0 });
		g.fillStyle(0xffffff, 1);
		g.fillRect(0, 0, rectWidth, rectHeight);
		g.generateTexture(rectKey, rectWidth, rectHeight);
		g.destroy();
	}

	const segmentSprites: Phaser.GameObjects.Image[] = [];
	const points = beam.points;
	const totalSegments = points.length - 1;
	const amplitudeForSegments = amplitude * 2.2;
	const travelTime = duration * speedMultiplier;
	const fadeDuration = travelTime * 1.1;
	const segmentDelay = travelTime / totalSegments;

	const vec = new Phaser.Math.Vector2(target.x - source.x, target.y - source.y);
	const normal = new Phaser.Math.Vector2(-vec.y, vec.x).normalize();

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
			const sprite = scene.add.image(midX + offsetX, midY + offsetY, rectKey);
			sprite.setRotation(angle);
			sprite.setScale(particleScale * 1.5, particleScale * 1.5);
			sprite.setTint(colors[i % colors.length]);
			sprite.setAlpha(1);
			sprite.setBlendMode(blendMode);
			segmentSprites.push(sprite);
			scene.tweens.add({
				targets: sprite,
				alpha: 0,
				duration: fadeDuration,
				delay: 0,
				x: sprite.x + (Math.random() - 0.5) * 40,
				y: sprite.y + (Math.random() - 0.5) * 40,
				ease: "Cubic.easeIn",
			});
		});
	}

	await delay(duration * speedMultiplier);

	const impactParticles = scene.add.particles(target.x, target.y, images.white_dot.key, {
		speed: impact.speed || 200,
		tint: impact.colors || [0x00ffff, 0x87ceeb],
		lifespan: impact.lifespan || 300,
		alpha: { start: impact.alpha || 0.4, end: 0 },
		scale: { start: impact.scale || 2, end: 0 },
		blendMode: "ADD",
	});

	try {
		onHit();
	} catch (error) {
		console.error("Error in arcaneMissileTargeted onHit callback:", error);
	}

	await delay(200);

	impactParticles.stop();

	await delay(2000);

	beam.destroy();
	impactParticles.destroy();
	segmentSprites.forEach((sprite) => sprite.destroy());
}
