import { UNIT_STATUS_KEYS, Unit } from "../../../Models/Unit"
import "./styles.css"
import * as Signals from "../../../Models/Signals"
import { FORCE_ID_PLAYER } from "../../../Models/Force"
import { Button, Col, Row } from "react-bootstrap"
import { getJob } from "../../../Models/Job"

const BUTTON_STYLE = {
	width: 48,
	height: 48,
	fontSize: 10,
	padding: 0
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

	return <div id="selected-entity"
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


			<div className="col col-4 mt-2"
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
			<div className="col-4 align-self-center"

				style={{ fontSize: 10 }}
			>
				<div> <span className="attr">Status: </span> {status} </div>
				<div> <span className="attr">Attack:</span> {job.attackPower + job.dices} - {job.attackPower + job.dices * 3} </div>
				<div> <span className="attr">Defense:</span> 2 </div>
				<div> <span className="attr">Range:</span> {job.attackType} </div>

			</div>
			<div className="col col-4"

				style={{
					borderLeft: "1px solid white",
					paddingLeft: "20px",
					paddingTop: "10px"
				}}
			>
				<Row >
					{!isSelectingMoveTarget && isPlayerControlled && unitOrders(squad)}

					{
						isSelectingMoveTarget && <Button
							style={BUTTON_STYLE}
							variant="dark"
							className="button"
							onClick={() => {
								Signals.emit(Signals.signals.SELECT_SQUAD_MOVE_CANCEL, squad.id)
							}}
						>
							<img

								style={{
									width: 16,
									height: 16,

								}}
								src="assets/ui/icon-cancel.png" alt="Cancel" />
							<div>

								Cancel
							</div>
						</Button>
					}


				</Row>
			</div>

		</Row>

	</div >

}

export default SelectedSquad


function unitOrders(squad: Unit) {
	return <>
		<Col xs={6}

			className="gx-0"
		>
			<Button
				style={BUTTON_STYLE}
				variant="dark"
				onClick={() => {
					Signals.emit(Signals.signals.SELECT_SQUAD_MOVE_START, squad.id)
				}}
			>
				<img src="assets/ui/icon-move.png" alt="Move"
					style={{
						width: 16,
						height: 16,
					}} />
				<div>

					Move
				</div>
			</Button>
		</Col >
		<Col xs={6}
			className="gx-0"
		>
			<Button

				style={BUTTON_STYLE}
				variant="dark"
				onClick={() => {
				}}
			>
				<img src="assets/ui/icon-attack.png" alt="Attack"
					style={{
						width: 16,
						height: 16,
					}} />
				<div>

					Attack
				</div>
			</Button>

		</Col>
	</>
}

