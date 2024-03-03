import { UNIT_STATUS_KEYS, Unit } from "../../../Models/Unit"
import "./styles.css"
import * as Signals from "../../../Models/Signals"
import { FORCE_ID_PLAYER } from "../../../Models/Force"
import { Row } from "react-bootstrap"
import { getJob } from "../../../Models/Job"
import ManaButton from "../../Components/Button"
import { getSkill } from "../../../Models/Skill"

const BUTTON_STYLE = {
	width: 64,
	height: 64,
	fontSize: 12,
	padding: 0,
	margin: 0,
	borderRadius: 0,
	border: 'none'
}

const SelectedSquad = ({
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

	const actionsGrid = !isPlayerControlled ? <ButtonGrid actions={[]} />
		: isSelectingAttackTarget ? selectAttackTargetActions(unit)
			: isSelectingMoveTarget ? selectMoveTargetActions(unit)
				: isSelectingSkillTarget ? selectSkillTargetActions(unit)
					: UnitActions(unit)

	return <div
		id="selected-entity"
		className="container"
	>

		<Row>
			<div className="col col-3 mt-2"
				style={{
					borderRight: "1px solid white",
					textAlign: "center",
				}}
			>

				<img
					key={`unit-member-${unit.id}`}
					className="img-fluid portrait"
					src={`assets/jobs/${unit.job}/portrait.png`}
					alt={unit.name}
				/>
				<div
					style={{
						color: "#13ec13",
					}}
				>
					{unit.hp} / {unit.maxHp}
				</div>
			</div>
			<div className="col-3 align-self-center" >
				<div> <span className="attr">Status: </span> {status} </div>
				<div> <span className="attr">Attack:</span> {job.attackPower + job.dices} - {job.attackPower + job.dices * 3} </div>
				<div> <span className="attr">Defense:</span> 2 </div>
				<div> <span className="attr">Range:</span> {job.attackRange === 1 ? "Melee" : `Ranged (${job.attackRange})`} </div>

			</div>
			<div className="col col-6" >
				{actionsGrid}
			</div>

		</Row>

	</div >

}

export default SelectedSquad

function selectAttackTargetActions(unit: Unit) {
	return <ButtonGrid actions={[
		{
			icon: "icon-cancel",
			tooltipTitle: "Cancel",
			tooltipContent: "Cancel attacking",
			onClick: () => {
				Signals.emit(Signals.signals.SELECT_ATTACK_TARGET_CANCEL, unit.id)
			}
		}
	]}
	/>
}
function selectSkillTargetActions(unit: Unit) {
	return <ButtonGrid actions={[
		{
			icon: "icon-cancel",
			tooltipTitle: "Cancel",
			tooltipContent: "Cancel using this skill",
			onClick: () => {
				Signals.emit(Signals.signals.SELECT_SKILL_TARGET_CANCEL, unit.id)
			}
		}
	]}
	/>
}

function selectMoveTargetActions(unit: Unit) {
	return <ButtonGrid actions={[
		{
			icon: "icon-cancel",
			tooltipTitle: "Cancel",
			tooltipContent: "Cancel moving",
			onClick: () => {
				Signals.emit(Signals.signals.SELECT_UNIT_MOVE_CANCEL, unit.id)
			}
		}
	]}
	/>
}

function UnitActions(unit: Unit) {

	const job = getJob(unit.job)
	const skills = job.skills.map(skillId => {

		const skill = getSkill(skillId)
		return {
			icon: `icon-${skillId}`,
			tooltipTitle: skill.name,
			tooltipContent: skill.tooltip,
			onClick: () => {
				Signals.emit(Signals.signals.SELECT_SKILL_TARGET_START, unit.id, skillId)
			}
		}
	});

	return <ButtonGrid
		actions={[
			{
				icon: "icon-move",
				tooltipTitle: "Move",
				tooltipContent: "Move to a different location. Will ignore enemies in the way.",
				onClick: () => {
					Signals.emit(Signals.signals.SELECT_UNIT_MOVE_START, unit.id)
				}
			},
			{
				icon: "icon-attack",
				tooltipTitle: "Attack",
				tooltipContent: "Attack an enemy unit in your range.",
				onClick: () => {

					Signals.emit(Signals.signals.SELECT_ATTACK_TARGET_START, unit.id)
				}
			},
			{
				icon: "icon-stop",
				tooltipTitle: "Stop",
				tooltipContent: "Stop the unit from moving or attacking.",
				onClick: () => {

					Signals.emit(Signals.signals.UNIT_MOVE_STOP, unit.id)
				}
			},
			...skills

		]} />
}


function ButtonGrid(props: {
	actions: {
		icon: string,

		tooltipTitle: string,
		tooltipContent: string,
		onClick: () => void
	}[]
}) {

	const { actions } = props

	const maybeButton = (index: number) => {
		const action = actions[index]
		if (action) {
			return <ManaButton
				style={BUTTON_STYLE}
				onClick={action.onClick}
				icon={`assets/ui/${action.icon}.png`}
				tooltipTitle={action.tooltipTitle}
				tooltipContent={action.tooltipContent}
			/>

		} else {
			return null
		}
	}
	const indices = Array.from({ length: 6 }, (v, k) => k)
	return <> {
		indices.map(index => {
			return <div className="grid-cell" key={index}>
				{maybeButton(index)}
			</div>
		})
	} </>

}
