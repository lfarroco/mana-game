import { arcaneMissileTargeted } from '../Effects';
import { applyDamageToForce } from '@Models/Entities/Force';
import { Unit } from '@Models/Entities/Unit';
import { scene } from '@Scenes//Battleground/BattlegroundScene';
import { getMoraleBarTipPosition, getShieldBarTipPosition } from '@Scenes//Battleground/MoraleDisplay';
import { getCharaById } from '@Systems/Chara/Chara';
import * as CombatStatsTracker from '@Scenes//Battleground/Systems/CombatStatsTracker';

// Skill-based effect functions that originate from skill icon positions

export function dealDamageFromSkill(sourceUnit: Unit, skillPosition: { x: number; y: number }, amount: number) {
	const targetForce = scene.state.battleData.forces.find(
		(force: { id: string }) => force.id !== sourceUnit.force
	)!;

	const targetPos = targetForce.shield > 0
		? getShieldBarTipPosition(targetForce.id)
		: getMoraleBarTipPosition(targetForce.id);

	arcaneMissileTargeted(
		scene,
		skillPosition,
		targetPos,
		{
			colors: [0xff0000, 0xb22222, 0xdc143c], // Red colors
			amplitudeMin: 5,
			amplitudeMax: 15,
			particleScale: 1.5,
			impact: {
				colors: [0xff0000, 0xb22222],
				scale: 2,
				speed: 200,
				lifespan: 300,
				alpha: 0.4
			},
			onHit: async () => {
				const actualMoraleChange = applyDamageToForce(targetForce, amount);
				CombatStatsTracker.trackDamage(sourceUnit.id, actualMoraleChange, 'normal');
			}
		}
	);
}

export function restoreMoraleFromSkill(sourceUnit: Unit, skillPosition: { x: number; y: number }, amount: number) {
	const targetForce = scene.state.battleData.forces.find(
		(force: { id: string }) => force.id === sourceUnit.force
	)!;

	const targetPos = getMoraleBarTipPosition(targetForce.id);

	arcaneMissileTargeted(
		scene,
		skillPosition,
		targetPos,
		{
			colors: [0x00FF00, 0x32CD32, 0x228B22], // Green colors
			amplitudeMin: 5,
			amplitudeMax: 15,
			particleScale: 1.5,
			impact: {
				colors: [0x00FF00, 0x32CD32],
				scale: 2,
				speed: 200,
				lifespan: 300,
				alpha: 0.4
			},
			onHit: async () => {
				// Restore morale logic would go here
				targetForce.morale = Math.min(targetForce.morale + amount, targetForce.maxMorale);
			}
		}
	);
}

export function addShieldFromSkill(sourceUnit: Unit, skillPosition: { x: number; y: number }, amount: number) {
	const targetForce = scene.state.battleData.forces.find(
		(force: { id: string }) => force.id === sourceUnit.force
	)!;

	const targetPos = getShieldBarTipPosition(targetForce.id);

	arcaneMissileTargeted(
		scene,
		skillPosition,
		targetPos,
		{
			colors: [0x4169E1, 0x0000FF, 0x1E90FF], // Blue colors
			amplitudeMin: 5,
			amplitudeMax: 15,
			particleScale: 1.5,
			impact: {
				colors: [0x4169E1, 0x0000FF],
				scale: 2,
				speed: 200,
				lifespan: 300,
				alpha: 0.4
			},
			onHit: async () => {
				targetForce.shield += amount;
			}
		}
	);
}

export function applyPoisonFromSkill(sourceUnit: Unit, skillPosition: { x: number; y: number }, perTick: number) {
	const enemies = scene.state.battleData.units.filter(u => u.force !== sourceUnit.force);

	enemies.forEach(enemy => {
		const chara = getCharaById(enemy.id);
		if (chara) {
			arcaneMissileTargeted(
				scene,
				skillPosition,
				{ x: chara.x, y: chara.y },
				{
					colors: [0x8A2BE2, 0x9932CC, 0xBA55D3], // Purple colors
					amplitudeMin: 3,
					amplitudeMax: 10,
					particleScale: 1.2,
					impact: {
						colors: [0x8A2BE2, 0x9932CC],
						scale: 1.5,
						speed: 150,
						lifespan: 250,
						alpha: 0.3
					},
					onHit: async () => {
						enemy.effects.push({
							id: "poison",
							perTick
						});
					}
				}
			);
		}
	});
}

export function applyRegenFromSkill(sourceUnit: Unit, skillPosition: { x: number; y: number }, perTick: number) {
	const allies = scene.state.battleData.units.filter(u => u.force === sourceUnit.force && u.id !== sourceUnit.id);

	allies.forEach(ally => {
		const chara = getCharaById(ally.id);
		if (chara) {
			arcaneMissileTargeted(
				scene,
				skillPosition,
				{ x: chara.x, y: chara.y },
				{
					colors: [0x00FF7F, 0x32CD32, 0x228B22], // Light green colors
					amplitudeMin: 3,
					amplitudeMax: 10,
					particleScale: 1.2,
					impact: {
						colors: [0x00FF7F, 0x32CD32],
						scale: 1.5,
						speed: 150,
						lifespan: 250,
						alpha: 0.3
					},
					onHit: async () => {
						ally.effects.push({
							id: "regen",
							perTick
						});
					}
				}
			);
		}
	});
}

export function applyHasteFromSkill(sourceUnit: Unit, skillPosition: { x: number; y: number }, duration: number) {
	const allies = scene.state.battleData.units.filter(u => u.force === sourceUnit.force && u.id !== sourceUnit.id);

	allies.forEach(ally => {
		const chara = getCharaById(ally.id);
		if (chara) {
			arcaneMissileTargeted(
				scene,
				skillPosition,
				{ x: chara.x, y: chara.y },
				{
					colors: [0xFFD700, 0xFFA500, 0xFF8C00], // Gold/orange colors
					amplitudeMin: 5,
					amplitudeMax: 12,
					particleScale: 1.3,
					impact: {
						colors: [0xFFD700, 0xFFA500],
						scale: 1.8,
						speed: 180,
						lifespan: 280,
						alpha: 0.4
					},
					onHit: async () => {
						ally.hasted += duration;
					}
				}
			);
		}
	});
}

export function applySlowFromSkill(sourceUnit: Unit, skillPosition: { x: number; y: number }, duration: number) {
	const enemies = scene.state.battleData.units.filter(u => u.force !== sourceUnit.force);

	enemies.forEach(enemy => {
		const chara = getCharaById(enemy.id);
		if (chara) {
			arcaneMissileTargeted(
				scene,
				skillPosition,
				{ x: chara.x, y: chara.y },
				{
					colors: [0x708090, 0x778899, 0x2F4F4F], // Gray/blue-gray colors
					amplitudeMin: 3,
					amplitudeMax: 8,
					particleScale: 1.1,
					impact: {
						colors: [0x708090, 0x778899],
						scale: 1.3,
						speed: 120,
						lifespan: 200,
						alpha: 0.3
					},
					onHit: async () => {
						enemy.slowed += duration;
					}
				}
			);
		}
	});
}

export function applyChargeFromSkill(sourceUnit: Unit, skillPosition: { x: number; y: number }, amount: number) {
	const allies = scene.state.battleData.units.filter(u => u.force === sourceUnit.force && u.id !== sourceUnit.id);

	allies.forEach(ally => {
		const chara = getCharaById(ally.id);
		if (chara) {
			arcaneMissileTargeted(
				scene,
				skillPosition,
				{ x: chara.x, y: chara.y },
				{
					colors: [0xFFFF00, 0xFFD700, 0xFFA500], // Yellow/gold colors
					amplitudeMin: 4,
					amplitudeMax: 11,
					particleScale: 1.4,
					impact: {
						colors: [0xFFFF00, 0xFFD700],
						scale: 1.6,
						speed: 160,
						lifespan: 260,
						alpha: 0.4
					},
					onHit: async () => {
						ally.charge += amount;
					}
				}
			);
		}
	});
}

export function increasePowerFromSkill(sourceUnit: Unit, skillPosition: { x: number; y: number }, amount: number) {
	const allies = scene.state.battleData.units.filter(u => u.force === sourceUnit.force && u.id !== sourceUnit.id);

	allies.forEach(ally => {
		const chara = getCharaById(ally.id);
		if (chara) {
			arcaneMissileTargeted(
				scene,
				skillPosition,
				{ x: chara.x, y: chara.y },
				{
					colors: [0xFF69B4, 0xFF1493, 0xDC143C], // Pink/red colors
					amplitudeMin: 4,
					amplitudeMax: 11,
					particleScale: 1.4,
					impact: {
						colors: [0xFF69B4, 0xFF1493],
						scale: 1.6,
						speed: 160,
						lifespan: 260,
						alpha: 0.4
					},
					onHit: async () => {
						ally.power += amount;
					}
				}
			);
		}
	});
}

export function multiplyPowerFromSkill(sourceUnit: Unit, skillPosition: { x: number; y: number }, multiplier: number) {
	const allies = scene.state.battleData.units.filter(u => u.force === sourceUnit.force && u.id !== sourceUnit.id);

	allies.forEach(ally => {
		const chara = getCharaById(ally.id);
		if (chara) {
			arcaneMissileTargeted(
				scene,
				skillPosition,
				{ x: chara.x, y: chara.y },
				{
					colors: [0xFF69B4, 0xFF1493, 0xDC143C], // Pink/red colors
					amplitudeMin: 5,
					amplitudeMax: 12,
					particleScale: 1.5,
					impact: {
						colors: [0xFF69B4, 0xFF1493],
						scale: 1.8,
						speed: 180,
						lifespan: 280,
						alpha: 0.4
					},
					onHit: async () => {
						ally.power = Math.floor(ally.power * multiplier);
					}
				}
			);
		}
	});
}

export function grantGoldFromSkill(sourceUnit: Unit, skillPosition: { x: number; y: number }, amount: number) {
	const targetForce = scene.state.battleData.forces.find(
		(force: { id: string }) => force.id === sourceUnit.force
	)!;

	// For gold effects, target the gold display area
	const targetPos = { x: 100, y: 50 }; // Approximate gold display position

	arcaneMissileTargeted(
		scene,
		skillPosition,
		targetPos,
		{
			colors: [0xFFD700, 0xFFA500, 0xFF8C00], // Gold colors
			amplitudeMin: 6,
			amplitudeMax: 15,
			particleScale: 1.6,
			impact: {
				colors: [0xFFD700, 0xFFA500],
				scale: 2.2,
				speed: 200,
				lifespan: 350,
				alpha: 0.5
			},
			onHit: async () => {
				targetForce.gold += amount;
			}
		}
	);
}
