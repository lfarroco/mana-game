import { UNIT_STATUS_KEYS, Unit } from "../../../Models/Unit"
import "./styles.css"
import * as Signals from "../../../Models/Signals"
import { FORCE_ID_PLAYER } from "../../../Models/Force"
import { Button, Col, Row } from "react-bootstrap"
import { getJob } from "../../../Models/Job"

const unitOrdersButtonStyle: any = {
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
			width: 300,
			position: 'fixed',
			bottom: 0,
			right: 0,
			backgroundColor: "#020403",
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
					<Col>
						{!isSelectingMoveTarget && <>
							{isPlayerControlled && <><Button

								size="sm"
								variant="dark"
								onClick={() => {
									Signals.emit(Signals.signals.SELECT_SQUAD_MOVE_START, squad.id)
								}}
							>
								Move
							</Button>
								<Button

									size="sm"
									variant="dark"
									style={unitOrdersButtonStyle}
									onClick={() => {
									}}
								>
									Attack
								</Button>
								<Button

									size="sm"
									variant="dark"
									onClick={() => {
									}}
									style={unitOrdersButtonStyle}
								>
									Defend
								</Button>

							</>
							}
						</>
						}


						{
							isSelectingMoveTarget && <Button
								variant="dark"
								className="button"
								size="sm"
								onClick={() => {
									Signals.emit(Signals.signals.SELECT_SQUAD_MOVE_CANCEL, squad.id)
								}}
							>
								Cancel
							</Button>
						}

					</Col>

				</Row>
			</div>

		</Row>

	</div >

}

export default SelectedSquad
