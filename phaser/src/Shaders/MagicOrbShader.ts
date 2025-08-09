export const magicOrbFragmentShader = `
precision mediump float;

uniform float time;
uniform vec2 resolution;
uniform vec3 color1;
uniform float intensity;
uniform float speed;

varying vec2 fragCoord;

// Noise function for cloud generation
float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// Square-based cloud function for pixelated block clouds
float squareClouds(vec2 uv, float scale, float threshold, float time, vec2 velocity) {
    // Animate the grid position
    vec2 animatedUV = uv + velocity * time;
    
    // Create a grid of squares
    vec2 gridUV = animatedUV * scale;
    vec2 gridID = floor(gridUV);
    
    // Use noise to determine if each square should be a cloud
    float cloudNoise = noise(gridID);
    
    // Create distinct cloud regions with hard edges - make more visible
    float cloudPresence = step(0.5, cloudNoise); // Lower threshold for more clouds
    
    // Add temporal variation to make clouds fade in/out - more dramatic
    float timeVariation = sin(time * 1.0 + noise(gridID) * 6.28318) * 0.5 + 0.5;
    timeVariation = smoothstep(0.2, 0.9, timeVariation);
    
    return cloudPresence * timeVariation;
}

void main() {
    // Normalize UV coordinates to [0.0, 1.0]
    vec2 uv = fragCoord.xy / resolution;

    // Center UV coordinates around (0.5, 0.5)
    uv -= 0.5;

    // Maintain aspect ratio
    uv.x *= resolution.x / resolution.y;
    
    // Create a simple circle with hard edges
    float dist = length(uv);
    
    // Hard circle boundary - discard pixels outside
    if (dist > 0.4) {
        discard;
    }
    
    // Create outline effect
    float outlineWidth = 0.08; // Width of the outline
    float innerRadius = 0.4 - outlineWidth;
    float outlineStrength = 0.0;
    
    // Check if we're in the outline region
    if (dist > innerRadius) {
        // Create a smooth outline that's brightest at the edge
        float outlineProgress = (dist - innerRadius) / outlineWidth;
        outlineStrength = smoothstep(0.0, 1.0, outlineProgress) * 2.5; // Bright outline
    }
    
    // Create multiple layers of square clouds at different scales and speeds
    float scaledTime = time * speed;
    
    // Large cloud blocks - slow moving, more visible
    float largeClouds = squareClouds(uv, 6.0, 0.4, scaledTime, vec2(0.05, 0.03));
    
    // Medium cloud blocks - medium speed
    float mediumClouds = squareClouds(uv, 12.0, 0.5, scaledTime, vec2(-0.04, 0.06));
    
    // Combine cloud layers - make much more visible
    float cloudPattern = largeClouds * 0.8 + mediumClouds * 0.6;
    
    // Create base color and much brighter cloud color for contrast
    vec3 baseColor = color1 * 0.6; // Darker base
    vec3 cloudColor = color1 * 1.8; // Much brighter clouds
    
    // Mix base color with cloud effect - stronger contrast
    vec3 finalColor = mix(baseColor, cloudColor, cloudPattern);
    
    // Add the bright outline effect
    finalColor += color1 * outlineStrength;
    
    // Apply intensity
    finalColor *= intensity;
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;
