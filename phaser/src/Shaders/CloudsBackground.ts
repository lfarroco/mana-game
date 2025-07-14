export const cloudsBackgroundShader = `
precision mediump float;

uniform float time;
uniform vec2 resolution;
uniform vec3 color1;
uniform vec3 color2;
uniform vec3 color3;
uniform vec3 color4;
uniform vec3 color5;
uniform float timeScale;
varying vec2 fragCoord;

// Noise function for procedural generation
float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// Smooth noise function
float smoothNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = noise(i);
    float b = noise(i + vec2(1.0, 0.0));
    float c = noise(i + vec2(0.0, 1.0));
    float d = noise(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// Star field function
float starField(vec2 uv, float density, float brightness) {
    float star = pow(noise(uv * density + time * timeScale * 0.05), 40.0) * brightness;
    return star;
}

// Animated dust particles function
float dustParticles(vec2 uv, float scaledTime) {
    float dust = 0.0;
    
    // Multiple layers of dust with different speeds and scales
    vec2 dustUV1 = uv * 15.0 + vec2(scaledTime * 0.02, scaledTime * 0.015);
    vec2 dustUV2 = uv * 25.0 + vec2(scaledTime * -0.01, scaledTime * 0.03);
    vec2 dustUV3 = uv * 40.0 + vec2(scaledTime * 0.025, scaledTime * -0.02);
    
    // Create floating dust particles
    dust += pow(noise(dustUV1), 15.0) * 0.4;
    dust += pow(noise(dustUV2), 20.0) * 0.3;
    dust += pow(noise(dustUV3), 25.0) * 0.2;
    
    // Add some larger, slower moving dust clouds
    vec2 cloudDustUV = uv * 8.0 + vec2(scaledTime * 0.005, scaledTime * 0.008);
    dust += smoothstep(0.6, 0.8, noise(cloudDustUV)) * 0.15;
    
    return clamp(dust, 0.0, 1.0);
}

// Fractal Brownian Motion for nebula-like patterns
float fbm(vec2 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        value += amplitude * smoothNoise(p * frequency);
        amplitude *= 0.6; // More persistence for wispier look
        frequency *= 2.1; // Slightly more frequency for detail
    }
    return value;
}

// Function to create swirling patterns
vec2 swirl(vec2 uv, float intensity, vec2 center) {
    vec2 delta = uv - center;
    float dist = length(delta);
    float angle = atan(delta.y, delta.x);
    
    // Create swirl effect using scaled time
    angle += intensity * sin(time * timeScale * 0.5) * (1.0 - dist);
    
    return center + dist * vec2(cos(angle), sin(angle));
}

void main() {
    // Normalize coordinates
    vec2 uv = fragCoord.xy / resolution.xy;
    uv.x *= resolution.x / resolution.y;

    // Apply time scaling to all time-based animations
    float scaledTime = time * timeScale;

    // Animate the coordinates
    vec2 animatedUV = uv;
    animatedUV += vec2(scaledTime * 0.01, scaledTime * 0.008);

    // Swirl and warp for nebula shapes
    vec2 swirl1 = swirl(animatedUV, 0.5, vec2(0.4, 0.7));
    vec2 swirl2 = swirl(animatedUV, -0.4, vec2(0.7, 0.3));
    vec2 swirl3 = swirl(animatedUV, 0.7, vec2(0.5, 0.2));

    // Nebula noise layers
    float nebula1 = fbm(swirl1 * 3.5 + scaledTime * 0.12, 7);
    float nebula2 = fbm(swirl2 * 2.7 + scaledTime * 0.07, 6);
    float nebula3 = fbm(swirl3 * 4.2 + scaledTime * 0.09, 5);

    // Combine nebula layers for depth
    float nebulaPattern = nebula1 * 0.5 + nebula2 * 0.35 + nebula3 * 0.25;

    // Add more depth and glow
    float glow1 = fbm(uv * 2.0 + scaledTime * 0.04, 4);
    float glow2 = fbm(uv * 3.5 + scaledTime * 0.03, 5);
    float glow = glow1 * 0.5 + glow2 * 0.5;

    // Color variation for nebula
    float colorVar = fbm(uv * 7.0 + scaledTime * 0.18, 4);

    // Star field
    float stars = starField(uv, 120.0, 1.2) + starField(uv + 0.1, 80.0, 0.7);
    stars += starField(uv + 0.25, 200.0, 0.8);
    stars = clamp(stars, 0.0, 1.0);

    // Dust particles
    float dust = dustParticles(uv, scaledTime);

    // Mix nebula colors (use more vibrant, cosmic colors)
    vec3 nebulaColor = mix(color1, color2, nebulaPattern);
    nebulaColor = mix(nebulaColor, color3, smoothstep(0.5, 0.8, nebulaPattern));
    nebulaColor = mix(nebulaColor, color4, colorVar * 0.5);
    nebulaColor = mix(nebulaColor, color5, smoothstep(0.7, 0.95, nebulaPattern) * 0.7);

    // Add glow
    nebulaColor += vec3(0.15, 0.08, 0.18) * pow(glow, 2.0);

    // Add dust particles with warm color tint
    vec3 dustColor = mix(vec3(0.8, 0.6, 0.4), vec3(1.0, 0.8, 0.6), dust);
    nebulaColor = mix(nebulaColor, dustColor, dust * 0.3);

    // Add stars (white, with a slight blue tint)
    vec3 starColor = mix(vec3(1.0, 1.0, 1.0), vec3(0.7, 0.8, 1.0), 0.3);
    nebulaColor = mix(nebulaColor, starColor, stars);

    // Final output
    gl_FragColor = vec4(nebulaColor, 1.0);
}
`;
