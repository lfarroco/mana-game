export const arcaneTornadoFragmentShader = `
precision mediump float;

uniform float time;
uniform vec2 resolution;
uniform vec3 color1;     // inner color
uniform vec3 color2;     // outer color
uniform float intensity;
uniform float speed;
uniform float dissolveProgress;

varying vec2 fragCoord;

// --- helpers
float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453);
}

float smoothNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = rand(i);
    float b = rand(i + vec2(1.0, 0.0));
    float c = rand(i + vec2(0.0, 1.0));
    float d = rand(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

vec2 radialTwist(vec2 uv, float t, float strength) {
    float r = length(uv);
    float angle = atan(uv.y, uv.x);
    float twist = strength * (1.0 - smoothstep(0.0, 0.8, r)) * (1.0 - r);
    float a = angle + twist * (1.0 + 0.5 * sin(t * 1.6 + r * 10.0));
    return vec2(cos(a), sin(a)) * r;
}

void main() {
    vec2 uv = fragCoord.xy / resolution;
    uv -= 0.5;
    uv.x *= resolution.x / resolution.y;

    float dist = length(uv);
    float edgeFade = smoothstep(0.6, 0.1, dist);
    float t = time * speed * 2.5;

    vec2 twisted = radialTwist(uv, t, 2.2 + speed * 0.4);
    float angle = atan(twisted.y, twisted.x);
    float radius = length(twisted);

    float arms = 4.5;
    float tightness = 2.0;
    float rotationSpeed = 2.0 * speed;
    float rotatingAngle = angle + t * rotationSpeed + radius * tightness;
    float spiral = sin(rotatingAngle * arms - radius * (tightness * 0.8));
    spiral = smoothstep(-0.5, 0.5, spiral) * (1.0 - radius);

    float n = smoothNoise(uv * 6.0 + vec2(t * 0.35, -t * 0.5));
    float shimmer = smoothstep(0.2, 0.8, n + 0.3 * sin(t * 3.0 + radius * 12.0));

    float coreMask = smoothstep(0.0, 0.5, 0.5 - radius);
    float rimMask = smoothstep(0.7, 0.25, radius);

    float colorMix = spiral * 0.8 + shimmer * 0.4;
    vec3 baseColor = mix(color1, color2, colorMix);
    vec3 glowColor = mix(color1, color2, rimMask * 0.8);

    vec3 color = baseColor * (1.0 + shimmer * 0.6);
    color += glowColor * (rimMask * 1.2 + spiral * 0.6);
    color *= (1.2 - radius * 0.7);

    float pulse = 0.7 + 0.5 * sin(t * 2.0);
    color += color2 * coreMask * 0.8 * pulse;

    float dissolve = 1.0 - dissolveProgress * 1.2;
    float dissolveMask = smoothstep(0.0, 0.35, smoothNoise(uv * 10.0 + t * 0.6) - dissolve);

    float alpha = clamp((coreMask * 1.2 + spiral * 0.8 + rimMask * 0.4) * dissolveMask, 0.0, 1.0);
    alpha *= (1.1 - radius * 0.8) * edgeFade;

    color *= intensity;
    color = pow(color, vec3(0.9));

    // --- Remove background color completely
    color *= alpha;

    gl_FragColor = vec4(color, alpha);
}
`;
