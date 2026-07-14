import Phaser from "phaser";

export type BeamOptions = {
	start: Vec2;
	end: Vec2;
	segments?: number;
	amplitude?: number;
	frequency?: number;
	speed?: number;
	color?: number;
	thickness?: number;
};

export class EnergyBeam extends Phaser.GameObjects.Graphics {
	start: Vec2;
	end: Vec2;
	segments: number;
	amplitude: number;
	frequency: number;
	speed: number;
	color: number;
	thickness: number;
	phase: number;
	points: Phaser.Math.Vector2[];

	constructor(
		config: BeamOptions & Phaser.Types.GameObjects.Graphics.Options
	) {
		super(io.scene, config);
		io.scene.add.existing(this);

		this.setBlendMode(Phaser.BlendModes.ADD);

		this.start = config.start;
		this.end = config.end;
		this.segments = config?.segments || 40;
		this.amplitude = config?.amplitude || 15;
		this.frequency = config?.frequency || 2;
		this.speed = config?.speed || 0.05;
		this.color = config?.color || 0xffd700;
		this.thickness = config?.thickness || 20;

		this.phase = 0;
		this.points = [];
	}

	updateBeam() {
		this.clear();

		const vec = new Phaser.Math.Vector2(this.end[0] - this.start[0], this.end[1] - this.start[1]);

		const normalized = vec.clone().normalize();
		const normal = new Phaser.Math.Vector2(-normalized.y, normalized.x);

		this.points = [];
		for (let i = 0; i <= this.segments; i++) {
			const t = i / this.segments;
			const wave = Math.sin(t * Math.PI * this.frequency + this.phase);

			const basePos = new Phaser.Math.Vector2(this.start[0], this.start[1]).add(vec.clone().scale(t));

			const offset = normal.clone().scale(wave * this.amplitude);
			const pos = basePos.add(offset);

			this.points.push(pos);
		}

		this.lineStyle(this.thickness, this.color, 0.8);
		this.beginPath();
		this.moveTo(this.points[0].x, this.points[0].y);

		for (let i = 1; i < this.points.length; i++) {
			this.lineTo(this.points[i].x, this.points[i].y);
		}

		this.strokePath();

		this.phase += this.speed;
	}
}
