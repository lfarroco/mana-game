import type { Element, ManaFC, ManaMsg } from '../index';
import { useScene } from '../index';
import type * as Phaser from 'phaser';
import { colorPresets } from '../../constants/colorPresets';
import { getOption } from '@Models/OptionsStore';

export type ManaCloudsBackgroundProps = {
	id?: string;
	x: number;
	y: number;
	width: number;
	height: number;
	preset?: keyof typeof colorPresets;
	depth?: number;
	alpha?: number;
	timeScale?: number;
};

export type ManaCloudsBackgroundHandle = {
	updateParticleQuality: () => void;
	destroy: () => void;
};

const getParticleQualityValue = (): number => {
	const particles = getOption('particles');
	switch (particles) {
		case 'low':
			return 0.0;
		case 'high':
			return 2.0;
		case 'medium':
		default:
			return 1.0;
	}
};

const cloudsBackgroundShaderSource = `
precision mediump float;

uniform float time;
uniform vec2 resolution;
uniform vec3 color1;
uniform vec3 color2;
uniform vec3 color3;
uniform vec3 color4;
uniform vec3 color5;
uniform float timeScale;
uniform float particleQuality;
uniform float pixelSize;
uniform float cloudContrast;
uniform float cloudSoftness;
uniform vec2 cameraOffset;
uniform float starTwinkle;
uniform float exposure;
uniform float timeOfDay;
uniform vec3 dustColor;
uniform float gamma;
uniform float ditherAmount;
varying vec2 fragCoord;

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
    float a = hash12(p);
    float b = hash12(p + a + 19.19);
    return vec2(a, b);
}

vec2 pixelate(vec2 uv, float pixelSize) {
    if (pixelSize <= 1.0) {
        return uv;
    }
    vec2 pixelCoord = floor(uv * resolution.xy / pixelSize) * pixelSize / resolution.xy;
    return pixelCoord;
}

float smoothNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash12(i);
    float b = hash12(i + vec2(1.0, 0.0));
    float c = hash12(i + vec2(0.0, 1.0));
    float d = hash12(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

vec3 starField(vec2 uv, float density, float brightness) {
    vec2 starUV = uv;
    if (pixelSize > 1.0) {
        starUV = pixelate(uv, pixelSize * 0.5);
    }
    vec2 gridUV = starUV * density;
    vec2 gridID = floor(gridUV);
    vec2 gridLocal = fract(gridUV);
    float starNoise = hash12(gridID);
    float starThreshold = 0.97;
    if (starNoise < starThreshold) {
        return vec3(0.0);
    }
    vec2 d12 = hash22(gridID + starNoise);
    float derivedNoise1 = d12.x;
    float derivedNoise2 = d12.y;
    float derivedNoise3 = hash12(gridID + 7.7);
    float derivedNoise4 = hash12(gridID + 13.3);
    vec2 starOffset = vec2(derivedNoise1, derivedNoise2) * 0.8 + 0.1;
    if (pixelSize > 1.0) {
        starOffset = floor(starOffset * 4.0) / 4.0;
    }
    float dist = length(gridLocal - starOffset);
    float starSize = (derivedNoise3 * 0.2 + 0.3) * 0.08 + 0.02;
    float star;
    if (pixelSize > 1.0) {
        star = step(dist, starSize);
    } else {
        star = 1.0 - smoothstep(0.0, starSize, dist);
        star = pow(star, 2.0);
    }
    float phase = starNoise * 6.28318;
    float glowSpeed = 0.15 + derivedNoise4 * 0.4;
    float timeOffset = derivedNoise1 * 100.0;
    float glow = sin((time * timeScale * glowSpeed) + phase + timeOffset) * 0.5 + 0.5;
    float glowIntensity = derivedNoise2 * 0.3 + 0.2;
    glow = mix(0.2, 0.6, pow(glow, 2.0 - glowIntensity));
    star *= glow * brightness;
    float hueSeed = fract(starNoise + derivedNoise3 * 0.37);
    vec3 warmColor = vec3(1.0, 0.94, 0.85);
    vec3 coolColor = vec3(0.78, 0.88, 1.0);
    vec3 starTint = mix(warmColor, coolColor, hueSeed);
    float twinklePhase = derivedNoise4 * 10.0 + time * timeScale * (0.5 + derivedNoise2);
    float twinkleMod = mix(1.0, 1.0 + starTwinkle * 0.6, pow(sin(twinklePhase) * 0.5 + 0.5, 2.0));
    return starTint * star * twinkleMod;
}

float squareClouds(vec2 uv, float scale, float threshold) {
    vec2 gridUV = uv * scale;
    vec2 gridID = floor(gridUV);
    float cloudNoise = hash12(gridID);
    float cloudPresence = step(threshold, cloudNoise);
    float cloudDensity = fract(cloudNoise * 7.531) * 0.3 + 0.7;
    return cloudPresence * cloudDensity;
}

float animatedSquareClouds(vec2 uv, float scale, float threshold, float time, vec2 velocity) {
    vec2 animatedUV = uv + velocity * time;
    float clouds = squareClouds(animatedUV, scale, threshold);
    vec2 gridID = floor(animatedUV * scale);
    float timeVariation = sin(time * 0.2 + hash12(gridID) * 6.28318) * 0.2 + 0.8;
    timeVariation = smoothstep(0.4, 0.9, timeVariation);
    return clouds * timeVariation;
}

float dustParticles(vec2 uv, float scaledTime) {
    vec2 dustUV = uv;
    if (pixelSize > 1.0) {
        dustUV = pixelate(uv, pixelSize * 1.5);
    }
    float threshold1 = 0.96 - (particleQuality * 0.01);
    float threshold2 = 0.98 - (particleQuality * 0.01);
    float densityMultiplier = 0.5 + (particleQuality * 0.15);
    vec2 dustUV1 = dustUV * (15.0 * densityMultiplier);
    vec2 dustUV2 = dustUV * (8.0 * densityMultiplier);
    dustUV1 += vec2(scaledTime * 0.04, scaledTime * 0.03);
    dustUV2 += vec2(scaledTime * 0.03, scaledTime * 0.025);
    float dust = 0.0;
    vec2 gridID1 = floor(dustUV1);
    vec2 gridLocal1 = fract(dustUV1);
    float dustNoise1 = hash12(gridID1);
    if (dustNoise1 > threshold1) {
        vec2 derived = hash22(gridID1 + dustNoise1);
        float derived1 = derived.x;
        float derived2 = derived.y;
        float derived3 = hash12(gridID1 + 5.5);
        vec2 dustOffset1 = vec2(derived1, derived2) * 0.4 + 0.3;
        if (pixelSize > 1.0) {
            dustOffset1 = floor(dustOffset1 * 2.0) / 2.0;
        }
        float dist1 = length(gridLocal1 - dustOffset1);
        float particleSize1 = (derived3 * 0.2 + 0.4) * 0.08;
        float particle1;
        if (pixelSize > 1.0) {
            particle1 = step(dist1, particleSize1);
        } else {
            particle1 = 1.0 - smoothstep(0.0, particleSize1, dist1);
            particle1 = pow(particle1, 1.5);
        }
        float phase1 = dustNoise1 * 6.28318;
        float glowSpeed1 = 0.8 + derived1 * 0.6;
        float timeOffset1 = derived2 * 30.0;
        float glow1 = sin((scaledTime * glowSpeed1) + phase1 + timeOffset1) * 0.3 + 0.7;
        dust += particle1 * glow1 * 0.4;
    }
    vec2 gridID2 = floor(dustUV2);
    vec2 gridLocal2 = fract(dustUV2);
    float dustNoise2 = hash12(gridID2);
    if (dustNoise2 > threshold2) {
        vec2 derivedb = hash22(gridID2 + dustNoise2 + 1.0);
        float derived4 = derivedb.x;
        float derived5 = derivedb.y;
        float derived6 = hash12(gridID2 + 9.9);
        vec2 dustOffset2 = vec2(derived4, derived5) * 0.4 + 0.3;
        if (pixelSize > 1.0) {
            dustOffset2 = floor(dustOffset2 * 2.0) / 2.0;
        }
        float dist2 = length(gridLocal2 - dustOffset2);
        float particleSize2 = (derived6 * 0.2 + 0.4) * 0.12;
        float particle2;
        if (pixelSize > 1.0) {
            particle2 = step(dist2, particleSize2);
        } else {
            particle2 = 1.0 - smoothstep(0.0, particleSize2, dist2);
            particle2 = pow(particle2, 1.3);
        }
        float phase2 = dustNoise2 * 6.28318;
        float glowSpeed2 = 0.6 + derived4 * 0.4;
        float timeOffset2 = derived5 * 30.0;
        float glow2 = sin((scaledTime * glowSpeed2) + phase2 + timeOffset2) * 0.2 + 0.8;
        dust += particle2 * glow2 * 0.6;
    }
    return clamp(dust, 0.0, 1.0);
}

void main() {
    vec2 uv = fragCoord.xy / resolution.xy;
    uv.x *= resolution.x / resolution.y;
    uv += cameraOffset * 0.0005;
    float effectivePixelSize = max(pixelSize, 0.0);
    float px = step(1.0, effectivePixelSize);
    float pixelFactor = clamp((effectivePixelSize - 1.0) / 7.0, 0.0, 1.0) * px;
    vec2 lowResUV = pixelate(uv, mix(1.0, effectivePixelSize, px));
    vec2 pixelatedUV = mix(uv, lowResUV, pixelFactor);
    float scaledTime = time * timeScale;
    float largeClouds = animatedSquareClouds(uv, 8.0, 0.6, scaledTime, vec2(0.02, 0.015));
    float mediumClouds = animatedSquareClouds(uv, 16.0, 0.65, scaledTime, vec2(-0.025, 0.02));
    float smallClouds = animatedSquareClouds(uv, 32.0, 0.7, scaledTime, vec2(0.03, -0.018));
    float cloudPattern = largeClouds * 0.6 + mediumClouds * 0.3 + smallClouds * 0.2;
    cloudPattern = mix(cloudPattern, floor(cloudPattern * 6.0) / 6.0, px);
    float glow = largeClouds * 0.2 + mediumClouds * 0.15;
    glow = mix(glow, floor(glow * 3.0) / 3.0, px);
    vec2 colorUV = mix(uv, pixelatedUV, px);
    float colorVar = sin(colorUV.x * 2.0) * cos(colorUV.y * 1.5) * 0.1;
    colorVar = mix(colorVar, floor(colorVar * 2.0) / 2.0, px);
    float vertical = clamp(uv.y, 0.0, 1.0);
    float verticalPow = pow(vertical, 1.1 + cloudSoftness * 2.0);
    float starDensityMultiplier = 0.7 + (particleQuality * 0.2);
    vec3 stars = vec3(0.0);
    stars = starField(uv, 15.0 * starDensityMultiplier, 0.8);
    if (particleQuality >= 0.5) {
        stars += starField(uv + 0.5, 10.0 * starDensityMultiplier, 0.5);
    }
    if (particleQuality >= 1.5) {
        stars += starField(uv + 0.25, 12.0 * starDensityMultiplier, 0.3);
    }
    stars = clamp(stars, 0.0, 1.0);
    float dust = 0.0;
    if (particleQuality >= 0.5) {
        dust = dustParticles(uv, scaledTime);
    }
    vec3 nebulaColor = mix(color1, color2, cloudPattern);
    nebulaColor = mix(nebulaColor, color3, smoothstep(0.4, 0.8, cloudPattern));
    nebulaColor = mix(nebulaColor, color4, colorVar * 0.2);
    nebulaColor = mix(nebulaColor, color5, smoothstep(0.7, 0.95, cloudPattern) * 0.4);
    nebulaColor += vec3(0.08, 0.04, 0.09) * pow(glow, 3.0);
    vec3 dustCol = dustColor;
    if (dot(dustCol, dustCol) < 1e-5) {
        dustCol = vec3(1.0, 0.8, 0.4);
    }
    nebulaColor += dustCol * dust * 0.3;
    float globalTwinkle = mix(1.0, 1.0 + starTwinkle * 0.2, hash12(floor(uv * 64.0)));
    nebulaColor += stars * 0.6 * globalTwinkle;
    vec3 dayTint = mix(vec3(1.0, 0.95, 0.9), vec3(0.6, 0.7, 1.0), timeOfDay);
    float safeExposure = (abs(exposure) < 1e-5) ? 1.0 : exposure;
    nebulaColor = nebulaColor * dayTint * safeExposure;
    if (ditherAmount > 0.0) {
        float d = (hash12(floor(fragCoord.xy)) - 0.5) * (ditherAmount / 255.0);
        nebulaColor += d;
    }
    float g = (gamma > 0.0) ? gamma : 1.0;
    if (abs(g - 1.0) > 1e-4) {
        nebulaColor = pow(max(nebulaColor, 0.0), vec3(1.0 / g));
    }
    gl_FragColor = vec4(nebulaColor, 1.0);
}
`;

export const ManaCloudsBackgroundApp: ManaFC<ManaCloudsBackgroundProps, ManaMsg> = ({
	id = 'mana-clouds-background',
	x,
	y,
	width,
	height,
	preset = 'nebula',
	depth = -1000,
	alpha = 1,
	timeScale = 1,
}) => {
	const scene = useScene();
	const presetColors = colorPresets[preset];

	const uniforms = {
		color1: presetColors.color1,
		color2: presetColors.color2,
		color3: presetColors.color3,
		color4: presetColors.color4,
		color5: presetColors.color5,
		timeScale,
		particleQuality: getParticleQualityValue(),
		resolution: { x: width, y: height },
	};

	const element: Element<ManaMsg> = {
		id,
		type: 'shader',
		x,
		y,
		width,
		height,
		fragmentShader: cloudsBackgroundShaderSource,
		uniforms,
		origin: { x: 0.5, y: 0.5 },
		alpha,
		onMount: (gameObject) => {
			const shader = gameObject as Phaser.GameObjects.Shader;
			shader.setDepth(depth);
			shader.setSize(width, height);
			(shader as any).alpha = alpha;

			const sceneWithBackground = scene as Phaser.Scene & {
				cloudsBackground?: ManaCloudsBackgroundHandle;
			};

			let destroyed = false;
			const handle: ManaCloudsBackgroundHandle = {
				updateParticleQuality: () => {
					if (destroyed) return;
					shader.setUniform('particleQuality.value', getParticleQualityValue());
				},
				destroy: () => {
					if (destroyed) return;
					destroyed = true;
					if (sceneWithBackground.cloudsBackground === handle) {
						delete sceneWithBackground.cloudsBackground;
					}
					if (shader.scene) {
						shader.destroy();
					}
				},
			};

			if (sceneWithBackground.cloudsBackground && sceneWithBackground.cloudsBackground !== handle) {
				sceneWithBackground.cloudsBackground.destroy();
			}
			sceneWithBackground.cloudsBackground = handle;
			handle.updateParticleQuality();

			shader.once('destroy', () => {
				if (!destroyed) {
					destroyed = true;
				}
				if (sceneWithBackground.cloudsBackground === handle) {
					delete sceneWithBackground.cloudsBackground;
				}
			});
		},
	};

	return [element];
};
