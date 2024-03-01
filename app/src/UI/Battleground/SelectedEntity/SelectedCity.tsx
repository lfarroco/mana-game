import { UNIT_STATUS_KEYS, Unit } from "../../../Models/Unit"
import "./styles.css"
import * as Signals from "../../../Models/Signals"
import { FORCE_ID_PLAYER } from "../../../Models/Force"
import { Row } from "react-bootstrap"
import { getJob } from "../../../Models/Job"
import ManaButton from "../../Components/Button"
import { City } from "../../../Models/City"

const BUTTON_STYLE = {
	width: 64,
	height: 64,
	fontSize: 12,
	padding: 0,
	margin: 0,
	borderRadius: 0,
	border: 'none'
}

const SelectedCity = ({
	city,
}: {
	city: City,
}) => {


	const actionsGrid = <ButtonGrid actions={

		[
			{
				icon: "assets/jobs/archer/portrait.png",
				onClick: () => {
				}
			},
			{
				icon: "assets/jobs/soldier/portrait.png",
				onClick: () => {
				}
			},
			{
				icon: "assets/jobs/cleric/portrait.png",
				onClick: () => {
				}
			},
			{
				icon: "assets/jobs/monk/portrait.png",
				onClick: () => {
				}
			},
			{
				icon: "assets/jobs/skeleton/portrait.png",
				onClick: () => {
				}
			},
			{
				icon: "assets/jobs/rogue/portrait.png",
				onClick: () => {
				}
			},

		]

	} />


	return <div
		id="selected-entity"
		className="container"
	>
		<Row>
			<div className="col col-3 mt-2"
				style={{
					textAlign: "center",
				}}
			>

				<img
					className="img-fluid portrait"
					src={`assets/cities/${city.type}.png`}
					alt={city.type}
				/>
				<div
					style={{
						color: "#13ec13",
					}}
				>{
						city.type
					}
				</div>

			</div>
			<div className="col col-6" >
				{actionsGrid}
			</div>

		</Row>

	</div >

}

export default SelectedCity






function ButtonGrid(props: { actions: { icon: string, onClick: () => void }[] }) {

	const { actions } = props

	const maybeButton = (index: number) => {
		const action = actions[index]
		if (action) {
			return <ManaButton
				style={BUTTON_STYLE}
				onClick={action.onClick}
				icon={action.icon}
				iconSize={64}
			/>

		} else {
			return null
		}
	}
	const indices = Array.from({ length: 6 }, (v, k) => k)
	return <> {
		indices.map(index => {
			return <div className="grid-cell" key={index}>
				{maybeButton(index)}
			</div>
		})
	} </>

}
