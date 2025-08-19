import { images } from "../assets";
import * as effects from "../Effects";
import { UIButton } from "../UI/UIButton";
import * as constants from "../constants/constants";

type EffectFactory = (scene: DebugScene) => void;

const EFFECT_REGISTRY: Record<string, EffectFactory> = {
	arcanemissile: (scene) => {
		scene.time.addEvent({
			delay: 1500,
			callback: () => {
				effects.arcaneMissile({
					scene, source: { x: 200, y: 500 }, target: { x: 800, y: 200 }, onHit: () => {
						const text = scene.add.text(400, 300, 'Arcane Missile Hit!', {
							fontSize: '32px',
							color: '#ff0000'
						});
						scene.add.tween({
							targets: text,
							alpha: 0,
							duration: 2000,
							onComplete: () => text.destroy()
						});
					}, colors: [0xff0000, 0x00ff00]
				});
			},
			repeat: -1
		});
	},

	criticaldamagedisplay: (scene) => {
		scene.time.addEvent({
			delay: 1200,
			callback: () => {
				effects.criticalDamageDisplay(scene, { x: 200, y: 200 }, 33);
			},
			repeat: -1
		});
	},

	energybeam: (scene) => {
		const beam = new effects.EnergyBeam(scene, {
			start: { x: 100, y: 100 },
			end: { x: 400, y: 100 },
			speed: 0.1,
			amplitude: 10,
			segments: 10,
			color: 0xff0000,
		});

		const beam2 = new effects.EnergyBeam(scene, {
			start: { x: 200, y: 200 },
			end: { x: 400, y: 400 },
			speed: 0.1,
			amplitude: 10,
			segments: 10,
			color: 0xffff00,
		});

		scene.events.on('update', () => {
			beam.updateBeam();
			beam2.updateBeam();
		});
	},

	fireball: (scene) => {
		scene.time.addEvent({
			delay: 1200,
			callback: () => {
				effects.fireballEffect(scene, { x: 100, y: 100 }, { x: 400, y: 100 });
				effects.fireballEffect(scene, { x: 200, y: 200 }, { x: 400, y: 400 });
			},
			repeat: -1
		});
	},

	glowingorb: (scene) => {
		scene.time.addEvent({
			delay: 1200,
			callback: () => {
				effects.glowingOrb.create(scene, 100, 100, { x: 400, y: 100 }, 1000);
				effects.glowingOrb.create(scene, 200, 200, { x: 300, y: 300 }, 1000);
				const orb = effects.glowingOrb.create(scene, 500, 400, { x: 900, y: 400 }, 1000);
				orb.setScale(3);
			},
			repeat: -1
		});
	},

	healinghiteffect: (scene) => {
		scene.time.addEvent({
			delay: 1200,
			callback: () => {
				effects.healingHitEffect(scene, { x: 100, y: 100 }, 1000);
				effects.healingHitEffect(scene, { x: 200, y: 200 }, 1000);
			},
			repeat: -1
		});
	},

	hasteeffect: (scene) => {
		scene.time.addEvent({
			delay: 1500,
			callback: () => {
				effects.hasteEffect(scene, { x: 150, y: 150 }, { duration: 1000, intensity: 1.0 });
				effects.hasteEffect(scene, { x: 300, y: 300 }, { duration: 1000, intensity: 1.5 });
				effects.hasteEffect(scene, { x: 450, y: 150 }, { duration: 1000, intensity: 0.7 });
			},
			repeat: -1
		});
	},

	sloweffect: (scene) => {
		scene.time.addEvent({
			delay: 1500,
			callback: () => {
				effects.slowEffect(scene, { x: 150, y: 350 }, { duration: 1000, intensity: 1.0 });
				effects.slowEffect(scene, { x: 300, y: 500 }, { duration: 1000, intensity: 1.5 });
				effects.slowEffect(scene, { x: 450, y: 350 }, { duration: 1000, intensity: 0.7 });
			},
			repeat: -1
		});
	},

	impacteffect: (scene) => {
		scene.time.addEvent({
			delay: 1200,
			callback: () => {
				effects.impactEffect({ scene, location: { x: 100, y: 100 }, pointA: { x: 100, y: 100 }, pointB: { x: 400, y: 100 } });
				effects.impactEffect({ scene, location: { x: 200, y: 200 }, pointA: { x: 200, y: 200 }, pointB: { x: 400, y: 400 } });
			},
			repeat: -1
		});
	},

	summoneffect: (scene) => {
		scene.time.addEvent({
			delay: 1200,
			callback: () => {
				effects.summonEffect(scene, { x: 100, y: 100 });
				effects.summonEffect(scene, { x: 200, y: 200 });
			},
			repeat: -1
		});
	},

	explodeeffect: (scene) => {
		scene.time.addEvent({
			delay: 2500,
			callback: () => {
				effects.explodeEffect(scene, { x: 100, y: 100 });
				effects.explodeEffect(scene, { x: 400, y: 400 });
			},
			repeat: -1
		});
	}
};

export class DebugScene extends Phaser.Scene {

	constructor() {
		super('DebugScene');
	}

	preload() {
		this.load.image(images.light);
		this.load.image(images.beam);
		this.load.image(images.white_dot);
		this.load.image(images.light_pillar);
		this.load.image(images.damage_display);
	}

	create() {
		const urlParams = new URLSearchParams(window.location.search);
		const effect = urlParams.get('vieweffect')?.toLowerCase();

		// If url param provided, auto-run that effect (legacy behavior)
		if (effect && EFFECT_REGISTRY[effect]) {
			EFFECT_REGISTRY[effect](this);
		}

		this.createEffectButtons();
	}

	private createEffectButtons() {
		// List of effect keys
		const effectKeys = Object.keys(EFFECT_REGISTRY);

		// Layout config
		const startX = 200;
		const startY = 150;
		const verticalSpacing = 70;
		const columns = 3;
		const columnWidth = 360;

		// Title text
		this.add.text(constants.MIDDLE_SCREEN_X, 60, 'DEBUG EFFECTS', {
			fontSize: '48px',
			color: '#ffffff',
			stroke: '#000000',
			strokeThickness: 6
		}).setOrigin(0.5);

		// Back button
		new UIButton(this, 'BACK', constants.SCREEN_WIDTH - 180, constants.SCREEN_HEIGHT - 80, () => {
			this.scene.start(constants.SCENE_KEYS.TITLE);
		}, 200);

		// Create buttons for each effect
		effectKeys.forEach((key, index) => {
			const col = index % columns;
			const row = Math.floor(index / columns);
			const x = startX + col * columnWidth;
			const y = startY + row * verticalSpacing;
			new UIButton(this, key.toUpperCase(), x, y, () => this.runEffect(key), 320);
		});
	}

	private runEffect(key: string) {
		// Clear previous timed events (avoids stacking repeats)
		this.time.removeAllEvents();
		console.log('[DebugScene] Running effect:', key);
		const fx = EFFECT_REGISTRY[key];
		if (fx) {
			fx(this);
		} else {
			console.warn('[DebugScene] Effect not found:', key);
		}
	}
}