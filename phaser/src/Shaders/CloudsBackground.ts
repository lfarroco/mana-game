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
uniform float pixelSize; // Controls pixelation level (e.g., 4.0 for 4x4 pixel blocks)
uniform float cloudContrast; // 0..1
uniform float cloudSoftness; // 0..1
uniform vec2 cameraOffset; // for parallax
uniform float starTwinkle; // 0..1
uniform float exposure; // final exposure multiplier
uniform float timeOfDay; // 0..1 - optional time of day tint
varying vec2 fragCoord;

// Cheap hash functions (faster and less periodic than sin-based noise)
float hash12(vec2 p) {
    // based on iq's hash
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
    float a = hash12(p);
    float b = hash12(p + a + 19.19);
    return vec2(a, b);
}

// Pixelation function to quantize coordinates
vec2 pixelate(vec2 uv, float pixelSize) {
    if (pixelSize <= 1.0) {
        return uv; // No pixelation if pixelSize is 1 or less
    }
    vec2 pixelCoord = floor(uv * resolution.xy / pixelSize) * pixelSize / resolution.xy;
    return pixelCoord;
}

// Smooth noise function
float smoothNoise(vec2 p) {
    // bilinear interpolation of hashed grid values
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash12(i);
    float b = hash12(i + vec2(1.0, 0.0));
    float c = hash12(i + vec2(0.0, 1.0));
    float d = hash12(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// Optimized star field function - reduced noise calls and simplified calculations
float starField(vec2 uv, float density, float brightness) {
    // Apply pixelation to star field coordinates only if pixelSize is provided
    vec2 starUV = uv;
    if (pixelSize > 1.0) {
        starUV = pixelate(uv, pixelSize * 0.5); // Smaller pixel size for finer star details
    }
    
    // Create a grid for star positions
    vec2 gridUV = starUV * density;
    vec2 gridID = floor(gridUV);
    vec2 gridLocal = fract(gridUV);
    
    // Single hash call to determine star presence and properties
    float starNoise = hash12(gridID);
    float starThreshold = 0.97; // Reduced from 0.95 - fewer stars (only 3% of grid cells)
    
    if (starNoise < starThreshold) {
        return 0.0; // No star in this cell
    }
    
    // Use single noise value to derive multiple properties (more efficient)
    // derive multiple values from a small hash
    vec2 d12 = hash22(gridID + starNoise);
    float derivedNoise1 = d12.x; // offset x
    float derivedNoise2 = d12.y; // offset y
    float derivedNoise3 = hash12(gridID + 7.7); // size
    float derivedNoise4 = hash12(gridID + 13.3); // glow
    
    // Position the star using derived values
    vec2 starOffset = vec2(derivedNoise1, derivedNoise2) * 0.8 + 0.1;
    if (pixelSize > 1.0) {
        // More quantized position for blockier stars
        starOffset = floor(starOffset * 4.0) / 4.0; // Reduced from 8.0 to 4.0 for blockier effect
    }
    
    // Calculate distance from current pixel to star center
    float dist = length(gridLocal - starOffset);
    
    // Create star shape - pixelated if enabled, smooth otherwise
    float starSize = (derivedNoise3 * 0.2 + 0.3) * 0.08 + 0.02; // Slightly smaller stars
    float star;
    if (pixelSize > 1.0) {
        star = step(dist, starSize); // Hard edge for pixelated look
    } else {
        star = 1.0 - smoothstep(0.0, starSize, dist); // Smooth falloff
        star = pow(star, 2.0);
    }
    
    // Simplified glow calculation using derived values
    float phase = starNoise * 6.28318;
    float glowSpeed = 0.15 + derivedNoise4 * 0.4; // Reduced glow speed variation
    float timeOffset = derivedNoise1 * 100.0; // Reuse derived value
    float glow = sin((time * timeScale * glowSpeed) + phase + timeOffset) * 0.5 + 0.5;
    float glowIntensity = derivedNoise2 * 0.3 + 0.2; // Reduced glow intensity
    glow = mix(0.2, 0.6, pow(glow, 2.0 - glowIntensity)); // Less dramatic glow
    
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

// Square-based cloud function for pixelated block clouds
float squareClouds(vec2 uv, float scale, float threshold) {
    // Create a grid of squares
    vec2 gridUV = uv * scale;
    vec2 gridID = floor(gridUV);
    
    // Use noise to determine if each square should be a cloud
    float cloudNoise = hash12(gridID);
    
    // Create distinct cloud regions with hard edges
    float cloudPresence = step(threshold, cloudNoise);
    
    // Add some variation within each cloud square
    float cloudDensity = fract(cloudNoise * 7.531) * 0.3 + 0.7;
    
    return cloudPresence * cloudDensity;
}

// Animated square clouds with movement
float animatedSquareClouds(vec2 uv, float scale, float threshold, float time, vec2 velocity) {
    // Animate the grid position
    vec2 animatedUV = uv + velocity * time;
    
    // Create base cloud layer
    float clouds = squareClouds(animatedUV, scale, threshold);
    
    // Much subtler temporal variation to reduce noise
    vec2 gridID = floor(animatedUV * scale);
    float timeVariation = sin(time * 0.2 + hash12(gridID) * 6.28318) * 0.2 + 0.8; // Reduced animation intensity
    timeVariation = smoothstep(0.4, 0.9, timeVariation); // Smoother transitions
    
    return clouds * timeVariation;
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
    // Apply pixelation to dust coordinates only if enabled
    vec2 dustUV = uv;
    if (pixelSize > 1.0) {
        dustUV = pixelate(uv, pixelSize * 1.5); // More blocky dust particles
    }
    
    // Much higher thresholds for fewer particles
    float threshold1 = 0.96 - (particleQuality * 0.01); // Reduced from 0.92, fewer particles
    float threshold2 = 0.98 - (particleQuality * 0.01); // Reduced from 0.94, much fewer particles
    
    // Reduced density for cleaner look
    float densityMultiplier = 0.5 + (particleQuality * 0.15); // Reduced from 1.0 + 0.25
    
    // Create fewer layers of dust particles with reduced motion complexity
    vec2 dustUV1 = dustUV * (15.0 * densityMultiplier); // Reduced from 25.0
    vec2 dustUV2 = dustUV * (8.0 * densityMultiplier);  // Reduced from 15.0
    
    // Simpler, slower dust motion
    dustUV1 += vec2(scaledTime * 0.04, scaledTime * 0.03); // Reduced speed and removed FBM
    dustUV2 += vec2(scaledTime * 0.03, scaledTime * 0.025); // Reduced speed and removed FBM
    
    float dust = 0.0;
    
    // Layer 1: Small particles - optimized with derived noise values
    vec2 gridID1 = floor(dustUV1);
    vec2 gridLocal1 = fract(dustUV1);
    float dustNoise1 = hash12(gridID1);
    if (dustNoise1 > threshold1) {
        vec2 derived = hash22(gridID1 + dustNoise1);
        float derived1 = derived.x;
        float derived2 = derived.y;
        float derived3 = hash12(gridID1 + 5.5);

        vec2 dustOffset1 = vec2(derived1, derived2) * 0.4 + 0.3; // Centered particles
        if (pixelSize > 1.0) {
            dustOffset1 = floor(dustOffset1 * 2.0) / 2.0; // More blocky quantization
        }

        float dist1 = length(gridLocal1 - dustOffset1);
        float particleSize1 = (derived3 * 0.2 + 0.4) * 0.08; // Slightly larger, less variation

        float particle1;
        if (pixelSize > 1.0) {
            particle1 = step(dist1, particleSize1); // Hard edge for pixelated look
        } else {
            particle1 = 1.0 - smoothstep(0.0, particleSize1, dist1); // Smooth falloff
            particle1 = pow(particle1, 1.5); // Softer falloff
        }

        // Much simpler glow effect
        float phase1 = dustNoise1 * 6.28318;
        float glowSpeed1 = 0.8 + derived1 * 0.6; // Reduced from 1.5 + 2.0
        float timeOffset1 = derived2 * 30.0; // Reduced offset variation
        float glow1 = sin((scaledTime * glowSpeed1) + phase1 + timeOffset1) * 0.3 + 0.7; // Less dramatic glow

        dust += particle1 * glow1 * 0.4; // Reduced intensity from 0.7
    }
    
    // Layer 2: Larger particles - much fewer
    vec2 gridID2 = floor(dustUV2);
    vec2 gridLocal2 = fract(dustUV2);
    float dustNoise2 = hash12(gridID2);
    if (dustNoise2 > threshold2) {
        vec2 derivedb = hash22(gridID2 + dustNoise2 + 1.0);
        float derived4 = derivedb.x;
        float derived5 = derivedb.y;
        float derived6 = hash12(gridID2 + 9.9);

        vec2 dustOffset2 = vec2(derived4, derived5) * 0.4 + 0.3; // Centered particles
        if (pixelSize > 1.0) {
            dustOffset2 = floor(dustOffset2 * 2.0) / 2.0; // More blocky quantization
        }

        float dist2 = length(gridLocal2 - dustOffset2);
        float particleSize2 = (derived6 * 0.2 + 0.4) * 0.12; // Slightly larger

        float particle2;
        if (pixelSize > 1.0) {
            particle2 = step(dist2, particleSize2); // Hard edge for pixelated look
        } else {
            particle2 = 1.0 - smoothstep(0.0, particleSize2, dist2); // Smooth falloff
            particle2 = pow(particle2, 1.3);
        }

        // Simple glow
        float phase2 = dustNoise2 * 6.28318;
        float glowSpeed2 = 0.6 + derived4 * 0.4; // Much reduced from 1.2 + 1.8
        float timeOffset2 = derived5 * 30.0;
        float glow2 = sin((scaledTime * glowSpeed2) + phase2 + timeOffset2) * 0.2 + 0.8; // Subtle glow

        dust += particle2 * glow2 * 0.6; // Reduced intensity from 0.9
    }
    
    return clamp(dust, 0.0, 1.0);
}

void main() {
    // Normalize coordinates
    vec2 uv = fragCoord.xy / resolution.xy;
    uv.x *= resolution.x / resolution.y;

    // apply camera offset for parallax (small influence)
    uv += cameraOffset * 0.0005;

    // Apply branchless pixelation mixing so pixelSize can be animated smoothly
    float effectivePixelSize = max(pixelSize, 0.0); // allow 0 = off
    float pixelFactor = clamp((effectivePixelSize - 1.0) / 7.0, 0.0, 1.0);
    vec2 lowResUV = pixelate(uv, max(effectivePixelSize, 1.0));
    vec2 pixelatedUV = mix(uv, lowResUV, pixelFactor);

    // Apply time scaling to all time-based animations
    float scaledTime = time * timeScale;

    // Use square-based clouds instead of complex FBM noise
    // Create multiple layers of square clouds at different scales and speeds
    
    // Large cloud blocks - slow moving
    float largeClouds = animatedSquareClouds(uv, 8.0, 0.6, scaledTime, vec2(0.02, 0.015));
    
    // Medium cloud blocks - medium speed
    float mediumClouds = animatedSquareClouds(uv, 16.0, 0.65, scaledTime, vec2(-0.025, 0.02));
    
    // Small cloud details - faster moving
    float smallClouds = animatedSquareClouds(uv, 32.0, 0.7, scaledTime, vec2(0.03, -0.018));
    
    // Combine cloud layers with different weights
    float cloudPattern = largeClouds * 0.6 + mediumClouds * 0.3 + smallClouds * 0.2;
    
    // Quantize the final cloud pattern for more distinct blocks
    if (effectivePixelSize > 1.0) {
        cloudPattern = floor(cloudPattern * 6.0) / 6.0;
    }
    
    // Create some variation for glow effects using simplified calculation
    float glow = largeClouds * 0.2 + mediumClouds * 0.15; // Reduced intensity
    if (effectivePixelSize > 1.0) {
        glow = floor(glow * 3.0) / 3.0; // Less quantization levels
    }
    
    // Remove noisy color variation - use simple position-based variation instead
    vec2 colorUV = (effectivePixelSize > 1.0) ? pixelatedUV : uv;
    float colorVar = sin(colorUV.x * 2.0) * cos(colorUV.y * 1.5) * 0.1; // Simple, smooth variation
    if (effectivePixelSize > 1.0) {
        colorVar = floor(colorVar * 2.0) / 2.0; // Minimal quantization
    }

    // vertical bias for horizon tint (0 bottom -> 1 top)
    float vertical = clamp(uv.y, 0.0, 1.0);
    float verticalPow = pow(vertical, 1.1 + cloudSoftness * 2.0);

    // Optimized star field - reduced layers and early exit optimizations
    float starDensityMultiplier = 0.7 + (particleQuality * 0.2); // Reduced from 1.0 + 0.3
    
    // Quality-based star layer optimization - fewer layers overall
    float stars = 0.0;
    
    // Always render base star layer with reduced density
    stars = starField(uv, 15.0 * starDensityMultiplier, 0.8); // Reduced from 20.0 density and 1.0 brightness
    
    // Only add second layer on medium+ quality with lower density
    if (particleQuality >= 0.5) {
        stars += starField(uv + 0.5, 10.0 * starDensityMultiplier, 0.5); // Reduced from 15.0 density and 0.8 brightness
    }
    
    // Only add third layer on high quality with much lower density
    if (particleQuality >= 1.5) {
        stars += starField(uv + 0.25, 12.0 * starDensityMultiplier, 0.3); // Reduced from 25.0 density and 0.6 brightness
    }
    
    stars = clamp(stars, 0.0, 1.0);

    // Early exit optimization for dust particles on low quality - higher threshold
    float dust = 0.0;
    if (particleQuality >= 0.5) { // Increased from 0.3 - less dust on low quality
        dust = dustParticles(uv, scaledTime);
    }

    // Optimized final composition using square-based cloud pattern
    vec3 nebulaColor = mix(color1, color2, cloudPattern);
    nebulaColor = mix(nebulaColor, color3, smoothstep(0.4, 0.8, cloudPattern)); // Smoother transitions
    nebulaColor = mix(nebulaColor, color4, colorVar * 0.2); // Reduced color variation impact
    nebulaColor = mix(nebulaColor, color5, smoothstep(0.7, 0.95, cloudPattern) * 0.4); // Reduced intensity

    // Add much subtler glow
    nebulaColor += vec3(0.08, 0.04, 0.09) * pow(glow, 3.0); // Reduced and made more subtle

    // Optimized additive blending - much reduced intensity for cleaner look
    vec3 dustColor = vec3(1.0, 0.8, 0.4);
    nebulaColor += dustColor * dust * 0.3; // Further reduced from 0.6 for minimal noise
    
    vec3 starColor = vec3(1.0);
    // star twinkle modulation
    float twinkle = mix(1.0, 1.0 + (starTwinkle * 0.8), hash12(uv * 123.4));
    nebulaColor += starColor * stars * 0.6 * twinkle; // Reduced star contribution

    // exposure and timeOfDay tinting
    vec3 dayTint = mix(vec3(1.0, 0.95, 0.9), vec3(0.6, 0.7, 1.0), timeOfDay);
    // If exposure wasn't set (defaults to 0), treat it as 1.0 to avoid black output
    float safeExposure = (abs(exposure) < 1e-5) ? 1.0 : exposure;
    nebulaColor = nebulaColor * dayTint * safeExposure;

    // Final output
    gl_FragColor = vec4(nebulaColor, 1.0);
}
`;
