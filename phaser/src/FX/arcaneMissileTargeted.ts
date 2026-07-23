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
		impact = {
			colors: [0x00ffff, 0x87ceeb],
			scale: 2,
			speed: 200,
			lifespan: 300,
			alpha: 0.4,
		},
		blendMode = Phaser.BlendModes.ADD,
		onHit = () => { },
	} = options;

	const duration = 200;

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
			sprite.setScale(particleScale * 2, particleScale * 2);
			sprite.setTint(colors[i % colors.length]);
			sprite.setAlpha(1);
			sprite.setBlendMode(blendMode);
			scene.tweens.add({
				targets: sprite,
				alpha: 0,
				scaleX: 0,
				scaleY: 0,
				duration: duration * 2,
				delay: 0,
				x: sprite.x + (Math.random() - 0.5) * 40,
				y: sprite.y + (Math.random() - 0.5) * 40,
				ease: "Cubic.easeIn",
				onComplete: () => {
					sprite.destroy();
				},
			});
		});
	}

	await animation.delay(duration);

	const impactLifespan = impact.lifespan || 300;
	const impactSpeed = impact.speed || 200;
	const impactColors = impact.colors || [0x00ffff, 0x87ceeb];
	const impactAlpha = impact.alpha || 0.4;
	const impactScale = (impact.scale || 2) * 4;
	const impactRectCount = Math.max(8, Math.round(impactScale * 2));
	const impactRects: Phaser.GameObjects.Rectangle[] = [];

	for (let i = 0; i < impactRectCount; i++) {
		const angle = Math.random() * Math.PI * 2;
		const speed = impactSpeed * (0.6 + Math.random() * 0.8);
		const travelDistance = (speed * impactLifespan) / 1000;
		const color = impactColors[Math.floor(Math.random() * impactColors.length)];
		const size = Phaser.Math.FloatBetween(40, 60);

		const rect = scene.add.rectangle(tx, ty, size, size, color, impactAlpha);
		rect.setBlendMode(blendMode);
		impactRects.push(rect);

		scene.tweens.add({
			targets: rect,
			x: tx + Math.cos(angle) * travelDistance,
			y: ty + Math.sin(angle) * travelDistance,
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
