/**
 * @file Apply Haste trait effect implementation
 * This effect shoots an arcane missile from the source character to each target character with light blue neon colors.
 * When the projectile hits the target, it applies haste duration and displays the original haste visual effect.
 */

import { TraitEffectFn } from '../../TraitEffectSystem';
import { getEffectParams } from '../../TraitSystem.pure';
import { EnergyBeam } from '../../../Effects/EnergyBeam';
import { hasteEffect } from '../../../Effects/hasteEffect';
import { images } from '../../../assets';
import { delay } from '../../../Utils/animation';
import * as CharaManager from '../../../Scenes/Battleground/Systems/CharaManager';

/**
 * Pure function to create the apply haste effect implementation
 * @returns The trait effect function
 */
export function createApplyHasteLogic(): TraitEffectFn {
	return async (context) => {
		const { targets, scene, sourceUnit } = context;
		const duration = getEffectParams(context.traitInstanceParams, context.effectInstance, 'duration', 2000);

		// Get source character position for arcane missile effect
		const sourceChara = CharaManager.getChara(sourceUnit.id);

		for (const target of targets) {
			// Show an arcane missile effect from source to target
			if (scene && sourceChara) {
				const targetChara = CharaManager.getChara(target.id);
				if (targetChara) {
					// Create a custom arcane missile with smaller amplitude and particles
					const source = { x: sourceChara.x, y: sourceChara.y };
					const targetPos = { x: targetChara.x, y: targetChara.y };
					const distance = Phaser.Math.Distance.BetweenPoints(source, targetPos);

					// Create beam with much smaller amplitude (5-15 instead of 30-130)
					const positiveOrNegative = Math.random() > 0.5 ? 1 : -1;
					const beam = new EnergyBeam(scene, {
						start: source,
						end: targetPos,
						thickness: 1,
						amplitude: (10 * Math.random() + 5) * positiveOrNegative, // Much smaller: 5-15 amplitude
						frequency: Math.floor(Math.random() * 2 + 1), // 1-2 frequency
						segments: 20,
						color: 0x00FFFF, // Cyan color for the beam
					});

					beam.updateBeam();
					beam.setVisible(false);

					// Create particles with smaller scale
					const particles = scene.add.particles(
						0, 0,
						images.white_dot.key,
						{
							speed: 20,
							tint: [0x00FFFF, 0x87CEEB, 0xADD8E6], // Light blue neon colors
							lifespan: 600,
							alpha: { start: 1, end: 0 },
							scale: { start: 1.5, end: 0 }, // Much smaller: 1.5 instead of 4
							blendMode: 'ADD',
							radial: true,
						}
					);

					// Create path from beam points
					const path = new Phaser.Curves.Path(beam.points[0].x, beam.points[0].y);
					beam.points.forEach((point) => {
						path.lineTo(point);
					});

					const follower = scene.add.follower(
						path,
						source.x, source.y,
						images.white_dot.key,
					);

					const travelDuration = distance;
					follower.setVisible(false);
					follower.startFollow({
						positionOnPath: true,
						duration: travelDuration,
					});

					// Make particles follow follower
					particles.startFollow(follower);

					await delay(scene, distance * 2);

					particles.stop();

					// Create smaller impact effect
					const impact = scene.add.particles(
						targetPos.x, targetPos.y,
						images.white_dot.key,
						{
							speed: 200, // Reduced from 300
							tint: [0x00FFFF, 0x87CEEB], // Light blue colors
							lifespan: 300, // Reduced from 400
							alpha: { start: 0.4, end: 0 }, // Reduced from 0.5
							scale: { start: 2, end: 0 }, // Much smaller: 2 instead of 6
							blendMode: 'ADD',
						}
					);

					// THIS IS THE MOMENT OF IMPACT - Apply haste mutation and show haste effect
					// Add haste duration to the unit's hasted property
					target.hasted += duration;

					// Show the original haste effect at the target location
					await hasteEffect(scene, { x: targetChara.x, y: targetChara.y }, {
						duration: 1000,
						intensity: 1.5,
						color: 0x00eaff // Light blue color matching the projectile
					});

					await delay(scene, 200); // Reduced from 300

					impact.stop();

					await delay(scene, 300);

					// Cleanup
					beam.destroy();
					particles.destroy();
					impact.destroy();
					follower.destroy();
				}
			} else {
				// Fallback: if no scene or character visual, just apply the haste directly
				target.hasted += duration;
			}
		}
	};
}

/**
 * Apply haste effect implementation for runtime use
 * This is the actual implementation registered with the TraitEffectSystem
 */
export const applyHasteLogicIO: TraitEffectFn = async (context) => {
	// Dynamically import to avoid circular dependencies

	const impl = createApplyHasteLogic();
	return impl(context);
};
