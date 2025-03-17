export class GlowingOrb extends Phaser.GameObjects.Container {

	constructor(
		scene: Phaser.Scene,
		x: number, y: number,
		public target: { x: number; y: number; },
		public duration: number
	) {
		super(scene, x, y);
		scene.add.existing(this);
		this.create();
	}

	create() {

		// use particle emitter to create a glowing orb
		const orb = this.scene.add.particles(0, 0, 'white-dot', {
			speed: { min: 100, max: 100 },
			scale: { start: 5, end: 1 },
			alpha: { start: 0.8, end: 0 },
			lifespan: 300,
			frequency: 30,
			maxAliveParticles: 30,
			blendMode: 'ADD',
			//golden tones 
			tint: [0xffff00, 0xffffff]
		});

		// radial rays of light that follow the orb
		const rays = this.scene.add.particles(10, 5, 'light-pillar', {
			speed: 100,
			scaleX: { min: 0.02, max: 0.04 },
			scaleY: { min: 0.4, max: 0.5 },
			alpha: { start: 1, end: 0 },
			rotate: { min: 0, max: 360 },
			tint: [0xffff00, 0xffffff],
			lifespan: 30,
			frequency: 10,
			blendMode: 'ADD'
		});

		// Create explosion emitter
		const explosionEmitter = this.scene.add.particles(0, 0, 'white-dot', {
			speed: { min: 200, max: 300 },
			angle: { min: 0, max: 360 },
			scale: { start: 8, end: 0 },
			alpha: { start: 1, end: 0 },
			lifespan: 500,
			tint: [0xffff00, 0xffffff],
			maxParticles: 10,
			blendMode: 'ADD',
		});
		explosionEmitter.stop();

		// Movement tween
		this.scene.tweens.add({
			targets: this,
			x: this.target.x,
			y: this.target.y,
			duration: this.duration,
			ease: 'Sine.InOut',
			onComplete: () => {
				orb.stop();
				rays.stop();

				explosionEmitter.explode(50, orb.x, orb.y);
			}
		});

		this.add([orb, rays, explosionEmitter]);
	}

}
