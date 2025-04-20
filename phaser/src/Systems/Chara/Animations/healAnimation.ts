import { getSkill, HEAL } from "../../../Models/Skill";
import { getBattleUnit } from "../../../Models/State";
import { healUnit } from "../Chara";
import { Unit, unitLog } from "../../../Models/Unit";
import { popText } from "./popText";
import { delay } from "../../../Utils/animation";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import * as UnitManager from "../../../Scenes/Battleground/Systems/UnitManager";

export async function healAnimation(
    scene: BattlegroundScene,
    unit: Unit,
    target: Unit
) {

    const activeChara = UnitManager.getChara(unit.id);

    const targetUnit = getBattleUnit(scene.state)(target.id);

    const targetChara = UnitManager.getChara(targetUnit.id);

    if (!activeChara) { throw new Error("no active unit\n" + unit.id); }

    const skill = getSkill(HEAL);

    if (targetUnit.hp <= 0) {
        throw new Error("target is dead");
    }

    unitLog(unit, `will cast ${skill.name} on ${targetUnit.id}`);

    await popText({ text: skill.name, targetId: unit.id });

    scene.playFx("audio/curemagic");

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

    popText({ text: skill.power.toString(), targetId: targetUnit.id });

    await delay(scene, 500 / scene.speed);

    shader.destroy();

    healUnit(targetUnit, 50);

}
