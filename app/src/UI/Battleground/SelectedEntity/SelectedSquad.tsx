import { Button } from "react-bootstrap"
import { SQUAD_STATUS, Squad } from "../../../Models/Squad"
import "./styles.css"
import * as Signals from "../../../Models/Signals"
import { FORCE_ID_PLAYER } from "../../../Models/Force"

const SelectedSquad = ({
	squad,
	isSelectingMoveTarget
}: {
	squad: Squad,
	isSelectingMoveTarget: boolean
}) => {

	const isPlayerControlled = squad.force === FORCE_ID_PLAYER

	const getStatus = () => {
		if (squad.status === SQUAD_STATUS.ATTACKING)
			return "Engaged"

		if (squad.status === SQUAD_STATUS.MOVING)
			return "Moving"

		if (squad.status === SQUAD_STATUS.IDLE)
			return "Idle"
		else
			return "Unknown"
	}
	const status = getStatus()

	return <div className="row" id="selected-entity">

		<div className="col col-6"
		>
			<img
				key={`squad-member-${squad.id}`}
				className="img-fluid portrait"
				src={`assets/jobs/${squad.job}/portrait.png`}
				alt={squad.name}
			/>
		</div>
		<div className="col-2">
			<div>
				Status:
				{
					status
				}
			</div>
			<div>
				Stamina:
				{
					squad.stamina
				}
			</div>
		</div>
		<div className="col col-4 mt-4">
			{!isSelectingMoveTarget && <>
				{isPlayerControlled && <Button
					onClick={() => {
						Signals.emit(Signals.events.SELECT_SQUAD_MOVE_START, squad.id)
					}}
				>
					Move
				</Button>}
			</>
			}{
				isSelectingMoveTarget && <Button
					onClick={() => {
						Signals.emit(Signals.events.SELECT_SQUAD_MOVE_CANCEL, squad.id)
					}}
					className="col-12">
					Cancel
				</Button>
			}
		</div>

	</div >

}

export default SelectedSquad