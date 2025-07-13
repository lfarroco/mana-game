export const cloudsBackgroundShader = `
precision mediump float;

uniform float time;
uniform vec2 resolution;
varying vec2 fragCoord;

// Noise function for procedural generation
float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// Smooth noise function
float smoothNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    
    // Four corners in 2D of a tile
    float a = noise(i);
    float b = noise(i + vec2(1.0, 0.0));
    float c = noise(i + vec2(0.0, 1.0));
    float d = noise(i + vec2(1.0, 1.0));
    
    // Smooth interpolation
    vec2 u = f * f * (3.0 - 2.0 * f);
    
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// Fractal Brownian Motion for cloud-like patterns
float fbm(vec2 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        value += amplitude * smoothNoise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    
    return value;
}

// Function to create swirling patterns
vec2 swirl(vec2 uv, float intensity, vec2 center) {
    vec2 delta = uv - center;
    float dist = length(delta);
    float angle = atan(delta.y, delta.x);
    
    // Create swirl effect
    angle += intensity * sin(time * 0.5) * (1.0 - dist);
    
    return center + dist * vec2(cos(angle), sin(angle));
}

void main() {
    // Normalize coordinates
    vec2 uv = fragCoord.xy / resolution.xy;
    
    // Adjust for aspect ratio
    uv.x *= resolution.x / resolution.y;
    
    // Animate the coordinates
    vec2 animatedUV = uv;
    animatedUV += vec2(time * 0.02, time * 0.01);
    
    // Create multiple swirl centers
    vec2 swirl1 = swirl(animatedUV, 0.3, vec2(0.3, 0.7));
    vec2 swirl2 = swirl(animatedUV, -0.2, vec2(0.8, 0.3));
    vec2 swirl3 = swirl(animatedUV, 0.4, vec2(0.5, 0.1));
    
    // Generate cloud patterns using FBM
    float clouds1 = fbm(swirl1 * 3.0 + time * 0.1, 6);
    float clouds2 = fbm(swirl2 * 2.5 + time * 0.05, 5);
    float clouds3 = fbm(swirl3 * 4.0 + time * 0.08, 4);
    
    // Combine cloud layers
    float cloudPattern = clouds1 * 0.5 + clouds2 * 0.3 + clouds3 * 0.2;
    
    // Create depth with different cloud layers
    float depth1 = fbm(uv * 1.5 + time * 0.03, 3);
    float depth2 = fbm(uv * 2.8 + time * 0.02, 4);
    
    // Combine all patterns
    float finalClouds = cloudPattern + depth1 * 0.4 + depth2 * 0.3;
    
    // Add some subtle color variation
    float colorVariation = fbm(uv * 6.0 + time * 0.15, 3);
    
    // Create a mystical color palette
    vec3 deepBlue = vec3(0.05, 0.1, 0.25);
    vec3 mediumBlue = vec3(0.1, 0.2, 0.4);
    vec3 lightBlue = vec3(0.2, 0.35, 0.6);
    vec3 purple = vec3(0.15, 0.1, 0.3);
    vec3 gold = vec3(0.4, 0.3, 0.1);
    
    // Mix colors based on cloud density and variation
    vec3 color = mix(deepBlue, mediumBlue, finalClouds);
    color = mix(color, lightBlue, smoothstep(0.4, 0.8, finalClouds));
    color = mix(color, purple, colorVariation * 0.3);
    
    // Add some golden highlights in dense cloud areas
    color = mix(color, gold, smoothstep(0.7, 1.0, finalClouds) * colorVariation);
    
    // Add subtle pulsing effect
    float pulse = sin(time * 0.8) * 0.1 + 0.9;
    color *= pulse;
    
    // Add vignette effect
    float vignette = 1.0 - length(uv - vec2(0.5 * resolution.x / resolution.y, 0.5)) * 0.5;
    color *= vignette;
    
    gl_FragColor = vec4(color, 1.0);
}
`;
