export const testOrbFragmentShader = `
precision mediump float;

uniform float time;
uniform vec2 resolution;
uniform vec3 color1;

varying vec2 fragCoord;

void main() {
    // Normalize coordinates
    vec2 uv = fragCoord.xy / resolution.xy;
    vec2 center = vec2(0.5);
    float dist = distance(uv, center);
    
    // Create a simple circle
    float circle = 1.0 - smoothstep(0.4, 0.5, dist);
    
    // Add some animation
    float pulse = sin(time * 2.0) * 0.2 + 0.8;
    
    // Simple color
    vec3 finalColor = color1 * circle * pulse;
    
    gl_FragColor = vec4(finalColor, circle);
}
`;
