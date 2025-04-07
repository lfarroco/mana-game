import Phaser from "phaser";

export type BeamOptions = {
	start: { x: number; y: number };
	end: { x: number; y: number };
	segments?: number;
	amplitude?: number;
	frequency?: number;
	speed?: number;
	color?: number;
	thickness?: number;
}

export class EnergyBeam extends Phaser.GameObjects.Graphics {

	start: { x: number; y: number; };
	end: { x: number; y: number; };
	segments: number;
	amplitude: number;
	frequency: number;
	speed: number;
	color: number;
	thickness: number;
	phase: number;
	points: Phaser.Math.Vector2[];

	constructor(scene: Phaser.Scene, config: BeamOptions & Phaser.Types.GameObjects.Graphics.Options) {
		super(scene, config);
		scene.add.existing(this);

		this.setBlendMode(Phaser.BlendModes.ADD);

		// Configuration
		this.start = config.start;
		this.end = config.end;
		this.segments = config?.segments || 40;
		this.amplitude = config?.amplitude || 15;
		this.frequency = config?.frequency || 2;
		this.speed = config?.speed || 0.05;
		this.color = config?.color || 0xFFD700;
		this.thickness = config?.thickness || 20;

		// Internal state
		this.phase = 0;
		this.points = [];
	}

	updateBeam() {
		this.clear();

		// const hueShift = (Math.sin(this.phase) + 1) * 0.1;
		// this.color = Phaser.Display.Color.HSLToColor(hueShift, 1, 0.5).color;
		// Calculate beam vector
		const vec = new Phaser.Math.Vector2(
			this.end.x - this.start.x,
			this.end.y - this.start.y
		);

		// Normalize and get perpendicular vector
		const normalized = vec.clone().normalize();
		const normal = new Phaser.Math.Vector2(-normalized.y, normalized.x);

		// Generate points along the beam with sine wave offset
		this.points = [];
		for (let i = 0; i <= this.segments; i++) {
			const t = i / this.segments;
			const wave = Math.sin(t * Math.PI * this.frequency + this.phase);

			// Calculate position using original vector direction
			const basePos = new Phaser.Math.Vector2(this.start.x, this.start.y)
				.add(vec.clone().scale(t));

			const offset = normal.clone().scale(wave * this.amplitude);
			const pos = basePos.add(offset);

			this.points.push(pos);
		}

		// Draw the beam
		this.lineStyle(this.thickness, this.color, 0.8);
		this.beginPath();
		this.moveTo(this.points[0].x, this.points[0].y);

		for (let i = 1; i < this.points.length; i++) {
			this.lineTo(this.points[i].x, this.points[i].y);
		}

		this.strokePath();

		// Update phase for animation
		this.phase += this.speed;

	}
}

