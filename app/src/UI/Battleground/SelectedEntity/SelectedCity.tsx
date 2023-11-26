import { Button } from "react-bootstrap"
import { City } from "../../../Models/City"
import { emit, index } from "../../../Models/Signals"
import { getState } from "../../../Scenes/Battleground/BGState"
import "./styles.css"
import { getDispatchableSquads } from "../../../Models/Squad"
const SelectedCity = ({ city }: { city: City }) => {

	const state = getState()

	const dispatchableSquads = getDispatchableSquads(state)

	return <div className="row" id="selected-entity">
		<div className="col col-2">
			<img
				className="img-fluid"
				src={`assets/cities/${city.type}.png`} alt={city.name} />
		</div>
		<div className="col col-8">

			<h3>{city.name}</h3>
			<p>{city.type}</p>
		</div>
		<div className="col col-2">
			<Button
				className="col-12 btn btn-secondary"
				onClick={
					() => {
						emit(index.TOGGLE_DISPATCH_MODAL, true)
					}
				}
				disabled={dispatchableSquads.length < 1}
			>Dispatch</Button>
			<Button className="col-12 btn btn-secondary">Shop</Button>

		</div>
	</div>

}

export default SelectedCity