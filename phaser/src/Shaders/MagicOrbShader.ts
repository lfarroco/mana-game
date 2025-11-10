export const magicOrbFragmentShader = `
precision mediump float;

uniform float time;
uniform vec2 resolution;
uniform vec3 color1;
uniform float intensity;
uniform float speed;
uniform float dissolveProgress;
uniform float dissolveGridSize;
uniform float dissolveUpwardMovement;
uniform float dissolveFadeRange;
uniform float animationPhaseOffset;
uniform float dissolveTime;

varying vec2 fragCoord;

// Noise function
float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float squareClouds(vec2 uv, float scale, float threshold, float time, vec2 velocity) {
    vec2 animatedUV = uv + velocity * time;
    vec2 gridUV = animatedUV * scale;
    vec2 gridID = floor(gridUV);
    float cloudNoise = noise(gridID);
    float cloudPresence = step(0.5, cloudNoise);
    float timeVariation = sin(time * 1.0 + noise(gridID) * 6.28318) * 0.5 + 0.5;
    timeVariation = smoothstep(0.3, 0.8, timeVariation);
    return cloudPresence * timeVariation;
}

void main() {
    vec2 uv = fragCoord.xy / resolution;
    uv -= 0.5;
    uv.x *= resolution.x / resolution.y;
    
    float dist = length(uv);
    if (dist > 0.4) discard;
    
    // Dissolve effect
    if (dissolveProgress > 0.0) {
        vec2 dissolveUV = uv + 0.5;
        float upwardMovement = dissolveProgress * dissolveUpwardMovement;
        dissolveUV.y -= upwardMovement;
        vec2 gridUV = dissolveUV * dissolveGridSize;
        vec2 gridID = floor(gridUV);
        float cellRandom = noise(gridID);
        float dissolveThreshold = cellRandom * 1.2;
        float dissolveNoise = noise(gridID + dissolveTime * 2.0) * 0.3;
        dissolveThreshold += dissolveNoise;
        if (dissolveProgress > dissolveThreshold) {
            float fadeAlpha = 1.0 - smoothstep(dissolveThreshold - dissolveFadeRange, dissolveThreshold, dissolveProgress);
            if (fadeAlpha <= 0.0) discard;
        }
    }

    // Outline (softer and thinner)
    float outlineWidth = 0.05;
    float innerRadius = 0.4 - outlineWidth;
    float outlineStrength = 0.0;
    if (dist > innerRadius) {
        float outlineProgress = (dist - innerRadius) / outlineWidth;
        outlineStrength = smoothstep(0.0, 1.0, outlineProgress) * 1.2;
    }

    float scaledTime = time * speed + animationPhaseOffset;
    float largeClouds = squareClouds(uv, 6.0, 0.4, scaledTime, vec2(0.05, 0.03));
    float mediumClouds = squareClouds(uv, 12.0, 0.5, scaledTime, vec2(-0.04, 0.06));

    // Lighter, softer clouds
    float cloudPattern = largeClouds * 0.5 + mediumClouds * 0.4;

    // Softer color mix
    vec3 baseColor = color1 * 0.8;       // slightly lighter base
    vec3 cloudColor = color1 * 1.2;      // gentle glow clouds
    vec3 finalColor = mix(baseColor, cloudColor, cloudPattern);
    finalColor += color1 * outlineStrength * 0.6;

    // Lower overall intensity for softness
    finalColor *= intensity * 0.6;

    // Apply more transparency for ethereal look
    float finalAlpha = 0.6;
    if (dissolveProgress > 0.0) {
        vec2 dissolveUV = uv + 0.5;
        float upwardMovement = dissolveProgress * dissolveUpwardMovement;
        dissolveUV.y -= upwardMovement;
        vec2 gridUV = dissolveUV * dissolveGridSize;
        vec2 gridID = floor(gridUV);
        float cellRandom = noise(gridID);
        float dissolveThreshold = cellRandom * 1.2;
        float dissolveNoise = noise(gridID + dissolveTime * 2.0) * 0.3;
        dissolveThreshold += dissolveNoise;
        finalAlpha *= 1.0 - smoothstep(dissolveThreshold - dissolveFadeRange, dissolveThreshold, dissolveProgress);
    }

    // Clamp to avoid overbright glow
    gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), finalAlpha);
}
`;

export const simpleMagicOrbFragmentShader = `
precision mediump float;

uniform float time;
uniform vec2 resolution;
uniform vec3 color1;
uniform float intensity;
uniform float speed;
uniform float dissolveProgress;

varying vec2 fragCoord;

// Simple pseudo-random noise (fast)
float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453);
}

// Lightweight dissolve pattern using radial + noise variation
float dissolveMask(vec2 uv, float t) {
    float d = length(uv);
    float n = rand(floor(uv * 40.0 + t * 5.0));
    return smoothstep(0.4, 0.5 + n * 0.2, d);
}

void main() {
    vec2 uv = fragCoord.xy / resolution;
    uv -= 0.5;
    uv.x *= resolution.x / resolution.y;

    float dist = length(uv);
    if (dist > 0.45) discard;

    // Simple pulsing glow
    float pulse = sin(time * speed + dist * 10.0) * 0.5 + 0.5;

    // Smooth falloff for orb body
    float glow = smoothstep(0.45, 0.0, dist);
    float innerGlow = smoothstep(0.3, 0.0, dist);

    // Base + soft glow
    vec3 baseColor = color1 * (0.4 + 0.6 * pulse);
    vec3 finalColor = baseColor * (innerGlow + glow * 0.4);

    // Lightweight dissolve (simple fade)
    float dissolve = 1.0 - dissolveProgress * 1.2;
    float fade = smoothstep(0.0, 0.3, dissolveMask(uv, time * 0.5) - dissolve);
    float alpha = fade * 0.6; // transparent look

    // Apply intensity and output
    finalColor *= intensity * 0.8;
    gl_FragColor = vec4(finalColor, alpha);
}
`;
