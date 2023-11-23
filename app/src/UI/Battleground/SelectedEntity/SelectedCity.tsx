import { City } from "../../../Models/City"
import { emit, index } from "../../../Models/Signals"
import "./styles.css"
const SelectedCity = ({ city }: { city: City }) => {

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
			<div
				className="col-12 btn btn-secondary"
				onClick={
					() => {
						emit(index.TOGGLE_DISPATCH_MODAL, true)
					}
				}
			>Dispatch</div>
			<div className="col-12 btn btn-secondary">Shop</div>

		</div>
	</div>

}

export default SelectedCity