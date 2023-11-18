import { City } from "../../../Models/City"
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
	</div>

}

export default SelectedCity