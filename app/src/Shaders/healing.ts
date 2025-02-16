

export class HealingShaderPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
	constructor(game: Phaser.Game) {
		super({
			game,
			fragShader: `
		    precision mediump float;
    
		    uniform float u_time;
		    uniform vec2 u_resolution;
    
		    const int numPillars = 25;
		    const float min_x = 0.248;
		    const float max_x = 0.520;
		    const float min_y = 0.250;
		    const float max_y = 0.414;
    
		    float random(float x) {
			return fract(sin(x) * 43758.5453123);
		    }
    
		    void main() {
			vec2 uv = gl_FragCoord.xy / u_resolution;
			uv.x *= u_resolution.x / u_resolution.y;
			
			float color = 0.2;
			
			for (int i = 1; i <= numPillars; i++) {
			    float seed = float(i);
			    float pillarX = min_x + random(seed) * (max_x - min_x);
			    float pillarY = min_y + random(seed * 2.0) * (max_y - min_y);
			    float distance = length(vec2((uv.x - pillarX) * 30.0, (uv.y - pillarY) * 2.632));
    
			    float pillarWidth = 0.848 * sin(seed / 20.0);
			    float pillar = smoothstep(pillarWidth, 0.0, distance);
    
			    float timeOffset = seed;  
			    float fade = sin(u_time * 12.912 + timeOffset) * 0.5 + 0.5;
			    
			    color += pillar * fade;
			}
			
			color = pow(color, 1.0);
			
			gl_FragColor = vec4(vec3(0.3, color, 0.3), color);
		    }
		`
		});
	}
}