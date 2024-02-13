import { Button, Row } from "react-bootstrap"
import { City } from "../../../Models/City"
import { emit_, signals } from "../../../Models/Signals"
import "./styles.css"
import { FORCE_ID_PLAYER } from "../../../Models/Force"
import ManaButton from "../../Components/Button"
const SelectedCity = ({ city }: { city: City }) => {

	return <div id="selected-entity"

		style={{
			position: 'fixed',
			bottom: 0,
			left: 0,
			backgroundColor: "rgba(2, 4, 3, 0.3)",
			padding: "5px",
			width: "150px",
			fontSize: 10,
			borderTopRightRadius: 5,
			height: 80
		}}>
		<Row>

			<div className="col co-6">
				<img
					className="portrait img-fluid"
					style={{
						width: 48
					}}
					src={`assets/cities/${city.type}.png`} alt={city.name} />
			</div>
			<div className="col col-6">

				<div>{city.name}</div>
				<div>{city.type}</div>
				{city.type === "tavern" && city.force === FORCE_ID_PLAYER &&
					<ManaButton
						css="btn-sm"
						onClick={emit_(signals.TOGGLE_DISPATCH_MODAL, true)}
						label="Recruit" />
				}

			</div>

		</Row>
	</div>
}

export default SelectedCity
