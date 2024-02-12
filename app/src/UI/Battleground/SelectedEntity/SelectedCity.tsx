import { Button, Row } from "react-bootstrap"
import { City } from "../../../Models/City"
import { emit_, signals } from "../../../Models/Signals"
import "./styles.css"
import { FORCE_ID_PLAYER } from "../../../Models/Force"
const SelectedCity = ({ city }: { city: City }) => {

	return <div id="selected-entity"

		style={{
			position: 'fixed',
			bottom: 0,
			left: 0,
			backgroundColor: "rgba(2, 4, 3, 0.3)",
			padding: "5px",
			width: "300px",
			fontSize: 10,
			borderTopRightRadius: 5
		}}>
		<Row>

			<div className="col col-4">
				<img
					className="portrait img-fluid"
					src={`assets/cities/${city.type}.png`} alt={city.name} />
			</div>
			<div className="col col-4">

				<div>{city.name}</div>
				<div>{city.type}</div>

			</div>

			<div className="col col-4 pt-3">
				{city.type === "tavern" && city.force === FORCE_ID_PLAYER &&
					<Button
						variant="dark"
						className="button"
						onClick={emit_(signals.TOGGLE_DISPATCH_MODAL, true)}
					>Recruit</Button>
				}
			</div>

		</Row>

	</div>

}

export default SelectedCity
