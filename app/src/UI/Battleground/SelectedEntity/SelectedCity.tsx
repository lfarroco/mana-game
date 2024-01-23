import { Button } from "react-bootstrap"
import { City } from "../../../Models/City"
import { emit_, events } from "../../../Models/Signals"
import "./styles.css"
import { FORCE_ID_PLAYER } from "../../../Models/Force"
const SelectedCity = ({ city }: { city: City }) => {

	return <div className="row" id="selected-entity">
		<div className="col col-2">
			<img
				className="portrait img-fluid"
				src={`assets/cities/${city.type}.png`} alt={city.name} />
		</div>
		<div className="col col-4">

			<h3>{city.name}</h3>
			<p>{city.type}</p>

		</div>

		<div className="col col-4 pt-3">
			{city.type === "tavern" && city.force === FORCE_ID_PLAYER &&
				<Button
					className="btn btn-secondary"
					onClick={emit_(events.TOGGLE_DISPATCH_MODAL, true)}
				>Recruit</Button>
			}
		</div>

	</div>

}

export default SelectedCity
