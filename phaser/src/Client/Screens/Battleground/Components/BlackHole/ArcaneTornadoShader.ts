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

mat2 rotation(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
}

float squareMask(vec2 localUv, float size, float feather) {
    float dist = max(abs(localUv.x), abs(localUv.y));
    return 1.0 - smoothstep(size, size + feather, dist);
}

void main() {
    vec2 uv = fragCoord.xy / resolution;
    uv -= 0.5;
    uv.x *= resolution.x / resolution.y;

    float radius = length(uv);
    float edgeFade = smoothstep(0.9, 0.12, radius);
    float t = time * speed * 1.8;
    float angle = atan(uv.y, uv.x);

    float squareField = 0.0;
    float glowField = 0.0;

    for (int layer = 0; layer < 3; layer++) {
        float layerIndex = float(layer);
        float layerTime = t * (1.0 + layerIndex * 0.22);

        vec2 layerUv = uv;
        float swirl = layerTime
            + (1.9 + layerIndex * 0.55) / (radius * 2.4 + 0.3)
            + radius * (5.0 + layerIndex * 1.5)
            + sin(radius * 14.0 - layerTime * 2.0 + layerIndex * 1.7) * 0.25;
        layerUv = rotation(swirl) * layerUv;
        layerUv *= 1.0 + 0.12 * sin(layerTime * 1.3 + radius * 10.0 + layerIndex * 2.1);

        float layerRadius = length(layerUv);
        float layerAngle = atan(layerUv.y, layerUv.x);
        float gridScale = 9.0 + layerIndex * 4.0;
        vec2 gridUv = layerUv * gridScale;
        vec2 cellId = floor(gridUv);
        vec2 localUv = fract(gridUv) - 0.5;

        float cellNoise = rand(cellId + vec2(layerIndex * 17.31, layerIndex * 11.73));
        float orbitalBands = 0.5 + 0.5 * sin(layerAngle * (6.0 + layerIndex * 1.5) - layerRadius * 24.0 - layerTime * (3.4 + layerIndex));
        float inwardFlow = smoothstep(0.88, 0.16, layerRadius) * smoothstep(0.05, 0.18 + layerIndex * 0.08, layerRadius);
        float occupancy = step(0.74 - layerIndex * 0.08, cellNoise * 0.65 + orbitalBands * 0.85);
        float square = squareMask(localUv, 0.12 + 0.14 * cellNoise, 0.06);

        float layerSquares = square * occupancy * inwardFlow;
        squareField += layerSquares * (0.75 - layerIndex * 0.12);
        glowField += layerSquares * (0.4 + orbitalBands * 0.6);
    }

    float coreMask = 1.0 - smoothstep(0.03, 0.16, radius);
    float rimMask = smoothstep(0.72, 0.22, radius);
    float shimmer = smoothstep(0.25, 0.85, smoothNoise(uv * 11.0 + vec2(t * 0.35, -t * 0.45)));

    vec3 squareColor = mix(color1, color2, clamp(glowField * 0.45 + shimmer * 0.25, 0.0, 1.0));
    vec3 coreColor = mix(color1, color2, 0.35 + 0.65 * (1.0 - smoothstep(0.0, 0.2, radius)));

    vec3 color = squareColor * (0.8 + glowField * 0.9);
    color += coreColor * coreMask * (0.4 + 0.3 * sin(t * 2.3));
    color += mix(color1, color2, 0.7) * rimMask * 0.18;

    float dissolve = 1.0 - dissolveProgress * 1.2;
    float dissolveMask = smoothstep(0.0, 0.3, smoothNoise(uv * 12.0 + vec2(t * 0.7, -t * 0.45)) - dissolve);

    float alpha = clamp((squareField * 1.45 + glowField * 0.35 + coreMask * 0.9) * dissolveMask, 0.0, 1.0);
    alpha *= edgeFade;

    color *= intensity;
    color = pow(color, vec3(0.9));

    color *= alpha;

    gl_FragColor = vec4(color, alpha);
}
`;
