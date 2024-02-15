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
	squad,
	isSelectingMoveTarget,
	isSelectingAttackTarget,
	isSelectingSkillTarget,
}: {
	squad: Unit,
	isSelectingAttackTarget: boolean,
	isSelectingMoveTarget: boolean,
	isSelectingSkillTarget: boolean
}) => {

	const isPlayerControlled = squad.force === FORCE_ID_PLAYER

	const getStatus = () => {
		if (squad.status.type === UNIT_STATUS_KEYS.ATTACKING)
			return "Engaged"

		if (squad.status.type === UNIT_STATUS_KEYS.MOVING)
			return "Moving"

		if (squad.status.type === UNIT_STATUS_KEYS.IDLE)
			return "Idle"
		else
			return "Unknown"
	}
	const status = getStatus()

	const job = getJob(squad.job)

	const actionsGrid = !isPlayerControlled ? <ButtonGrid actions={[]} />
		: isSelectingAttackTarget ? selectAttackTargetActions(squad)
			: isSelectingMoveTarget ? selectMoveTargetActions(squad)
				: isSelectingSkillTarget ? selectSkillTargetActions(squad)
					: UnitActions(squad)

	return <div
		id="selected-squad"
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
					key={`squad-member-${squad.id}`}
					className="img-fluid portrait"
					src={`assets/jobs/${squad.job}/portrait.png`}
					alt={squad.name}
				/>
				<div
					style={{
						color: "#13ec13",
					}}
				>
					{squad.hp} / {squad.maxHp}
				</div>
			</div>
			<div className="col-3 align-self-center" >
				<div> <span className="attr">Status: </span> {status} </div>
				<div> <span className="attr">Attack:</span> {job.attackPower + job.dices} - {job.attackPower + job.dices * 3} </div>
				<div> <span className="attr">Defense:</span> 2 </div>
				<div> <span className="attr">Range:</span> {job.attackType === "melee" ? "Melee" : `Ranged (${job.attackRange})`} </div>

			</div>
			<div className="col col-6"

				style={{
					borderLeft: "1px solid white",
					padding: "5px 0 0 5px",
				}}
			>
				{actionsGrid}
			</div>

		</Row>

	</div >

}

export default SelectedSquad

function selectAttackTargetActions(squad: Unit) {
	return <ButtonGrid actions={[
		{
			label: "Cancel",
			icon: "icon-cancel",
			onClick: () => {
				Signals.emit(Signals.signals.SELECT_ATTACK_TARGET_CANCEL, squad.id)
			}
		}
	]}
	/>
}
function selectSkillTargetActions(squad: Unit) {
	return <ButtonGrid actions={[
		{
			label: "Cancel",
			icon: "icon-cancel",
			onClick: () => {
				Signals.emit(Signals.signals.SELECT_SKILL_TARGET_CANCEL, squad.id)
			}
		}
	]}
	/>
}

function selectMoveTargetActions(squad: Unit) {
	return <ButtonGrid actions={[
		{
			label: "Cancel",
			icon: "icon-cancel",
			onClick: () => {
				Signals.emit(Signals.signals.SELECT_SQUAD_MOVE_CANCEL, squad.id)
			}
		}
	]}
	/>
}

function UnitActions(squad: Unit) {

	const job = getJob(squad.job)
	const skills = job.skills.map(skill => {
		return {
			icon: `icon-${skill}`,
			label: skill,
			onClick: () => {
				Signals.emit(Signals.signals.SELECT_SKILL_TARGET_START, squad.id, skill)
			}
		}
	});

	return <ButtonGrid
		actions={[
			{
				icon: "icon-move",
				label: "Move",
				onClick: () => {
					Signals.emit(Signals.signals.SELECT_SQUAD_MOVE_START, squad.id)
				}
			},
			{
				icon: "icon-attack",
				label: "Attack",
				onClick: () => {

					Signals.emit(Signals.signals.SELECT_ATTACK_TARGET_START, squad.id)
				}
			},
			{
				icon: "icon-stop",
				label: "Stop",
				onClick: () => {

					Signals.emit(Signals.signals.UNIT_MOVE_STOP, squad.id)
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
