import * as io from "@PhaserIO";
import Phaser from "phaser";

// Fragment shader: sine-wave nebula clouds with varying amplitude
const fragShader = `
precision mediump float;

uniform float time;
uniform vec2 resolution;
uniform float intensity;
varying vec2 fragCoord;

// Rotate a 2D vector by angle a
mat2 rot(float a){
	float c = cos(a), s = sin(a);
	return mat2(c,-s,s,c);
}

void main(){
	// Normalized coordinates, centered and aspect-corrected
	vec2 uv = fragCoord.xy / resolution;
	vec2 p = uv - 0.5;
	p.x *= resolution.x / resolution.y;

	// Scale the domain slightly for more detail inside button bounds
	p *= 1.3;

	// Project onto a few angled directions to make interference bands
	float d1 = dot(p, normalize(vec2( 1.0, 0.32)));
	float d2 = dot(p, normalize(vec2(-0.6, 1.00)));
	float d3 = p.y;

	// Time scalars
	float t = time;

	// Band patterns using absolute sine (soft stripes)
	float b1 = 1.0 - abs(sin(d1 * 10.0 + t * 0.70));
	float b2 = 1.0 - abs(sin(d2 * 8.0  - t * 0.55));
	float b3 = 1.0 - abs(sin(d3 * 6.0  + t * 0.35));

	// Varying amplitude field (slowly shifting)
	float amp = 0.7
			  + 0.3 * sin(p.x * 2.5 + t * 0.25)
			  + 0.25 * sin(p.y * 2.0 - t * 0.22)
			  + 0.15 * sin((p.x + p.y) * 1.6 + t * 0.18);
	amp = clamp(amp, 0.25, 1.6);

	// Combine bands to form nebula density, then apply amplitude and shaping
	float bands = (b1 * 0.9 + b2 * 0.8 + b3 * 0.7) / 2.4;
	float density = pow(clamp(bands * amp, 0.0, 1.0), 1.35);

	// Subtle large-scale drift to avoid static look
	float drift = 0.5 + 0.5 * sin(d1 * 2.0 + t * 0.15);
	density = clamp(mix(density, density * (0.8 + 0.4 * drift), 0.4), 0.0, 1.0);

	// Color palette: purple -> magenta -> cyan
	vec3 colA = vec3(0.45, 0.15, 0.85);
	vec3 colB = vec3(0.80, 0.20, 0.95);
	vec3 colC = vec3(0.10, 0.85, 1.00);

	// Hue sweep across space and time
	float hueT = 0.5 + 0.5 * sin(t * 0.6 + d2 * 3.0);
	vec3 baseCol = mix(colA, colB, hueT);
	baseCol = mix(baseCol, colC, smoothstep(0.4, 1.0, density));

	// Final color and alpha
	vec3 color = baseCol * density * intensity;
	float alpha = clamp(density * 0.95, 0.0, 1.0);
	gl_FragColor = vec4(color, alpha);
}
`;

export type MagicOverlayHandle = {
	shader: Phaser.GameObjects.Shader;
	setIntensity: (v: number) => void;
};

export function createMagicButtonOverlay(position: Vec2, size: Size): MagicOverlayHandle {
	const { width, height } = size;

	const shader = io.Shader(fragShader, position, size, [
		{ key: "time", type: "1f", value: 0 },
		{ key: "resolution", type: "2f", value: [width, height] },
		{ key: "intensity", type: "1f", value: 0.6 },
	]);

	io.Centralize(shader);

	io.OnUpdate(shader, (t) => {
		io.SetUniform(shader, "time.value", t);
	});

	const setIntensity = (v: number) => {
		io.SetUniform(shader, "intensity.value", v);
	};

	return { shader, setIntensity };
}
