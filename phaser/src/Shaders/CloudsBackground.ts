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

// Star field function - creates discrete, round stars
float starField(vec2 uv, float density, float brightness) {
    // Create a grid for star positions
    vec2 gridUV = uv * density;
    vec2 gridID = floor(gridUV);
    vec2 gridLocal = fract(gridUV);
    
    // Check if this grid cell should have a star
    float starNoise = noise(gridID);
    float starThreshold = 0.95; // Only 5% of grid cells get stars
    
    if (starNoise < starThreshold) {
        return 0.0; // No star in this cell
    }
    
    // Position the star randomly within the grid cell
    vec2 starOffset = vec2(noise(gridID + 10.0), noise(gridID + 20.0)) * 0.8 + 0.1;
    vec2 starPos = starOffset;
    
    // Calculate distance from current pixel to star center
    float dist = length(gridLocal - starPos);
    
    // Create a round star with smooth falloff
    float starSize = (noise(gridID + 30.0) * 0.3 + 0.4) * 0.1 + 0.03; // Smaller: 0.03 to 0.1 (was 0.05 to 0.2)
    float star = 1.0 - smoothstep(0.0, starSize, dist);
    star = pow(star, 2.0); // Less aggressive falloff for larger visible area
    
    // Enhanced glow up and down effect
    float phase = starNoise * 6.28318; // Random phase offset for each star
    float glowSpeed = 0.2 + noise(gridID + 40.0) * 0.6; // More varied speed: 0.2 to 0.8
    
    // Use gridID to create unique timing for each star
    float timeOffset = noise(gridID + 60.0) * 100.0; // Random time offset per star
    float glow = sin((time * timeScale * glowSpeed) + phase + timeOffset) * 0.5 + 0.5; // 0.0 to 1.0
    
    // Make some stars glow more dramatically than others
    float glowIntensity = noise(gridID + 50.0) * 0.5 + 0.3; // Reduced: 0.3 to 0.8 (was 0.3 to 1.0)
    glow = mix(0.1, 0.8, pow(glow, 2.0 - glowIntensity)); // Reduced max: 0.1 to 0.8 (was 0.1 to 1.2)
    
    star *= glow * brightness;
    
    return star;
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

// Dust particles function - creates golden shining particles that follow cloud motion
float dustParticles(vec2 uv, float scaledTime) {
    // Create multiple layers of dust particles with different densities
    vec2 dustUV1 = uv * 25.0; // Slightly lower density
    vec2 dustUV2 = uv * 18.0; // Lower density
    vec2 dustUV3 = uv * 12.0; // Much lower density for larger particles
    
    // Apply cloud motion to dust particles - much more visible movement
    dustUV1 += vec2(scaledTime * 0.025, scaledTime * 0.02) + fbm(uv * 2.0 + scaledTime * 0.05, 3) * 0.6; // Half speed
    dustUV2 += vec2(scaledTime * 0.02, scaledTime * 0.0175) + fbm(uv * 1.5 + scaledTime * 0.04, 3) * 0.7; // Half speed
    dustUV3 += vec2(scaledTime * 0.0175, scaledTime * 0.015) + fbm(uv * 1.0 + scaledTime * 0.03, 3) * 0.8; // Half speed
    
    float dust = 0.0;
    
    // Layer 1: Small particles
    vec2 gridID1 = floor(dustUV1);
    vec2 gridLocal1 = fract(dustUV1);
    float dustNoise1 = noise(gridID1);
    if (dustNoise1 > 0.88) { // Fewer particles: 12% of cells get particles
        vec2 dustOffset1 = vec2(noise(gridID1 + 10.0), noise(gridID1 + 20.0)) * 0.6 + 0.2;
        float dist1 = length(gridLocal1 - dustOffset1);
        float particleSize1 = (noise(gridID1 + 30.0) * 0.4 + 0.6) * 0.06; // Half size: 0.036 to 0.06
        float particle1 = 1.0 - smoothstep(0.0, particleSize1, dist1);
        particle1 = pow(particle1, 1.2); // Less aggressive falloff for more visibility
        
        // Glow effect similar to stars but faster
        float phase1 = dustNoise1 * 6.28318;
        float glowSpeed1 = 0.8 + noise(gridID1 + 40.0) * 1.2; // Faster glow: 0.8 to 2.0
        float timeOffset1 = noise(gridID1 + 60.0) * 50.0;
        float glow1 = sin((scaledTime * glowSpeed1) + phase1 + timeOffset1) * 0.5 + 0.5;
        float glowIntensity1 = noise(gridID1 + 50.0) * 0.5 + 0.5; // 0.5 to 1.0
        glow1 = mix(0.4, 1.3, pow(glow1, 2.0 - glowIntensity1)); // Brighter glow
        
        dust += particle1 * glow1 * 0.7; // More intensity
    }
    
    // Layer 2: Medium particles
    vec2 gridID2 = floor(dustUV2);
    vec2 gridLocal2 = fract(dustUV2);
    float dustNoise2 = noise(gridID2);
    if (dustNoise2 > 0.90) { // Fewer particles: 10% of cells get particles
        vec2 dustOffset2 = vec2(noise(gridID2 + 10.0), noise(gridID2 + 20.0)) * 0.6 + 0.2;
        float dist2 = length(gridLocal2 - dustOffset2);
        float particleSize2 = (noise(gridID2 + 30.0) * 0.4 + 0.6) * 0.09; // Half size: 0.054 to 0.09
        float particle2 = 1.0 - smoothstep(0.0, particleSize2, dist2);
        particle2 = pow(particle2, 1.2);
        
        float phase2 = dustNoise2 * 6.28318;
        float glowSpeed2 = 0.6 + noise(gridID2 + 40.0) * 1.0;
        float timeOffset2 = noise(gridID2 + 60.0) * 50.0;
        float glow2 = sin((scaledTime * glowSpeed2) + phase2 + timeOffset2) * 0.5 + 0.5;
        float glowIntensity2 = noise(gridID2 + 50.0) * 0.5 + 0.5;
        glow2 = mix(0.3, 1.4, pow(glow2, 2.0 - glowIntensity2)); // Brighter glow
        
        dust += particle2 * glow2 * 0.8; // More intensity
    }
    
    // Layer 3: Larger particles (fewer but more visible)
    vec2 gridID3 = floor(dustUV3);
    vec2 gridLocal3 = fract(dustUV3);
    float dustNoise3 = noise(gridID3);
    if (dustNoise3 > 0.94) { // Much fewer particles: 6% of cells get particles
        vec2 dustOffset3 = vec2(noise(gridID3 + 10.0), noise(gridID3 + 20.0)) * 0.6 + 0.2;
        float dist3 = length(gridLocal3 - dustOffset3);
        float particleSize3 = (noise(gridID3 + 30.0) * 0.4 + 0.6) * 0.125; // Half size: 0.075 to 0.125
        float particle3 = 1.0 - smoothstep(0.0, particleSize3, dist3);
        particle3 = pow(particle3, 1.0); // Even less aggressive falloff
        
        float phase3 = dustNoise3 * 6.28318;
        float glowSpeed3 = 0.4 + noise(gridID3 + 40.0) * 0.8;
        float timeOffset3 = noise(gridID3 + 60.0) * 50.0;
        float glow3 = sin((scaledTime * glowSpeed3) + phase3 + timeOffset3) * 0.5 + 0.5;
        float glowIntensity3 = noise(gridID3 + 50.0) * 0.5 + 0.5;
        glow3 = mix(0.2, 1.5, pow(glow3, 2.0 - glowIntensity3)); // Much brighter glow
        
        dust += particle3 * glow3 * 1.0; // Maximum intensity
    }
    
    return clamp(dust, 0.0, 1.0);
}

void main() {
    // Normalize coordinates
    vec2 uv = fragCoord.xy / resolution.xy;
    uv.x *= resolution.x / resolution.y;

    // Apply time scaling to all time-based animations
    float scaledTime = time * timeScale;

    // Animate the coordinates
    vec2 animatedUV = uv;
    animatedUV += vec2(scaledTime * 0.005, scaledTime * 0.004); // Half speed: was 0.01, 0.008

    // Swirl and warp for nebula shapes
    vec2 swirl1 = swirl(animatedUV, 0.5, vec2(0.4, 0.7));
    vec2 swirl2 = swirl(animatedUV, -0.4, vec2(0.7, 0.3));
    vec2 swirl3 = swirl(animatedUV, 0.7, vec2(0.5, 0.2));

    // Nebula noise layers - Reduced octaves for better performance
    float nebula1 = fbm(swirl1 * 3.5 + scaledTime * 0.06, 5); // Reduced from 7 to 5 octaves
    float nebula2 = fbm(swirl2 * 2.7 + scaledTime * 0.035, 4); // Reduced from 6 to 4 octaves
    float nebula3 = fbm(swirl3 * 4.2 + scaledTime * 0.045, 4); // Reduced from 5 to 4 octaves

    // Combine nebula layers for depth
    float nebulaPattern = nebula1 * 0.5 + nebula2 * 0.35 + nebula3 * 0.25;

    // Add more depth and glow - Reduced octaves for better performance
    float glow1 = fbm(uv * 2.0 + scaledTime * 0.02, 3); // Reduced from 4 to 3 octaves
    float glow2 = fbm(uv * 3.5 + scaledTime * 0.015, 4); // Reduced from 5 to 4 octaves
    float glow = glow1 * 0.5 + glow2 * 0.5;

    // Color variation for nebula
    float colorVar = fbm(uv * 7.0 + scaledTime * 0.09, 4); // Half speed: was 0.18

    // Star field - sparse, discrete stars that don't flicker
    float stars = starField(uv, 20.0, 1.0);        // Main star layer
    stars += starField(uv + 0.5, 15.0, 0.8);       // Secondary layer with offset
    stars += starField(uv + 0.25, 25.0, 0.6);      // Finer stars
    
    // Add a few very bright stars
    float brightStars = starField(uv + 0.75, 8.0, 1.2); // Reduced brightness: was 2.0
    stars += brightStars;
    
    stars = clamp(stars, 0.0, 1.0);

    // Dust particles - golden shining particles that follow cloud motion
    float dust = dustParticles(uv, scaledTime);

    // Mix nebula colors (use more vibrant, cosmic colors)
    vec3 nebulaColor = mix(color1, color2, nebulaPattern);
    nebulaColor = mix(nebulaColor, color3, smoothstep(0.5, 0.8, nebulaPattern));
    nebulaColor = mix(nebulaColor, color4, colorVar * 0.5);
    nebulaColor = mix(nebulaColor, color5, smoothstep(0.7, 0.95, nebulaPattern) * 0.7);

    // Add glow
    nebulaColor += vec3(0.15, 0.08, 0.18) * pow(glow, 2.0);

    // Add golden dust particles
    if (dust > 0.0) {
        vec3 dustColor = vec3(1.0, 0.8, 0.4); // Golden color
        // Use additive blending for more visible particles
        nebulaColor += dustColor * dust * 1.2;
    }

    // Add stars (additive blending)
    if (stars > 0.0) {
        // Use white stars
        vec3 starColor = vec3(1.0);
        
        // Additive blending - add star light to the background
        nebulaColor += starColor * stars;
    }

    // Final output
    gl_FragColor = vec4(nebulaColor, 1.0);
}
`;
