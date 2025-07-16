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
uniform float particleQuality; // 0.0 = low, 1.0 = medium, 2.0 = high
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

// Optimized star field function - reduced noise calls and simplified calculations
float starField(vec2 uv, float density, float brightness) {
    // Create a grid for star positions
    vec2 gridUV = uv * density;
    vec2 gridID = floor(gridUV);
    vec2 gridLocal = fract(gridUV);
    
    // Single noise call to determine star presence and properties
    float starNoise = noise(gridID);
    float starThreshold = 0.95; // Only 5% of grid cells get stars
    
    if (starNoise < starThreshold) {
        return 0.0; // No star in this cell
    }
    
    // Use single noise value to derive multiple properties (more efficient)
    float derivedNoise1 = fract(starNoise * 43.7584); // Derive offset x
    float derivedNoise2 = fract(starNoise * 67.3912); // Derive offset y
    float derivedNoise3 = fract(starNoise * 91.8475); // Derive size
    float derivedNoise4 = fract(starNoise * 23.1492); // Derive glow properties
    
    // Position the star using derived values
    vec2 starOffset = vec2(derivedNoise1, derivedNoise2) * 0.8 + 0.1;
    
    // Calculate distance from current pixel to star center
    float dist = length(gridLocal - starOffset);
    
    // Create a round star with smooth falloff
    float starSize = (derivedNoise3 * 0.3 + 0.4) * 0.1 + 0.03;
    float star = 1.0 - smoothstep(0.0, starSize, dist);
    star = pow(star, 2.0);
    
    // Simplified glow calculation using derived values
    float phase = starNoise * 6.28318;
    float glowSpeed = 0.2 + derivedNoise4 * 0.6;
    float timeOffset = derivedNoise1 * 100.0; // Reuse derived value
    float glow = sin((time * timeScale * glowSpeed) + phase + timeOffset) * 0.5 + 0.5;
    float glowIntensity = derivedNoise2 * 0.5 + 0.3; // Reuse derived value
    glow = mix(0.1, 0.8, pow(glow, 2.0 - glowIntensity));
    
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

// Function to create swirling patterns - optimized trigonometric operations
vec2 swirl(vec2 uv, float intensity, vec2 center) {
    vec2 delta = uv - center;
    float dist = length(delta);
    
    // Pre-calculate time-based swirl factor to avoid repeated calculations
    float swirlFactor = intensity * sin(time * timeScale * 0.5) * (1.0 - dist);
    
    // Optimize: avoid atan2 when possible, use approximation for small angles
    if (abs(swirlFactor) < 0.1) {
        // For small swirl amounts, use linear approximation (much faster)
        vec2 perpendicular = vec2(-delta.y, delta.x);
        return center + delta + perpendicular * swirlFactor;
    } else {
        // Only use expensive atan2 for larger swirls
        float angle = atan(delta.y, delta.x) + swirlFactor;
        return center + dist * vec2(cos(angle), sin(angle));
    }
}

// Optimized dust particles function - significantly reduced noise calls
float dustParticles(vec2 uv, float scaledTime) {
    // Quality-based particle thresholds
    float threshold1 = 0.92 - (particleQuality * 0.02);
    float threshold2 = 0.94 - (particleQuality * 0.02);
    
    // Adjust density based on quality
    float densityMultiplier = 1.0 + (particleQuality * 0.25);
    
    // Create multiple layers of dust particles - reduced FBM octaves for motion
    vec2 dustUV1 = uv * (25.0 * densityMultiplier);
    vec2 dustUV2 = uv * (15.0 * densityMultiplier);
    
    // Faster dust motion - increased speed multipliers for more dynamic movement
    dustUV1 += vec2(scaledTime * 0.08, scaledTime * 0.06) + fbm(uv * 2.0 + scaledTime * 0.12, 2) * 0.8;
    dustUV2 += vec2(scaledTime * 0.065, scaledTime * 0.05) + fbm(uv * 1.5 + scaledTime * 0.1, 2) * 0.9;
    
    float dust = 0.0;
    
    // Layer 1: Small particles - optimized with derived noise values
    vec2 gridID1 = floor(dustUV1);
    vec2 gridLocal1 = fract(dustUV1);
    float dustNoise1 = noise(gridID1);
    if (dustNoise1 > threshold1) {
        // Derive multiple values from single noise call
        float derived1 = fract(dustNoise1 * 37.684);
        float derived2 = fract(dustNoise1 * 83.291);
        float derived3 = fract(dustNoise1 * 51.847);
        
        vec2 dustOffset1 = vec2(derived1, derived2) * 0.6 + 0.2;
        float dist1 = length(gridLocal1 - dustOffset1);
        float particleSize1 = (derived3 * 0.4 + 0.6) * 0.06;
        float particle1 = 1.0 - smoothstep(0.0, particleSize1, dist1);
        particle1 = pow(particle1, 1.2);
        
        // Faster glow effect for more dynamic dust particles
        float phase1 = dustNoise1 * 6.28318;
        float glowSpeed1 = 1.5 + derived1 * 2.0; // Increased from 0.8 + 1.2
        float timeOffset1 = derived2 * 50.0;
        float glow1 = sin((scaledTime * glowSpeed1) + phase1 + timeOffset1) * 0.5 + 0.5;
        glow1 = mix(0.4, 1.3, pow(glow1, 2.0 - derived3));
        
        dust += particle1 * glow1 * 0.7;
    }
    
    // Layer 2: Larger particles - optimized with derived noise values
    vec2 gridID2 = floor(dustUV2);
    vec2 gridLocal2 = fract(dustUV2);
    float dustNoise2 = noise(gridID2);
    if (dustNoise2 > threshold2) {
        // Derive multiple values from single noise call
        float derived4 = fract(dustNoise2 * 47.123);
        float derived5 = fract(dustNoise2 * 73.569);
        float derived6 = fract(dustNoise2 * 92.431);
        
        vec2 dustOffset2 = vec2(derived4, derived5) * 0.6 + 0.2;
        float dist2 = length(gridLocal2 - dustOffset2);
        float particleSize2 = (derived6 * 0.4 + 0.6) * 0.1;
        float particle2 = 1.0 - smoothstep(0.0, particleSize2, dist2);
        particle2 = pow(particle2, 1.1);
        
        float phase2 = dustNoise2 * 6.28318;
        float glowSpeed2 = 1.2 + derived4 * 1.8; // Increased from 0.5 + 1.0
        float timeOffset2 = derived5 * 50.0;
        float glow2 = sin((scaledTime * glowSpeed2) + phase2 + timeOffset2) * 0.5 + 0.5;
        glow2 = mix(0.3, 1.4, pow(glow2, 2.0 - derived6));
        
        dust += particle2 * glow2 * 0.9;
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

    // Optimized: Reduce octave counts significantly for better performance
    int baseOctaves = int(3.0 + particleQuality * 0.5); // 3 (low), 3-4 (med), 4 (high)
    int detailOctaves = int(2.0 + particleQuality * 0.5); // 2 (low), 2-3 (med), 3 (high)

    // Nebula noise layers - reduced octave counts and consolidated some layers
    float nebula1 = fbm(swirl1 * 3.5 + scaledTime * 0.06, baseOctaves);
    float nebula2 = fbm(swirl2 * 2.7 + scaledTime * 0.035, baseOctaves);
    
    // Combine first two nebula layers and use the result to drive the third layer more efficiently
    float nebulaBase = nebula1 * 0.6 + nebula2 * 0.4;
    float nebula3 = fbm(swirl3 * 4.2 + scaledTime * 0.045, detailOctaves) * 0.3;
    float nebulaPattern = nebulaBase + nebula3;

    // Optimized: Combine glow calculation with existing nebula calculation
    float glow = nebula1 * 0.3 + nebula2 * 0.2; // Reuse existing calculations
    
    // Simplified color variation using reduced octaves
    float colorVar = fbm(uv * 7.0 + scaledTime * 0.09, detailOctaves);

    // Optimized star field - reduced layers and early exit optimizations
    float starDensityMultiplier = 1.0 + (particleQuality * 0.3);
    
    // Quality-based star layer optimization
    float stars = 0.0;
    
    // Always render base star layer
    stars = starField(uv, 20.0 * starDensityMultiplier, 1.0);
    
    // Only add second layer on medium+ quality
    if (particleQuality >= 0.5) {
        stars += starField(uv + 0.5, 15.0 * starDensityMultiplier, 0.8);
    }
    
    // Only add third layer on high quality
    if (particleQuality >= 1.5) {
        stars += starField(uv + 0.25, 25.0 * starDensityMultiplier, 0.6);
    }
    
    stars = clamp(stars, 0.0, 1.0);

    // Early exit optimization for dust particles on low quality
    float dust = 0.0;
    if (particleQuality >= 0.3) {
        dust = dustParticles(uv, scaledTime);
    }

    // Optimized final composition - reduced conditional branches
    vec3 nebulaColor = mix(color1, color2, nebulaPattern);
    nebulaColor = mix(nebulaColor, color3, smoothstep(0.5, 0.8, nebulaPattern));
    nebulaColor = mix(nebulaColor, color4, colorVar * 0.5);
    nebulaColor = mix(nebulaColor, color5, smoothstep(0.7, 0.95, nebulaPattern) * 0.7);

    // Add glow
    nebulaColor += vec3(0.15, 0.08, 0.18) * pow(glow, 2.0);

    // Optimized additive blending - avoid conditionals
    vec3 dustColor = vec3(1.0, 0.8, 0.4);
    nebulaColor += dustColor * dust * 1.2;
    
    vec3 starColor = vec3(1.0);
    nebulaColor += starColor * stars;

    // Final output
    gl_FragColor = vec4(nebulaColor, 1.0);
}
`;
