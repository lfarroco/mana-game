import { UNIT_STATUS_KEYS, Unit } from "../../../Models/Unit"
import "./styles.css"
import * as Signals from "../../../Models/Signals"
import { FORCE_ID_PLAYER } from "../../../Models/Force"
import { Row } from "react-bootstrap"
import { getJob } from "../../../Models/Job"
import ManaButton from "../../Components/Button"

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
		id="selected-unit"
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
			<div className="col col-6"

				style={{
					borderLeft: "1px solid white",
				}}
			>
				{actionsGrid}
			</div>

		</Row>

	</div >

}

export default SelectedSquad

function selectAttackTargetActions(unit: Unit) {
	return <ButtonGrid actions={[
		{
			label: "Cancel",
			icon: "icon-cancel",
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
			label: "Cancel",
			icon: "icon-cancel",
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
			label: "Cancel",
			icon: "icon-cancel",
			onClick: () => {
				Signals.emit(Signals.signals.SELECT_UNIT_MOVE_CANCEL, unit.id)
			}
		}
	]}
	/>
}

function UnitActions(unit: Unit) {

	const job = getJob(unit.job)
	const skills = job.skills.map(skill => {
		return {
			icon: `icon-${skill}`,
			label: skill,
			onClick: () => {
				Signals.emit(Signals.signals.SELECT_SKILL_TARGET_START, unit.id, skill)
			}
		}
	});

	return <ButtonGrid
		actions={[
			{
				icon: "icon-move",
				label: "Move",
				onClick: () => {
					Signals.emit(Signals.signals.SELECT_UNIT_MOVE_START, unit.id)
				}
			},
			{
				icon: "icon-attack",
				label: "Attack",
				onClick: () => {

					Signals.emit(Signals.signals.SELECT_ATTACK_TARGET_START, unit.id)
				}
			},
			{
				icon: "icon-stop",
				label: "Stop",
				onClick: () => {

					Signals.emit(Signals.signals.UNIT_MOVE_STOP, unit.id)
				}
			},
			...skills

		]} />
}


function ButtonGrid(props: { actions: { icon: string, label: string, onClick: () => void }[] }) {

	const { actions } = props

	const maybeButton = (index: number) => {
		const action = actions[index]
		if (action) {
			return <ManaButton
				style={BUTTON_STYLE}
				onClick={action.onClick}
				icon={action.icon}
				label={action.label}
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
