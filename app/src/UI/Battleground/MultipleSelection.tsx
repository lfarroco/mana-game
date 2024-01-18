import { emit_, events } from "../../Models/Signals"
import { Squad } from "../../Models/Squad"
import { getState } from "../../Models/State"

export default function MultipleSelection({
	ids
}: {
	ids: string[]
}) {

	const state = getState()

	const squads = ids.map(id => state.squads.find(squad => squad.id === id)).filter(squad => !!squad) as Squad[]


	return <div className="row" id="selected-entity">

		<div className="col col-6"
		>
			{
				squads.map(squad =>
					<img
						key={`squad-member-${squad.id}`}
						className="img-fluid portrait-sm"
						src={`assets/jobs/${squad.job}/portrait.png`}
						alt={squad.name}
						onClick={emit_(events.UNITS_SELECTED, squad.id)}
					/>
				)
			}
		</div>
		<div className="col-2">

		</div>
		<div className="col col-4 mt-4">

		</div>

	</div >

}