import { images } from "../assets";
import * as effects from "../Effects"

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
		const effect = urlParams.get('EFFECT')?.toLowerCase();

		if (effect) {

			if (effect === "arcanemissile") {

				this.time.addEvent({
					delay: 1500,
					callback: () => {
						effects.arcaneMissile({ scene: this, source: { x: 200, y: 500 }, target: { x: 800, y: 200 }, speed: 1, onHit: () => { }, colors: [0xff0000, 0x00ff00] });
						effects.arcaneMissile({ scene: this, source: { x: 200, y: 500 }, target: { x: 800, y: 200 }, speed: 1 });
						effects.arcaneMissile({ scene: this, source: { x: 200, y: 500 }, target: { x: 800, y: 200 }, speed: 1 });
						effects.arcaneMissile({ scene: this, source: { x: 200, y: 500 }, target: { x: 800, y: 200 }, speed: 1 });
						effects.arcaneMissile({ scene: this, source: { x: 200, y: 500 }, target: { x: 800, y: 200 }, speed: 1 });
					},
					repeat: -1
				});

			} else if (effect === "criticaldamagedisplay") {
				this.time.addEvent({
					delay: 1200,
					callback: () => {
						effects.criticalDamageDisplay(this, { x: 200, y: 200 }, 33);
					},
					repeat: -1
				});
			} else if (effect === "energybeam") {
				const beam = new effects.EnergyBeam(this, {
					start: { x: 100, y: 100 },
					end: { x: 400, y: 100 },
					speed: 0.1,
					amplitude: 10,
					segments: 10,
					color: 0xff0000,
				});

				const beam2 = new effects.EnergyBeam(this, {
					start: { x: 200, y: 200 },
					end: { x: 400, y: 400 },
					speed: 0.1,
					amplitude: 10,
					segments: 10,
					color: 0xffff00,
				});

				this.events.on('update', () => {
					beam.updateBeam();
					beam2.updateBeam();
				});
			} else if (effect === "fireballeffect") {
				this.time.addEvent({
					delay: 1200,
					callback: () => {
						effects.fireballEffect(this, 1, { x: 100, y: 100 }, { x: 400, y: 100 });
						effects.fireballEffect(this, 1, { x: 200, y: 200 }, { x: 400, y: 400 });
					},
					repeat: -1
				})

			} else if (effect === "glowingorb") {
				this.time.addEvent({
					delay: 1200,
					callback: () => {
						new effects.GlowingOrb(this, 100, 100, { x: 400, y: 100 }, 1000);
						new effects.GlowingOrb(this, 200, 200, { x: 300, y: 300 }, 1000);
						const orb = new effects.GlowingOrb(this, 500, 400, { x: 900, y: 400 }, 1000);
						orb.setScale(3)
					},
					repeat: -1
				})
			} else if (effect === "healinghiteffect") {
				this.time.addEvent({
					delay: 1200,
					callback: () => {
						effects.healingHitEffect(this, { x: 100, y: 100 }, 1000, 1);
						effects.healingHitEffect(this, { x: 200, y: 200 }, 1000, 1);
					},
					repeat: -1
				})
			} else if (effect === "impacteffect") {
				this.time.addEvent({
					delay: 1200,
					callback: () => {
						effects.impactEffect({ scene: this, location: { x: 100, y: 100 }, pointA: { x: 100, y: 100 }, pointB: { x: 400, y: 100 }, speed: 1 });
						effects.impactEffect({ scene: this, location: { x: 200, y: 200 }, pointA: { x: 200, y: 200 }, pointB: { x: 400, y: 400 }, speed: 1 });
					},
					repeat: -1
				})
			} else if (effect === "summoneffect") {
				this.time.addEvent({
					delay: 1200,
					callback: () => {
						effects.summonEffect(this, { x: 100, y: 100 });
						effects.summonEffect(this, { x: 200, y: 200 });
					},
					repeat: -1
				})
			} else if (effect === "explodeeffect") {
				this.time.addEvent({
					delay: 2500,
					callback: () => {
						effects.explodeEffect(this, 1, { x: 100, y: 100 });
						effects.explodeEffect(this, 1, { x: 400, y: 400 });
					},
					repeat: -1
				})
			}
		}
	}
}