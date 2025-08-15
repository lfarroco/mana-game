export const energySlotFragmentShader = `
precision mediump float;

uniform float time;
uniform vec2 resolution;
uniform vec3 color1;
uniform float intensity;
uniform float speed;
uniform float animationPhaseOffset;

varying vec2 fragCoord;

// Noise function for energy patterns
float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// Generate smooth noise for energy flow
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

// Create pulsing energy waves
float energyPulse(float dist, float time) {
    float scaledTime = time * speed + animationPhaseOffset;
    
    // Create multiple pulse rings
    float pulse1 = sin(dist * 20.0 - scaledTime * 8.0) * 0.5 + 0.5;
    float pulse2 = sin(dist * 15.0 - scaledTime * 6.0 + 1.0) * 0.3 + 0.3;
    float pulse3 = sin(dist * 25.0 - scaledTime * 10.0 + 2.0) * 0.2 + 0.2;
    
    return pulse1 * pulse2 * pulse3;
}

void main() {
    // Normalize UV coordinates to [0.0, 1.0]
    vec2 uv = fragCoord.xy / resolution;
    
    // Center UV coordinates around (0.5, 0.5)
    uv -= 0.5;
    
    // Maintain aspect ratio
    uv.x *= resolution.x / resolution.y;
    
    // Calculate distance from center
    float dist = length(uv);
    
    // Define circle boundaries
    float outerRadius = 0.45;
    float innerRadius = 0.35;
    float borderWidth = 0.06;
    
    // Discard pixels outside the outer circle
    if (dist > outerRadius) {
        discard;
    }
    
    // Create double border effect
    float outerBorderStart = outerRadius - borderWidth;
    float outerBorderMid = outerRadius - borderWidth * 0.5;
    float innerBorderStart = outerRadius - borderWidth * 2.0;
    float innerBorderEnd = outerRadius - borderWidth * 2.5;
    
    // Calculate border intensities
    float outerBorder = 0.0;
    float innerBorder = 0.0;
    
    // Outer border (white-neon-blue)
    if (dist >= outerBorderStart) {
        float borderProgress = (dist - outerBorderStart) / borderWidth;
        outerBorder = smoothstep(0.0, 0.3, borderProgress) * smoothstep(1.0, 0.7, borderProgress);
        outerBorder *= 2.0; // Make it bright
    }
    
    // Inner border (white-neon-blue)
    if (dist >= innerBorderEnd && dist <= innerBorderStart) {
        float borderProgress = (dist - innerBorderEnd) / (innerBorderStart - innerBorderEnd);
        innerBorder = smoothstep(0.0, 0.3, borderProgress) * smoothstep(1.0, 0.7, borderProgress);
        innerBorder *= 1.8; // Slightly less bright than outer
    }
    
    // Create energy lines pattern inside the circle
    vec3 finalColor = vec3(0.0);
    float alpha = 0.0;
    
    // Energy flow inside the circle
    if (dist < innerRadius) {
        // Add subtle flowing energy background
        float flow = smoothNoise(uv * 6.0 + vec2(time * speed * 0.5, time * speed * 0.3)) * 0.4;
        float pulse = energyPulse(dist, time) * 0.3;
        
        // Combine energy effects
        float energyIntensity = flow * 0.6 + pulse * 0.4;
        energyIntensity = min(energyIntensity, 1.0);
        
        // Create softer energy color with less intense white
        vec3 softWhite = vec3(0.85, 0.9, 0.95); // Reduced white intensity
        vec3 blueEnergy = vec3(0.6, 0.8, 1.0);
        vec3 energyColor = mix(blueEnergy, softWhite, energyIntensity * 0.7); // Reduced white mixing
        
        finalColor = energyColor * energyIntensity * 0.5; // More subtle interior
        alpha = energyIntensity * 0.6; // More transparent
    }
    
    // Add border colors
    if (outerBorder > 0.0 || innerBorder > 0.0) {
        // Create white-neon-blue border color
        vec3 borderColor = mix(vec3(0.7, 0.9, 1.0), vec3(1.0, 1.0, 1.0), 0.7); // Blue-white
        
        float totalBorder = max(outerBorder, innerBorder);
        
        // Add pulsing effect to borders
        float borderPulse = sin(time * speed * 3.0 + animationPhaseOffset) * 0.3 + 0.7;
        totalBorder *= borderPulse;
        
        finalColor = mix(finalColor, borderColor, totalBorder);
        alpha = max(alpha, totalBorder * 0.6); // Semi-transparent borders
    }
    
    // Apply intensity and color tinting
    finalColor *= intensity;
    finalColor = mix(finalColor, finalColor * color1, 0.3); // Subtle color tinting
    
    // Add occasional energy surges (reduced intensity)
    float surge = sin(time * speed * 0.5 + animationPhaseOffset * 2.0) * 0.5 + 0.5;
    surge = smoothstep(0.8, 1.0, surge); // Only strong surges
    finalColor += surge * vec3(0.7, 0.8, 0.9) * 0.2; // Softer blue-white surge
    
    gl_FragColor = vec4(finalColor, alpha);
}
`;
