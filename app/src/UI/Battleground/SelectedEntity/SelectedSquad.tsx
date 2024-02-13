import { UNIT_STATUS_KEYS, Unit } from "../../../Models/Unit"
import "./styles.css"
import * as Signals from "../../../Models/Signals"
import { FORCE_ID_PLAYER } from "../../../Models/Force"
import { Button, Row } from "react-bootstrap"
import { getJob } from "../../../Models/Job"

const BUTTON_STYLE = {
	width: 48,
	height: 48,
	fontSize: 10,
	padding: 0,
	margin: 0,
	borderRadius: 0,
	border: 'none'
}

const SelectedSquad = ({
	squad,
	isSelectingMoveTarget
}: {
	squad: Unit,
	isSelectingMoveTarget: boolean
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

	const actionsGrid = !isSelectingMoveTarget && isPlayerControlled ? UnitActions(squad)
		: isSelectingMoveTarget ? selectTargetActions(squad)
			: <ButtonGrid actions={[]} />

	return <div id="selected-entity"
		className="container"
		style={{
			width: 360,
			position: 'fixed',
			bottom: 0,
			right: 0,
			//backgroundColor: "#020403",
			background: "rgba(2, 4, 3, 0.3)",
			padding: "5px",
			borderTopLeftRadius: 5
		}}

	>

		<Row>


			<div className="col col-3 mt-2"
				style={{
					borderRight: "1px solid white",
					textAlign: "center",
					fontSize: 10
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
					{
						squad.hp
					} / {
						squad.maxHp
					}
				</div>

			</div>
			<div className="col-3 align-self-center"

				style={{ fontSize: 10 }}
			>
				<div> <span className="attr">Status: </span> {status} </div>
				<div> <span className="attr">Attack:</span> {job.attackPower + job.dices} - {job.attackPower + job.dices * 3} </div>
				<div> <span className="attr">Defense:</span> 2 </div>
				<div> <span className="attr">Range:</span> {job.attackType} </div>

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


function selectTargetActions(squad: Unit) {
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
					console.log("Attack")
				}
			},

		]} />
}


function ButtonGrid(props: { actions: { icon: string, label: string, onClick: () => void }[] }) {

	const { actions } = props

	const maybeButton = (index: number) => {
		const action = actions[index]
		if (action) {
			return <Button
				key={index}
				style={BUTTON_STYLE}
				variant="dark"
				onClick={action.onClick}
			>
				<img src={`assets/ui/${action.icon}.png`} alt="Move"
					style={{
						width: 16,
						height: 16,
					}} />
				<div>
					{action.label}
				</div>
			</Button>
		} else {
			return null
		}
	}
	const indices = Array.from({ length: 6 }, (v, k) => k)
	return <> {
		indices.map(index => {
			return <div className="grid-cell">
				{maybeButton(index)}
			</div>
		})
	} </>

}
