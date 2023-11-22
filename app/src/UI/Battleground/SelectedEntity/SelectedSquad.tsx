import { Button } from "react-bootstrap"
import { Squad } from "../../../Models/Squad"
import "./styles.css"
import events from "events"

const SelectedSquad = ({
	squad,
	events,
	isSelectingMoveTarget
}: {
	squad: Squad,
	events: events.EventEmitter,
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
					events.emit("SELECT_SQUAD_MOVE_START", squad.id)
				}}
				className="col-12">
				Move
			</Button>
				<Button className="col-12">
					Details
				</Button>
			</>
			}{
				isSelectingMoveTarget && <Button
					onClick={() => {
						events.emit("SELECT_SQUAD_MOVE_CANCEL", squad.id)
					}}
					className="col-12">
					Cancel
				</Button>
			}
		</div>

	</div>

}

export default SelectedSquad