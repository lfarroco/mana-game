
import * as effects from "../Effects"

export class DebugScene extends Phaser.Scene {

	constructor() {
		super('DebugScene');
	}

	preload() {
		this.load.image("tilesets/tileset", "assets/tilesets/tileset.png");
		this.load.image("cursor", "assets/ui/selected_cursor.png");
		this.load.image("light", "assets/fx/light.png");
		this.load.image("beam", "assets/fx/beam.png");
		this.load.image("white-dot", "assets/fx/white-dot.png");
		this.load.image("light-pillar", "assets/fx/light-pillar.png");
		this.load.image("damage_display", "assets/ui/damage_display.png");
	}

	create() {

		const urlParams = new URLSearchParams(window.location.search);
		const effect = urlParams.get('EFFECT')?.toLowerCase();

		if (effect) {

			if (effect === "criticalDamageDisplay") {
				this.time.addEvent({
					delay: 1200,
					callback: () => {
						effects.criticalDamageDisplay(this, { x: 200, y: 200 }, 33, 1);
					},
					repeat: -1
				})
			} else if (effect === "EnergyBeam") {
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
			} else if (effect === "fireballEffect") {
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
			}
		}
	}
}