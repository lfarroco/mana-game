export const energySlotFragmentShader = `
precision mediump float;

uniform float time;
uniform vec2 resolution;
uniform vec3 color1;
uniform float intensity;
uniform float speed;

varying vec2 fragCoord;

void main() {
    vec2 uv = fragCoord.xy / resolution;
    uv -= 0.5;
    uv.x *= resolution.x / resolution.y;

    float dist = length(uv);

    // Ring parameters
    float outerRadius = 0.45;
    float ringWidth = 0.04;

    // Distance-based ring intensity
    float ring = smoothstep(outerRadius, outerRadius - ringWidth, dist) *
                 smoothstep(outerRadius - ringWidth * 2.0, outerRadius - ringWidth, dist);

    // Simple pulsing animation
    float pulse = sin(time * speed * 3.0) * 0.5 + 0.5;
    ring *= 0.7 + 0.3 * pulse;

    // Apply color and intensity
    vec3 ringColor = color1 * intensity * ring;

    gl_FragColor = vec4(ringColor, ring);
} `;
