import * as arcaneMissileTargeted from "./arcaneMissileTargeted";
import * as healingHitEffect from "./healingHitEffect";
import * as Card from "@game/Entities/Card";
import * as Chara from "@Systems/Chara/Chara";
import * as theme from "../Screens/Battleground/Components/UI/theme";
import * as animation from "@Utils/animation";
import * as colorUtils from "@Utils/colorUtils";
import { MagicOrb } from "@Components/MagicOrb/MagicOrb";
import { ClientState } from "@Models/ClientState";

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

type UpgradeCrystalSelectionEffectProps = {
	cardCenter: Vec2;
	cardSize: Size;
	cardObjects: Phaser.GameObjects.GameObject[];
	accentColor?: number;
	clientState: ClientState;
};

export async function playUpgradeCrystalSelectionEffect({
	cardCenter,
	cardSize,
	cardObjects,
	accentColor = DEFAULT_ACCENT_COLOR,
	clientState,
}: UpgradeCrystalSelectionEffectProps): Promise<void> {
	const target = getCrystalTargetPoint(clientState);
	const projectileColors = [
		theme.mixHexColors(accentColor, 0xffffff, 0.55),
		accentColor,
		theme.mixHexColors(accentColor, 0x08121f, 0.15),
	];
	const impactColors = [theme.mixHexColors(accentColor, 0xffffff, 0.75), accentColor];

	const shardEmitter = createCardDissolveEmitter(cardCenter, cardSize, projectileColors);
	const targetOrb = createCrystalAbsorptionOrb(target, accentColor);
	const targetOrbUpdate = (time: number) => {
		targetOrb.update(time);
	};

	io.scene.events.on(Phaser.Scenes.Events.UPDATE, targetOrbUpdate);
	io.scene.time.delayedCall(TARGET_ORB_DISSOLVE_DELAY_MS, () => {
		targetOrb.startDissolve();
	});

	const fadeCardPromise = animation.tween({
		targets: cardObjects,
		alpha: 0,
		duration: CARD_DISSOLVE_DURATION_MS,
		ease: "Cubic.easeIn",
	});

	const projectilePromises = Array.from({ length: PROJECTILE_COUNT }, async (_, index) => {
		await animation.delay(index * PROJECTILE_STAGGER_MS);
		const source = randomPointWithin(cardCenter, cardSize);

		await arcaneMissileTargeted.arcaneMissileTargeted(
			source,
			target,
			{
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
			animation.delay(PROJECTILE_ORB_DELAY_MS).then(() => healingHitEffect.healingHitEffect(target, 280)),
			animation.delay(SHARD_EMISSION_DURATION_MS).then(() => {
				shardEmitter.stop();
			}),
		]);

		await animation.delay(120);
	} finally {
		io.scene.events.off(Phaser.Scenes.Events.UPDATE, targetOrbUpdate);
		shardEmitter.destroy();
		targetOrb.destroy();
	}
}

function createCardDissolveEmitter(
	[x, y]: Vec2,
	[w, h]: Size,
	colors: number[]
): Phaser.GameObjects.Particles.ParticleEmitter {
	ensureShardTexture(io.scene);

	return io.scene.add
		.particles(x, y, SHARD_TEXTURE_KEY, {
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
					-w / 2,
					-h / 2,
					w,
					h
				),
				type: "random",
			} as Phaser.Types.GameObjects.Particles.EmitZoneData,
		})
		.setDepth(1200);
}

function createCrystalAbsorptionOrb(
	[x, y]: Vec2,
	accentColor: number,
): MagicOrb {
	const orb = new MagicOrb(x, y, {
		size: TARGET_ORB_SIZE,
		color: colorUtils.hexToVector3(theme.mixHexColors(accentColor, 0xffffff, 0.25)),
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

function getCrystalTargetPoint(clientState: ClientState): Vec2 {
	const core = Card.getPlayerPersistentCore(clientState.session);

	if (Chara.hasCharaById(core.id)) {
		const coreChara = Chara.mustGetCharaById(core.id);
		return [coreChara.x, coreChara.y - 30];
	}

	const position = Chara.getScreenPosition(core);
	return [position.x, position.y - 30];
}

function randomPointWithin(
	[x, y]: Vec2,
	[w, h]: Size
): Vec2 {
	return [
		x + (Math.random() - 0.5) * w,
		y + (Math.random() - 0.5) * h,
	];
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
