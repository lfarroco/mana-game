import { Button } from "react-bootstrap"
import { Squad } from "../../../Models/Squad"
import "./styles.css"
const SelectedSquad = ({ squad }: { squad: Squad }) => {

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
			<Button className="col-12">
				Move
			</Button>
			<Button className="col-12">
				Details
			</Button>
		</div>

	</div>

}

export default SelectedSquad