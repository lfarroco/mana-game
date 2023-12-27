import { Button } from "react-bootstrap"
import { City } from "../../../Models/City"
import { emit_, events } from "../../../Models/Signals"
import { getState } from "../../../Models/State"
import "./styles.css"
import { getPlayerDispatchableSquads } from "../../../Models/Squad"
const SelectedCity = ({ city }: { city: City }) => {

	const state = getState()

	const dispatchableSquads = getPlayerDispatchableSquads(state)

	return <div className="row" id="selected-entity">
		<div className="col col-2">
			<img
				className="img-fluid"
				src={`assets/cities/${city.type}.png`} alt={city.name} />
		</div>
		<div className="col col-4">

			<h3>{city.name}</h3>
			<p>{city.type}</p>
		</div>
		<Button
			className="col col-2 btn btn-secondary"
			onClick={emit_(events.TOGGLE_DISPATCH_MODAL, true)}
			disabled={dispatchableSquads.length < 1}
		>Dispatch</Button>
		<Button
			className="col col-2 btn btn-secondary"
			onClick={emit_(events.TOGGLE_DISPATCH_MODAL, true)}
			disabled={dispatchableSquads.length < 1}
		>Recruit</Button>
		<Button className="col col-2 btn btn-secondary">Shop</Button>

	</div>

}

export default SelectedCity