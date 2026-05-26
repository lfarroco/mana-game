import Phaser from "phaser";
import { arcaneMissileTargeted } from "@Effects/arcaneMissileTargeted";
import { healingHitEffect } from "@Effects/healingHitEffect";
import { MagicOrb } from "@Components/MagicOrb/MagicOrb";
import { getPlayerPersistentCore } from "@Models/Entities/Card";
import { mustGetCharaById, getScreenPosition, hasCharaById } from "@Systems/Chara/Chara";
import { mixHexColors } from "@Screens/Battleground/Components/UI/theme";
import { delay, tween } from "@Utils/animation";
import { hexToVector3 } from "@Utils/colorUtils";

const DEFAULT_ACCENT_COLOR = 0x7ae7ff;
const SHARD_TEXTURE_KEY = "upgrade-crystal-shard";
const SHARD_SIZE = 8;
const SHARD_EMISSION_DURATION_MS = 420;
const CARD_DISSOLVE_DURATION_MS = 280;
const PROJECTILE_COUNT = 8;
const PROJECTILE_STAGGER_MS = 45;
const PROJECTILE_ORB_DELAY_MS = 180;
const TARGET_ORB_SIZE = 180;
const TARGET_ORB_DISSOLVE_DELAY_MS = 220;
const TARGET_ORB_LIFETIME_MS = 900;

type Point = { x: number; y: number };

type UpgradeCrystalSelectionEffectProps = {
	cardCenter: Point;
	cardSize: { width: number; height: number };
	cardObjects: Phaser.GameObjects.GameObject[];
	accentColor?: number;
};

export async function playUpgradeCrystalSelectionEffect({
	cardCenter,
	cardSize,
	cardObjects,
	accentColor = DEFAULT_ACCENT_COLOR,
}: UpgradeCrystalSelectionEffectProps): Promise<void> {
	const target = getCrystalTargetPoint();
	const projectileColors = [
		mixHexColors(accentColor, 0xffffff, 0.55),
		accentColor,
		mixHexColors(accentColor, 0x08121f, 0.15),
	];
	const impactColors = [mixHexColors(accentColor, 0xffffff, 0.75), accentColor];

	const shardEmitter = createCardDissolveEmitter(cardCenter, cardSize, projectileColors);
	const targetOrb = createCrystalAbsorptionOrb(target, accentColor);
	const targetOrbUpdate = (time: number) => {
		targetOrb.update(time);
	};

	io.scene.events.on(Phaser.Scenes.Events.UPDATE, targetOrbUpdate);
	io.scene.time.delayedCall(TARGET_ORB_DISSOLVE_DELAY_MS, () => {
		targetOrb.startDissolve();
	});

	const fadeCardPromise = tween({
		targets: cardObjects,
		alpha: 0,
		duration: CARD_DISSOLVE_DURATION_MS,
		ease: "Cubic.easeIn",
	});

	const projectilePromises = Array.from({ length: PROJECTILE_COUNT }, async (_, index) => {
		await delay(index * PROJECTILE_STAGGER_MS);
		const source = randomPointWithin(cardCenter, cardSize);

		await arcaneMissileTargeted(source, target, {
			colors: projectileColors,
			amplitudeMin: 4,
			amplitudeMax: 12,
			particleScale: 1.2,
			speedMultiplier: 1.4,
			impact: {
				colors: impactColors,
				scale: 1.4,
				speed: 140,
				lifespan: 180,
				alpha: 0.7,
			},
		});
	});

	try {
		await Promise.all([
			fadeCardPromise,
			Promise.all(projectilePromises),
			delay(PROJECTILE_ORB_DELAY_MS).then(() => healingHitEffect(target, 280)),
			delay(SHARD_EMISSION_DURATION_MS).then(() => {
				shardEmitter.stop();
			}),
		]);

		await delay(120);
	} finally {
		io.scene.events.off(Phaser.Scenes.Events.UPDATE, targetOrbUpdate);
		shardEmitter.destroy();
		targetOrb.destroy();
	}
}

function createCardDissolveEmitter(
	cardCenter: Point,
	cardSize: { width: number; height: number },
	colors: number[]
): Phaser.GameObjects.Particles.ParticleEmitter {
	ensureShardTexture(io.scene);

	return io.scene.add
		.particles(cardCenter.x, cardCenter.y, SHARD_TEXTURE_KEY, {
			tint: colors,
			lifespan: { min: 260, max: 520 },
			alpha: { start: 0.95, end: 0 },
			scale: { start: 0.9, end: 0.15 },
			speedX: { min: -180, max: 180 },
			speedY: { min: -240, max: 80 },
			rotate: { min: -180, max: 180 },
			frequency: 24,
			quantity: 3,
			blendMode: "ADD",
			emitZone: {
				source: new Phaser.Geom.Rectangle(
					-cardSize.width / 2,
					-cardSize.height / 2,
					cardSize.width,
					cardSize.height
				),
				type: "random",
			} as Phaser.Types.GameObjects.Particles.EmitZoneData,
		})
		.setDepth(1200);
}

function createCrystalAbsorptionOrb(target: Point, accentColor: number): MagicOrb {
	const orb = new MagicOrb(target.x, target.y, {
		size: TARGET_ORB_SIZE,
		color: hexToVector3(mixHexColors(accentColor, 0xffffff, 0.25)),
		intensity: 1.5,
		speed: 1.1,
		dissolveDuration: 0.45,
		dissolveGridSize: 18,
		dissolveUpwardMovement: 0.22,
		dissolveFadeRange: 0.18,
	});

	orb.setDepth(1400);
	orb.setAlpha(0.8);
	orb.getShader().setScale(0.55);

	const shader = orb.getShader();

	io.scene.tweens.add({
		targets: shader,
		scaleX: 1.08,
		scaleY: 1.08,
		alpha: 0.15,
		duration: TARGET_ORB_LIFETIME_MS,
		ease: "Cubic.easeOut",
	});

	return orb;
}

function getCrystalTargetPoint(): Point {
	const core = getPlayerPersistentCore(state);

	if (hasCharaById(core.id)) {
		const coreChara = mustGetCharaById(core.id);
		return { x: coreChara.x, y: coreChara.y - 30 };
	}

	const position = getScreenPosition(core);
	return { x: position.x, y: position.y - 30 };
}

function randomPointWithin(
	cardCenter: Point,
	cardSize: { width: number; height: number }
): Point {
	return {
		x: cardCenter.x + (Math.random() - 0.5) * cardSize.width,
		y: cardCenter.y + (Math.random() - 0.5) * cardSize.height,
	};
}

function ensureShardTexture(scene: Phaser.Scene): void {
	if (scene.textures.exists(SHARD_TEXTURE_KEY)) {
		return;
	}

	const graphics = scene.make.graphics({ x: 0, y: 0 });
	graphics.fillStyle(0xffffff, 1);
	graphics.fillRect(0, 0, SHARD_SIZE, SHARD_SIZE);
	graphics.generateTexture(SHARD_TEXTURE_KEY, SHARD_SIZE, SHARD_SIZE);
	graphics.destroy();
}
