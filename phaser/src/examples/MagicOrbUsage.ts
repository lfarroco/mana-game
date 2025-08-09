import { MagicOrb, MagicOrbFactory } from "../components/MagicOrb/MagicOrb";

// Example of how to add magic orbs to your TitleScene

export class TitleSceneWithMagicOrbs {
	private magicOrbs: MagicOrb[] = [];

	// Add this to your TitleScene's create() method
	createMagicOrbs(scene: Phaser.Scene) {
		// Create different sized orbs with different colors
		const purpleOrb = MagicOrbFactory.createPurpleOrb(scene, 200, 300, 150);
		const blueOrb = MagicOrbFactory.createBlueOrb(scene, 600, 400, 100);
		const redOrb = MagicOrbFactory.createRedOrb(scene, 800, 200, 120);

		// Custom orb with specific properties
		const customOrb = new MagicOrb(scene, 400, 500, {
			size: 80,
			color: [0.8, 0.2, 0.9], // Pink/magenta
			intensity: 1.5,
			speed: 1.5
		});

		// Store references for updates
		this.magicOrbs = [purpleOrb, blueOrb, redOrb, customOrb];

		// Set depths so orbs appear behind UI elements
		this.magicOrbs.forEach((orb, index) => {
			orb.setDepth(-100 + index);
		});
	}

	// Add this to your TitleScene's update() method
	updateMagicOrbs(time: number) {
		this.magicOrbs.forEach(orb => {
			orb.update(time);
		});
	}

	// Example of dynamic orb manipulation
	animateOrbProperties() {
		if (this.magicOrbs.length > 0) {
			const orb = this.magicOrbs[0];

			// Gradually change color over time
			const hue = (Date.now() / 2000) % 1;
			const r = Math.sin(hue * Math.PI * 2) * 0.5 + 0.5;
			const g = Math.sin((hue + 0.33) * Math.PI * 2) * 0.5 + 0.5;
			const b = Math.sin((hue + 0.66) * Math.PI * 2) * 0.5 + 0.5;

			orb.setOrbColor(r, g, b);

			// Pulse intensity
			const intensity = Math.sin(Date.now() / 1000) * 0.5 + 1.0;
			orb.setIntensity(intensity);
		}
	}

	// Clean up orbs when scene is destroyed
	destroyMagicOrbs() {
		this.magicOrbs.forEach(orb => {
			orb.destroy();
		});
		this.magicOrbs = [];
	}
}

// Example integration with your existing TitleScene
/*
In your TitleScene.ts, add these modifications:

1. Import the MagicOrb classes:
import { MagicOrb, MagicOrbFactory } from "../../components/MagicOrb/MagicOrb";

2. Add to your class properties:
private magicOrbs: MagicOrb[] = [];

3. In your create() method, after creating the background:
// Create magic orbs for visual flair
const orb1 = MagicOrbFactory.createPurpleOrb(this, 150, 200, 100);
const orb2 = MagicOrbFactory.createBlueOrb(this, this.scale.width - 150, 300, 80);
const orb3 = new MagicOrb(this, this.scale.width / 2, this.scale.height - 100, {
    size: 60,
    color: [0.9, 0.7, 0.2], // Golden
    intensity: 1.2,
    speed: 0.8
});

this.magicOrbs = [orb1, orb2, orb3];

// Set depths to appear behind UI but in front of background
this.magicOrbs.forEach((orb, index) => {
    orb.setDepth(-50 + index);
});

4. Add an update method to your TitleScene class:
update(time: number) {
    this.magicOrbs.forEach(orb => {
	orb.update(time);
    });
}

5. In your destroy() method:
this.magicOrbs.forEach(orb => {
    orb.destroy();
});
*/
