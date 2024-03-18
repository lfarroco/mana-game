import "./styles.css"
import { Row } from "react-bootstrap"
import ManaButton from "../../Components/Button"
import { City } from "../../../Models/City"
import { emit, signals } from "../../../Models/Signals"

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
				text: "Recruit Archer",
				onClick: () => {

					if (!city.force) return
					emit(signals.RECRUIT_UNIT, city.force, "archer", city.boardPosition)

				},

			},
			{
				icon: "assets/jobs/soldier/portrait.png",
				text: "Recruit Soldier",
				onClick: () => {
					if (!city.force) return
					emit(signals.RECRUIT_UNIT, city.force, "soldier", city.boardPosition)
				}
			},
			{
				icon: "assets/jobs/cleric/portrait.png",
				text: "Recruit Cleric",
				onClick: () => {
					if (!city.force) return
					emit(signals.RECRUIT_UNIT, city.force, "cleric", city.boardPosition)
				}
			},
			{
				icon: "assets/jobs/monk/portrait.png",
				text: "Recruit Monk",
				onClick: () => {
					if (!city.force) return
					emit(signals.RECRUIT_UNIT, city.force, "monk", city.boardPosition)
				}
			},
			{
				icon: "assets/jobs/skeleton/portrait.png",
				text: "Recruit Skeleton",
				onClick: () => {
					if (!city.force) return
					emit(signals.RECRUIT_UNIT, city.force, "skeleton", city.boardPosition)
				}
			},
			{
				icon: "assets/jobs/rogue/portrait.png",
				text: "Recruit Rogue",
				onClick: () => {
					if (!city.force) return
					emit(signals.RECRUIT_UNIT, city.force, "rogue", city.boardPosition)
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






function ButtonGrid(props: {
	actions: {

		icon: string,
		text: string,
		onClick: () => void,
	}[]
}) {

	const { actions } = props

	const maybeButton = (index: number) => {
		const action = actions[index]
		if (action) {
			return <ManaButton
				tooltipContent={action.text}
				style={BUTTON_STYLE}
				onClick={action.onClick}
				icon={action.icon}
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
