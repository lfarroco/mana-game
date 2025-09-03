import * as Effects from '../Effects';
import * as Force from '@Models/Entities/Force';
import { Unit } from '@Models/Entities/Unit';
import { asVec2 } from '@Models/Geometry.pure';
import { scene } from '@Scenes//Battleground/BattlegroundScene';
import * as MoraleDisplay from '@Scenes//Battleground/MoraleDisplay';
import { applyPoison } from '@Scenes/Battleground/Systems/PoisonDamageSystem';
import { applyRegen } from '@Scenes/Battleground/Systems/RegenSystem';
import { getCharaById } from '@Systems/Chara/Chara';
import { increasePower } from './effects';

// Skill-based effect functions that originate from skill icon positions

export function dealDamageFromSkill(targetForce: Force.Force, skillPosition: { x: number; y: number }, amount: number) {

	const targetPos = targetForce.shield > 0
		? MoraleDisplay.getShieldBarTipPosition(targetForce.id)
		: MoraleDisplay.getMoraleBarTipPosition(targetForce.id);

	Effects.arcaneMissileTargeted(
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
				Force.applyDamageToForce(targetForce, amount);
			}
		}
	);
}

export function restoreMoraleFromSkill(targetForce: Force.Force, skillPosition: { x: number; y: number }, amount: number) {

	const targetPos = MoraleDisplay.getMoraleBarTipPosition(targetForce.id);

	Effects.arcaneMissileTargeted(
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
				Force.manipulateForceMorale(targetForce, amount);
			}
		}
	);
}

export function addShieldFromSkill(targetForce: Force.Force, skillPosition: { x: number; y: number }, amount: number) {

	const targetPos = MoraleDisplay.getShieldBarTipPosition(targetForce.id);

	Effects.arcaneMissileTargeted(
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
				Force.manipulateForceShield(targetForce, amount);
			}
		}
	);
}

export function applyPoisonFromSkill(targetForce: Force.Force, skillPosition: { x: number; y: number }, perTick: number) {

	const target = MoraleDisplay.getMoraleBarTipPosition(targetForce.id);
	Effects.arcaneMissileTargeted(
		scene,
		skillPosition,
		target,
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
				applyPoison(targetForce, perTick);
			}
		}
	);
}

export function applyRegenFromSkill(targetForce: Force.Force, skillPosition: { x: number; y: number }, perTick: number) {

	const target = MoraleDisplay.getMoraleBarTipPosition(targetForce.id);

	Effects.arcaneMissileTargeted(
		scene,
		skillPosition,
		target,
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
				applyRegen(targetForce, perTick);
			}
		}
	);
}

export function applyHasteFromSkill(
	targets: Unit[],
	skillPosition: { x: number; y: number },
	duration: number,
) {

	targets.forEach(unit => {
		Effects.arcaneMissileTargeted(
			scene,
			skillPosition,
			asVec2(getCharaById(unit.id)),
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
					unit.hasted += duration;

					Effects.hasteEffect(scene, getCharaById(unit.id), {
						duration: 1000,
						intensity: 1.5,
						color: 0x00eaff
					});
				}
			}
		);
	});
}

export function applySlowFromSkill(
	units: Unit[],
	skillPosition: { x: number; y: number },
	duration: number,
) {

	units.forEach(unit => {
		const chara = getCharaById(unit.id);
		if (chara) {
			Effects.arcaneMissileTargeted(
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
						unit.slowed += duration;
						Effects.slowEffect(scene, getCharaById(unit.id), {
							duration: 1000,
							intensity: 1.5,
							color: 0x00eaff
						});
					}
				}
			);
		}
	});
}

export function applyChargeFromSkill(
	units: Unit[],
	skillPosition: { x: number; y: number },
	amount: number,
) {

	units.forEach(unit => {
		const chara = getCharaById(unit.id);
		Effects.arcaneMissileTargeted(
			scene,
			skillPosition,
			chara,
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
					unit.charge += amount;
				}
			}
		);
	});
}

export function increasePowerFromSkill(
	units: Unit[],
	skillPosition: { x: number; y: number },
	amount: number
) {

	units.forEach(unit => {
		const chara = getCharaById(unit.id);
		Effects.arcaneMissileTargeted(
			scene,
			skillPosition,
			chara,
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
					increasePower([unit], amount)
				}
			}
		);
	});
}

export function multiplyPowerFromSkill(
	units: Unit[],
	skillPosition: { x: number; y: number },
	multiplier: number
) {

	units.forEach(unit => {
		const chara = getCharaById(unit.id);
		if (chara) {
			Effects.arcaneMissileTargeted(
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
						unit.power = Math.floor(unit.power * multiplier);
					}
				}
			);
		}
	});
}

export function grantGoldFromSkill(
	targetForce: Force.Force,
	skillPosition: { x: number; y: number },
	amount: number
) {

	const targetPos = { x: 100, y: 50 };

	Effects.arcaneMissileTargeted(
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
