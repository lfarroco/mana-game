import { getState } from "../../../Models/State";
import { popText } from "./popText";
import { Chara } from "../Chara";
import { delay, tween } from "../../../Utils/animation";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { HALF_TILE_WIDTH, HALF_TILE_HEIGHT } from "../../../Scenes/Battleground/constants";

export async function slashAnimation(
	scene: BattlegroundScene,
	activeChara: Chara,
	targetChara: Chara,
	damage: number) {

	const effectShader = new Phaser.Display.BaseShader('healingShader', `
precision mediump float;

uniform float time; // provided by Phaser
uniform vec2 resolution; // provided by Phaser
varying vec2 fragCoord; // provided by Phaser

const int numPillars = 40;

float random(float x) {
    return fract(sin(x * 12.9898) * 43758.5453);
}

void main() {
    // Normalize UV coordinates to [0.0, 1.0]
    vec2 uv = fragCoord.xy / resolution;

    // Center UV coordinates around (0.5, 0.5)
    uv -= 0.5;

    // Maintain aspect ratio
    uv.x *= resolution.x / resolution.y;

    float color = 0.0;

    // Define pillar bounds in normalized coordinates
    const float min_x = -0.404;  // Adjusted for centered positioning
    const float max_x = 0.372;
    const float min_y = -0.215;
    const float max_y = 0.191;

    for (int i = 0; i <= numPillars; i++) {
        float seed = float(i);
        float pillarX = min_x + random(seed) * (max_x - min_x);
        float pillarY = min_y + random(seed * 2.0) * (max_y - min_y);
        
        float distance = length(vec2((uv.x - pillarX) * 1.6, (uv.y - pillarY) * 0.3));

        float pillarWidth = 0.1 * abs(sin(seed / 40.0)); // Adjust width for normalized coords
        
        // Soft edges using smoothstep
        float pillar = smoothstep(pillarWidth, 0.0, distance);
        
        // Make the pillars fade in and out randomly
        float timeOffset = seed;
        float fade = sin(time * 10.0 + timeOffset) * 0.5 + 0.5;
        
        // Accumulate color (intensity) for the pillar
        color += pillar * fade;
    }

    // Only make the pillar visible where there's a non-zero color
    float alpha = max(color, 0.0);

    // Apply a slight glow effect
    color = pow(color, 1.5);

    // Set final fragment color: RGB glow (green) and transparency based on alpha
    gl_FragColor = vec4(vec3(0, color, 0), alpha);	 
    }
         `);

	const shader = scene.add.shader(effectShader,
		targetChara.container.x, targetChara.container.y,
		128, 128)
		.setOrigin(0.5, 0.5);

	tween(scene, {
		targets: shader,
		y: targetChara.container.y - HALF_TILE_HEIGHT / 2,
		duration: 500 / getState().options.speed,
	});


	const state = getState();
	const slash = scene.add
		.sprite(0, 0, "cethiel-slash")
		.play("cethiel-slash")
		.setScale(1.5);


	slash.x = targetChara.container.x + HALF_TILE_WIDTH;
	slash.y = targetChara.container.y - HALF_TILE_HEIGHT;

	scene.playFx("audio/sword2");

	scene.time.addEvent({
		delay: 250 / state.options.speed,
		callback: () => {
			popText(scene, damage.toString(), targetChara.unit.id);

			// make target unit flash
			tween(scene, {
				targets: targetChara.container,
				alpha: 0.5,
				duration: 100 / state.options.speed,
				yoyo: true,
				repeat: 4,
			});

		}
	});

	await tween(scene, {
		targets: slash,
		x: targetChara.container.x - HALF_TILE_WIDTH / 2,
		y: targetChara.container.y + HALF_TILE_HEIGHT / 2,
		duration: 500 / state.options.speed,
		onComplete: () => {
			slash.destroy();
			shader.destroy();
		}
	});

}
