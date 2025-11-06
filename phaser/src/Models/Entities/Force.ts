import * as constants from "@Constants/constants";
import { Unit } from "./Unit";
import * as CombatStatsTracker from "@Scenes/Battleground/Systems/CombatStatsTracker";
import { getCore } from "./Card";
import { updateShieldDisplay } from "@Systems/Chara/ShieldDisplay";
import { popText } from "@Systems/Chara/Animations";
import { getCharaById } from "@Systems/Chara/Chara";
import * as LifeDisplay from "@Systems/Chara/LifeDisplay";

export type Force = {
	id: string;
	name: string;
	color: string;
	units: Unit[];
	prestige: number,
	round: number;
	wins: number;
};

export const makeForce = (id: string): Force => {
	return {
		id,
		name: "",
		color: "",
		units: [],
		prestige: 20,
		round: 1,
		wins: 0,
	}
};

export const playerForce = makeForce(constants.FORCE_ID_PLAYER);
export const cpuForce = makeForce(constants.FORCE_ID_CPU);

export const manipulateCoreLife = (
	targetForce: Force,
	amount: number,
	critical = false
): number => {

	const core = getCore(targetForce.id);

	const oldLife = core.life;
	if (amount > 0) {
		core.life = Math.min(core.maxLife, core.life + amount);
	} else {
		core.life = Math.max(0, core.life + amount);
	}
	const actualChange = core.life - oldLife;

	LifeDisplay.updateLifeDisplay(core.id)

	popText({
		x: getCharaById(core.id).x,
		y: getCharaById(core.id).y,
		text: critical ? `${amount} Crit!` : amount.toString(),
		type: "heal",
		critical
	})

	return actualChange;
};

export const manipulateCoreShield = (
	targetForce: Force,
	amount: number,
	isCritical: boolean,
	displayFeedback: boolean = true
): number => {

	const core = getCore(targetForce.id);

	const oldShield = core.shield;
	if (amount > 0) {
		core.shield = core.shield + amount;
	} else {
		core.shield = Math.max(0, core.shield + amount);
	}
	const actualChange = core.shield - oldShield;

	updateShieldDisplay(
		getCore(targetForce.id).id
	);

	if (displayFeedback) {
		const text = isCritical ? `${amount} Crit!` : amount.toString();

		popText({
			x: getCharaById(core.id).x,
			y: getCharaById(core.id).y,
			text: text,
			type: "shield",
			critical: isCritical
		})
	}

	return actualChange;
};

export const applyDamageToForce = (
	targetForce: Force,
	damage: number,
	shieldPiercingPercentage: number = 0,
	damageType?: "poison" | "normal" | "timeout",
	critical = false
): number => {
	if (damage <= 0) return 0;

	const core = getCore(targetForce.id);
	const coreChara = getCharaById(core.id);

	let remainingDamage = damage;
	const originalLife = core.life;

	if (damageType === "poison") {
		const lifeChage = manipulateCoreLife(targetForce, -damage);

		const text = !!critical ? `${lifeChage} Crit!` : lifeChage.toString();

		CombatStatsTracker.trackLifeChange({
			forceId: targetForce.id,
			newLife: core.life,
			maxLife: core.maxLife,
			totalDamage: damage,
			damageType: damageType,
		});

		popText({
			x: coreChara.x,
			y: coreChara.y,
			text,
			type: "poison",
			critical: !!critical
		})

		return Math.abs(lifeChage);
	}

	let effectiveShield = core.shield;
	if (shieldPiercingPercentage > 0 && core.shield > 0) {
		const piercedShield = Math.floor(core.shield * (shieldPiercingPercentage / 100));
		effectiveShield = Math.max(0, core.shield - piercedShield);
	}

	if (effectiveShield > 0) {
		const shieldAbsorbed = Math.min(remainingDamage, effectiveShield);
		manipulateCoreShield(targetForce, -shieldAbsorbed, false, false);
		remainingDamage -= shieldAbsorbed;
	}

	const lifeChange = remainingDamage > 0 ?
		manipulateCoreLife(targetForce, -remainingDamage) :
		0;

	if (core.life !== originalLife) {
		CombatStatsTracker.trackLifeChange({
			forceId: targetForce.id,
			newLife: core.life,
			maxLife: core.maxLife,
			totalDamage: damage,
			damageType: damageType,
		})
	}

	const text = !!critical ? `${damage} Crit!` : damage.toString();

	popText({
		x: coreChara.x,
		y: coreChara.y,
		text,
		type: "damage",
		critical: !!critical
	})

	return Math.abs(lifeChange);
};

export const getUnitForce = (unitId: string) => {
	const unit = state.battleData.units.find(u => u.id === unitId)!
	return state.battleData.forces.find(f => f.id === unit.force)!
}

export const getEnemyForce = (unitId: string) => {
	const unit = state.battleData.units.find(u => u.id === unitId)!
	return state.battleData.forces.find(f => f.id !== unit.force)!
}