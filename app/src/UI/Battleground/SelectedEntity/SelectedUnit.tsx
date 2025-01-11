import { Unit } from "../../../Models/Unit"
import "./styles.css"
import * as Signals from "../../../Models/Signals"
import { FORCE_ID_PLAYER } from "../../../Models/Force"
import { getJob } from "../../../Models/Job"
import { getSkill } from "../../../Models/Skill"
import SelectedEntity, { ButtonGridAction } from "./SelectedEntity"

const SelectedUnit = ({
	unit,
	isSelectingMoveTarget,
	isSelectingSkillTarget,
}: {
	unit: Unit,
	isSelectingMoveTarget: boolean,
	isSelectingSkillTarget: boolean
}) => {

	const isPlayerControlled = unit.force === FORCE_ID_PLAYER

	const getStatus = () => {
		return "Unknown"
	}
	const status = getStatus()

	const job = getJob(unit.job)

	const actionsGrid = !isPlayerControlled ? []
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


function UnitActions(unit: Unit): ButtonGridAction[] {

	const job = getJob(unit.job)
	const skills = [job.skill].map(skillId => {

		const skill = getSkill(skillId)
		return {
			id: skillId,
			icon: `assets/ui/icon-${skillId}.png`,
			tooltipTitle: skill.name,
			tooltipContent: skill.tooltip,
			active: true,
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
			active: unit.path.length > 0,
			enabled: true
		},
		{
			icon: "assets/ui/icon-stop.png",
			tooltipTitle: "Stop",
			tooltipContent: "Stop the unit from moving or attacking.",
			onClick: () => {

				Signals.emit(Signals.signals.UNIT_MOVE_STOP, unit.id)
			},
			active: unit.path.length > 0,
			enabled: true
		},
		...skills

	]
}
