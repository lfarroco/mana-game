import { Squad } from "../../../Models/Squad"
import "./styles.css"
const SelectedEntity = ({ entity }: { entity: Squad }) => {

	return <div className="row" id="selected-entity">
		<div className="col col-2">
			<img
				className="img-fluid"
				src={"assets/jobs/archer/portrait.png"} alt={entity.name} />
		</div>
		<div className="col col-8">

			<h3>{entity.name}</h3>
			<p>{entity.members.toString()}</p>
		</div>
	</div>

}

export default SelectedEntity