export class AuraPipeline extends Phaser.Renderer.WebGL.Pipelines.SinglePipeline {
	center: { x: number; y: number; };
	constructor(game: Phaser.Game) {
		super({
			game,
			fragShader: `
			precision mediump float;

uniform vec2 resolution;
uniform vec2 center;
uniform float time;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - center) / resolution.y;
    float dist = length(uv);

    // Wiggly smoke using noise
    float n = noise(uv * 3.0 + vec2(time * 0.3, time * 0.4));
    n += noise(uv * 6.0 + vec2(time * 0.5, -time * 0.3)) * 0.5;

    float smoke = smoothstep(0.5, 0.3, dist) * n;

    vec3 color = mix(vec3(0.0), vec3(0.5, 0.8, 1.0), smoke);
    gl_FragColor = vec4(color, smoke * 0.7);
}
	`
		});

		this.center = { x: 0, y: 0 };
	}

	setUniform(name: string, value: any) {
		const pipeline = (this.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).pipelines.get(this);
		if (typeof value === 'number') {
			pipeline.set1f(name, value);
		} else if (Array.isArray(value) && value.length === 2) {
			pipeline.set2f(name, value[0], value[1]);
		}
	}

	setCenter(x: number, y: number) {
		this.setUniform('center', [x, y]);
	}

	setResolution(width: number, height: number) {
		this.setUniform('resolution', [width, height]);
	}

	updateTime(time: number) {
		this.setUniform('time', time);
	}
}