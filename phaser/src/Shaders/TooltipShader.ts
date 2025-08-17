// NOTE: This version focuses on a tightly contained glow with no bright bleed
// outside the intended halo. We use explicit control of fill, border, and glow
// alphas and premultiply the color to avoid fringe artifacts.
export const tooltipFragmentShader = `
precision mediump float;

uniform float time;
uniform vec2 resolution;
uniform vec3 bgColor;
uniform vec3 borderColor;

varying vec2 fragCoord;

// Simple hash noise (fast, sufficient for subtle variation)
float noise(vec2 p) {
    return fract(sin(dot(p, vec2(41.2987, 97.233))) * 43758.5453123);
}

// Smooth value noise
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

// Fractal Brownian Motion (few cheap octaves)
float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.55;
    for (int i = 0; i < 4; i++) {
        v += smoothNoise(p) * a;
        p *= 2.02;
        a *= 0.5;
    }
    return v;
}

// Rounded box SDF (centered at origin) size = half extents
float roundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) - r;
}

void main() {
    vec2 uv = fragCoord.xy / resolution;          // 0..1
    vec2 p = (uv - 0.5) * resolution;             // center in pixel space

    // CONFIG ------------------------------------------------------------
    float borderThickness = 3.0;    // crisp core border
    float glowSize        = 14.0;   // outward halo range in pixels (extended)
    float cornerRadius    = min(resolution.x, resolution.y) * 0.0475; // relative radius
    
    // Make the core box fill almost the whole quad minus glow
    vec2 halfSize = resolution * 0.5 - vec2(glowSize);
    // SDF distance: negative inside, 0 at border, positive outside
    float dist = roundedBox(p, halfSize, cornerRadius);

    // Discard anything beyond glow completely (no processing / no bleed)
    if (dist > glowSize) {
        discard;
    }

    // BASE ALPHAS -------------------------------------------------------
    // Fill alpha quickly ramps to 1 just inside the border for crisp interior
    float fillAlpha = 1.0 - smoothstep(-borderThickness * 2.2, -borderThickness * 0.7, dist);
    
    // Border alpha localized very tightly around dist=0
    float borderAlpha = 1.0 - smoothstep(0.0, borderThickness, abs(dist)); // unchanged core border
    
    // Glow only for dist in [0, glowSize]
    float glowAlpha = 1.0 - smoothstep(0.0, glowSize, dist);
    glowAlpha *= 1.0 - smoothstep(0.0, 1.5, dist); // suppress inside

    // ANIMATION ---------------------------------------------------------
    float pulse = sin(time * 1.8) * 0.25 + 0.75;          // 0.5..1.0
    float shimmer = smoothNoise(uv * resolution / 28.0 + vec2(time * 0.35, time * 0.27));
    shimmer = mix(0.6, 1.0, shimmer);                     // 0.6..1.0
    float animatedGlow = glowAlpha * pulse * shimmer;
    float animatedBorder = borderAlpha * (0.85 + 0.15 * sin(time * 3.5));

    // COLORS ------------------------------------------------------------
    // Base fill volume gradient (no animated noise): create subtle blue depth
    // Multi-stop vertical gradient (top lighter, mid bluish, bottom slightly darker)
    float y = uv.y;
    // Ease curve for nicer falloff
    float yEase = smoothstep(0.0, 1.0, y);
    float yEase2 = smoothstep(0.15, 0.85, y);
    
    vec3 topColor    = bgColor * vec3(1.10, 1.10, 1.18) + vec3(0.02, 0.05, 0.11); // light/cool
    vec3 midColor    = bgColor * vec3(0.95, 1.00, 1.20) + vec3(0.03, 0.10, 0.25); // saturated blue
    vec3 bottomColor = bgColor * vec3(0.80, 0.88, 1.02) + vec3(0.00, 0.03, 0.12); // darker base
    
    // Blend top->mid->bottom
    vec3 verticalBlend = mix(topColor, midColor, smoothstep(0.08, 0.45, yEase));
    verticalBlend = mix(verticalBlend, bottomColor, smoothstep(0.55, 0.95, yEase2));

    // RANDOMIZED BACKGROUND VARIATION ---------------------------------
    // Large & medium scale fbm noise to break uniformity of gradient
    // (Speed adjusted ~1.6x)
    float bgLarge  = fbm(uv * resolution / 230.0 + vec2(time * 0.024, -time * 0.018));
    float bgMedium = fbm(uv * resolution / 95.0  + vec2(-time * 0.032,  time * 0.027));
    float bgMix = mix(bgLarge, bgMedium, 0.55);
    // Jitter vertical gradient subtly (centered around 0)
    float gradJitter = (bgMix - 0.5);
    // Tint modulation (slightly shifts towards cooler or warmer tones)
    vec3 jitterTint = vec3(0.05, 0.09, 0.14) * gradJitter;
    verticalBlend += jitterTint;
    // Mild contrast pop using a curved response
    float contrast = gradJitter * 0.9;
    verticalBlend *= 1.0 + contrast * 0.15;
    verticalBlend = clamp(verticalBlend, 0.0, 2.0);
    
    // Radial highlight (gives convex volume) - elliptical for aspect ratio
    // Offset radial center by slow moving noise for organic shifting focus
    vec2 centerNoise;
    centerNoise.x = fbm(uv * resolution / 160.0 + vec2(time * 0.064, 1.7));
    centerNoise.y = fbm(uv * resolution / 170.0 + vec2(-2.3, -time * 0.059));
    vec2 centerOffset = (centerNoise - 0.5) * 0.18; // up to ~18% shift of half dimension
    vec2 aspectUV = (uv - 0.5 - centerOffset);
    aspectUV.x *= resolution.x / resolution.y;
    float radial = 1.0 - clamp(length(aspectUV) / 0.92, 0.0, 1.0); // center 1 -> edges 0
    float radialPow = pow(radial, 2.4);
    
    vec3 innerHighlight = vec3(0.18, 0.40, 0.75); // cool blue highlight
    vec3 highlightMix = mix(verticalBlend, innerHighlight, radialPow * 0.22);
    
    // Edge vignette to keep focus central
    float edgeVignette = smoothstep(0.0, 0.35, radial) * (1.0 - smoothstep(0.75, 0.98, radial));
    float vignetteFactor = mix(0.9, 1.0, edgeVignette);
    
    vec3 fillColor = highlightMix * vignetteFactor;

    // Subtle breathing glow animation (very faint) affecting central highlight
    // Combine two sine waves for non-uniform cycle
    float breatheRaw = sin(time * 0.65) * 0.6 + sin(time * 0.23) * 0.4; // range ~[-1,1]
    float breathe = breatheRaw * 0.5 + 0.5; // 0..1
    // Ease to spend more time near extremes (gentler transitions)
    float breatheEase = breathe * breathe * (3.0 - 2.0 * breathe);
    
    // Modulate center highlight strength slightly (max +8%)
    float centerBoost = radialPow * 0.35 * breatheEase; // confined to center
    vec3 breatheTint = vec3(0.02, 0.06, 0.12); // cool additive tint
    fillColor += fillColor * 0.08 * centerBoost + breatheTint * 0.25 * centerBoost;
    
    // Very soft overall luminosity modulation (±3%)
    float globalLum = 1.0 + (breatheEase - 0.5) * 0.06;
    fillColor *= globalLum;

    vec3 coreBorderColor = borderColor * 1.45; // bright inner frame
    vec3 glowColor = mix(borderColor, vec3(1.0, 0.78, 0.32), 0.38);

    // Inner stroke (just inside border) for depth
    float innerStroke = 1.0 - smoothstep(-1.8, -0.6, dist);
    innerStroke *= smoothstep(-3.2, -1.8, dist); // confine
    
    // Inner shadow a few pixels inwards
    float innerShadow = smoothstep(-8.0, -3.2, dist) * 0.22;
    fillColor = mix(fillColor, fillColor * 0.65, innerShadow);
    
    // Apply inner stroke highlight (slight warm tint)
    vec3 strokeColor = mix(coreBorderColor, vec3(1.0,0.9,0.7), 0.25);
    fillColor = mix(fillColor, strokeColor, innerStroke * 0.55);

    // Top edge highlight along border (only near top & near SDF border)
    // uv.y small => top; mask by borderAlpha so it sits on edge
    float topBand = 1.0 - smoothstep(0.0, 0.035, uv.y);           // narrow strip
    float topFade = smoothstep(0.035, 0.09, uv.y);                // fade downward
    float topMask = topBand * (1.0 - topFade);
    // Add subtle horizontal variation
    float topNoise = smoothNoise(vec2(uv.x * 40.0, time * 0.6)) * 0.5 + 0.5;
    float topHighlight = topMask * borderAlpha * (0.6 + 0.4 * topNoise);
    // Slightly reduce top highlight impact so plasma details stay visible
    coreBorderColor += topHighlight * 0.55 * vec3(1.2, 1.0, 0.55);
    glowColor += topHighlight * 0.25 * vec3(1.0,0.85,0.5);

    // FLOWING PLASMA BORDER (moved after color bases to avoid undeclared vars)
    // Compute SDF gradient (approx) to derive tangent direction
    vec2 gradSample = vec2(1.0, 0.0);
    float dX = roundedBox(p + gradSample, halfSize, cornerRadius) - roundedBox(p - gradSample, halfSize, cornerRadius);
    float dY = roundedBox(p + gradSample.yx, halfSize, cornerRadius) - roundedBox(p - gradSample.yx, halfSize, cornerRadius);
    vec2 normal = normalize(vec2(dX, dY) + 1e-6);
    vec2 tangent = vec2(-normal.y, normal.x);

    float s = dot(p, tangent);
    float plasmaSpeed = 1.25;
    // Lower scale => larger features
    float plasmaScale = 0.07; // was 0.11
    vec2 baseUV = vec2(s * plasmaScale + time * plasmaSpeed, dist * 0.35); // stretch pattern across thicker band
    vec2 warp = vec2(fbm(baseUV * 1.7 + vec2(0.0, time * 0.3)), fbm(baseUV * 1.3 + vec2(4.2, -time * 0.25)));
    vec2 flowUV = baseUV + warp * 0.65;
    float plasma = fbm(flowUV);
    float filaments = pow(plasma, 2.2) * 1.4;
    // Wider plasma band around the border (half-width in px)
    float plasmaHalfWidth = 12.0; // broadened (was 6.0)
    float edgeMask = smoothstep(plasmaHalfWidth, 0.0, abs(dist));
    filaments *= edgeMask * borderAlpha;
    float sparkle = smoothNoise(flowUV * 9.0 + vec2(time * 3.5, -time * 2.0));
    sparkle = smoothstep(0.82, 1.0, sparkle) * edgeMask;
    float sparklePulse = 0.6 + 0.4 * sin(time * 18.0 + s * 0.08);
    sparkle *= sparklePulse;
    vec3 plasmaCool = mix(borderColor, vec3(0.3, 0.55, 1.15), 0.35);
    vec3 plasmaHot  = vec3(1.25, 0.95, 0.45);
    vec3 plasmaColor = mix(plasmaCool, plasmaHot, clamp(filaments * 1.15, 0.0, 1.0));
    plasmaColor += sparkle * vec3(1.6, 1.25, 0.65);
    coreBorderColor = mix(coreBorderColor, plasmaColor, 0.72 * edgeMask);
    glowAlpha += filaments * 0.45; // slightly stronger contribution
    glowColor = mix(glowColor, plasmaHot, filaments * 0.18);

    // Halo irregularity using distance-based noise (only outside)
    float haloNoise = smoothNoise(vec2(uv.x * resolution.x / 30.0 + time * 0.2, uv.y * resolution.y / 18.0 - time * 0.15));
    float haloMod = mix(0.85, 1.15, haloNoise);
    glowAlpha *= haloMod;

    // Compose -----------------------------------------------------------
    vec3 color = fillColor;
    // Add border first
    color = mix(color, coreBorderColor, animatedBorder);
    // Add glow outside (only where dist >= 0) so it doesn't wash interior
    float outerMask = smoothstep(0.0, 0.5, dist); // 0 inside, 1 just outside
    color = mix(color, glowColor, animatedGlow * outerMask * 0.85);

    // FINAL ALPHA -------------------------------------------------------
    // Prioritize fill, then border, then glow (reduced glow contribution to alpha)
    float alpha = max(fillAlpha, max(animatedBorder, animatedGlow * 0.5));

    // Premultiply to avoid fringe bright pixels in blending
    color *= alpha;

    gl_FragColor = vec4(color, alpha);
}
`;
