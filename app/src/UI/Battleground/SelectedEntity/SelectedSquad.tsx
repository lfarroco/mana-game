import { Button } from "react-bootstrap"
import { Squad, getMembers } from "../../../Models/Squad"
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

	const members = getMembers(squad)

	const getStatus = () => {
		if (squad.engaged)
			return "Engaged"

		if (squad.path.length > 0)
			return "Moving"

		if (squad.isRetreating)
			return "Retreating"

		return "Idle"
	}
	const status = getStatus()

	return <div className="row" id="selected-entity">

		<div className="col col-6"
		>
			{
				members.map(unit =>
					<img
						key={`squad-member-${unit.id}`}
						className="img-fluid portrait-sm"
						src={`assets/jobs/${unit.job}/portrait.png`}
						alt={unit.name}
						onClick={Signals.emit_(Signals.events.SET_UNIT_DETAILS_MODAL, unit.id)}
					/>
				)
			}
		</div>
		<div className="col-2">
			<div>
				Status:
				{
					status
				}
			</div>
			<div>
				Morale:
				{
					squad.morale
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
				<Button
					onClick={() => {

						Signals.emit(Signals.events.TOGGLE_SQUAD_DETAILS_MODAL, true)

					}}
				>
					Details
				</Button>
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