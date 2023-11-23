import { Button } from "react-bootstrap"
import { Squad } from "../../../Models/Squad"
import "./styles.css"
import events from "events"
import * as Signals from "../../../Models/Signals"

const SelectedSquad = ({
	squad,
	isSelectingMoveTarget
}: {
	squad: Squad,
	isSelectingMoveTarget: boolean
}) => {

	return <div className="row" id="selected-entity">
		<div className="col col-2">
			<img
				className="img-fluid"
				src={"assets/jobs/archer/portrait.png"} alt={squad.name} />
		</div>
		<div className="col col-6">

			<h3>{squad.name}</h3>
			<p>{squad.members.toString()}</p>
		</div>
		<div className="col col-4">
			{!isSelectingMoveTarget && <><Button
				onClick={() => {
					Signals.emit(Signals.index.SELECT_SQUAD_MOVE_START, squad.id)
				}}
				className="col-12">
				Move
			</Button>
				<Button
					onClick={() => {

						Signals.emit(Signals.index.TOGGLE_SQUAD_DETAILS_MODAL, true)

					}}
					className="col-12">
					Details
				</Button>
			</>
			}{
				isSelectingMoveTarget && <Button
					onClick={() => {
						Signals.emit(Signals.index.SELECT_SQUAD_MOVE_CANCEL, squad.id)
					}}
					className="col-12">
					Cancel
				</Button>
			}
		</div>

	</div >

}

export default SelectedSquad