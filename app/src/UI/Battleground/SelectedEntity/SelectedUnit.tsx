import { UNIT_STATUS_KEYS, Unit } from "../../../Models/Unit"
import "./styles.css"
import * as Signals from "../../../Models/Signals"
import { FORCE_ID_PLAYER } from "../../../Models/Force"
import { getJob } from "../../../Models/Job"
import { getSkill } from "../../../Models/Skill"
import SelectedEntity from "./SelectedEntity"

const SelectedUnit = ({
	unit,
	isSelectingMoveTarget,
	isSelectingAttackTarget,
	isSelectingSkillTarget,
}: {
	unit: Unit,
	isSelectingAttackTarget: boolean,
	isSelectingMoveTarget: boolean,
	isSelectingSkillTarget: boolean
}) => {

	const isPlayerControlled = unit.force === FORCE_ID_PLAYER

	const getStatus = () => {
		if (unit.status.type === UNIT_STATUS_KEYS.ATTACKING)
			return "Engaged"

		if (unit.status.type === UNIT_STATUS_KEYS.MOVING)
			return `Moving ${unit.movementIndex + 1}/5`

		if (unit.status.type === UNIT_STATUS_KEYS.IDLE)
			return "Idle"
		if (unit.status.type === UNIT_STATUS_KEYS.CASTING)
			return "Casting"
		else
			return "Unknown"
	}
	const status = getStatus()

	const job = getJob(unit.job)

	const actionsGrid = !isPlayerControlled ? []
		: isSelectingAttackTarget ? selectAttackTargetActions(unit)
			: isSelectingMoveTarget ? selectMoveTargetActions(unit)
				: isSelectingSkillTarget ? selectSkillTargetActions(unit)
					: UnitActions(unit)

	return <SelectedEntity

		portraitSrc={`assets/jobs/${unit.job}/portrait.png`}
		portraitAlt={unit.name}
		hp={unit.hp}
		maxHp={unit.maxHp}
		mana={unit.mana}
		maxMana={unit.maxMana}
		actions={actionsGrid}
		description={<>

			<div> <span className="attr">Status: </span> {status} </div>
			<div> <span className="attr">Attack:</span> {job.attackPower + job.dices} - {job.attackPower + job.dices * 3} </div>
			<div> <span className="attr">Defense:</span> 2 </div>
			<div> <span className="attr">Range:</span> {job.attackRange === 1 ? "Melee" : `Ranged (${job.attackRange})`} </div>
		</>
		}
	/>

}

export default SelectedUnit

function selectAttackTargetActions(unit: Unit) {
	return [
		{
			icon: "assets/ui/icon-cancel.png",
			tooltipTitle: "Cancel",
			tooltipContent: "Cancel attacking",
			onClick: () => {
				Signals.emit(Signals.signals.SELECT_ATTACK_TARGET_CANCEL, unit.id)
			},
			active: false,
			enabled: true
		}
	]
}
function selectSkillTargetActions(unit: Unit) {
	return [
		{
			icon: "assets/ui/icon-cancel.png",
			tooltipTitle: "Cancel",
			tooltipContent: "Cancel using this skill",
			onClick: () => {
				Signals.emit(Signals.signals.SELECT_SKILL_TARGET_CANCEL, unit.id)
			},
			active: false,
			enabled: true
		},

	]
}

function selectMoveTargetActions(unit: Unit) {
	return [
		{
			icon: "assets/ui/icon-cancel.png",
			tooltipTitle: "Cancel",
			tooltipContent: "Cancel moving",
			onClick: () => {
				Signals.emit(Signals.signals.SELECT_UNIT_MOVE_CANCEL, unit.id)

			},
			active: false,
			enabled: true

		}
	]
}

function UnitActions(unit: Unit) {

	const job = getJob(unit.job)
	const skills = [job.skill].map(skillId => {

		const skill = getSkill(skillId)
		return {
			id: skillId,
			icon: `assets/ui/icon-${skillId}.png`,
			tooltipTitle: skill.name,
			tooltipContent: skill.tooltip,
			enabled: true,
			onClick: () => {
				Signals.emit(Signals.signals.SELECT_SKILL_TARGET_START, unit.id, skillId)
			},
		}
	});

	return [
		{
			icon: "assets/ui/icon-move.png",
			tooltipTitle: "Move",
			tooltipContent: "Move to a different location. Will ignore enemies in the way.",
			onClick: () => {
				Signals.emit(Signals.signals.SELECT_UNIT_MOVE_START, unit.id)
			},
			active: unit.status.type === UNIT_STATUS_KEYS.MOVING,
			enabled: true
		},
		{
			icon: "assets/ui/icon-attack.png",
			tooltipTitle: "Attack",
			tooltipContent: "Attack an enemy unit in your range.",
			onClick: () => {

				Signals.emit(Signals.signals.SELECT_ATTACK_TARGET_START, unit.id)
			},
			active: unit.status.type === UNIT_STATUS_KEYS.ATTACKING,
			enabled: true
		},
		{
			icon: "assets/ui/icon-stop.png",
			tooltipTitle: "Stop",
			tooltipContent: "Stop the unit from moving or attacking.",
			onClick: () => {

				Signals.emit(Signals.signals.UNIT_MOVE_STOP, unit.id)
			},
			active: unit.status.type === UNIT_STATUS_KEYS.IDLE,
			enabled: true
		},
		...(skills.map(s => ({
			...s, active:
				unit.status.type === UNIT_STATUS_KEYS.CASTING
				&& 'skill' in unit.status && unit.status.skill === s.id
		})))

	]
}
