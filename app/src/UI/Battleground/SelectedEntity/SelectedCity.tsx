import "./styles.css"
import { City } from "../../../Models/City"
import { emit, signals } from "../../../Models/Signals"
import SelectedEntity, { makeButtonGridAction } from "./SelectedEntity"

const SelectedCity = ({
	city,
}: {
	city: City,
}) => {

	const actionsGrid = ["archer", "soldier"].map(job =>
		makeButtonGridAction(
			`assets/jobs/${job}/portrait.png`,
			`Recruit ${job}`,
			"Recruit",
			false,
			() => {

				if (!city.force) return
				emit(signals.RECRUIT_UNIT, city.force, job, city.boardPosition)

			}, 
			true
		)
	)

	return <SelectedEntity
		portraitSrc={`assets/cities/${city.type}.png`}
		portraitAlt={city.type}
		hp={0}
		maxHp={0}
		actions={actionsGrid}
		description={<>
			{city.type}
		</>
		}
	/>

}

export default SelectedCity




