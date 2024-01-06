import { emit_, events } from "../../Models/Signals"
import { Squad } from "../../Models/Squad"
import { getState } from "../../Models/State"
import { Unit } from "../../Models/Unit"

export default function MultipleSelection({
	ids
}: {
	ids: string[]
}) {

	const state = getState()

	const squads = ids.map(id => state.squads.find(squad => squad.id === id)).filter(squad => !!squad) as Squad[]

	const leaders = squads
		.map(squad => squad.leader)
		.filter(leader => !!leader)
		.map(leader => state.units.find(unit => unit.id === leader))
		.filter(unit => !!unit) as Unit[]

	return <div className="row" id="selected-entity">

		<div className="col col-6"
		>
			{
				leaders.map(unit =>
					<img
						key={`squad-member-${unit.id}`}
						className="img-fluid portrait-sm"
						src={`assets/jobs/${unit.job}/portrait.png`}
						alt={unit.name}
						onClick={emit_(events.SQUAD_SELECTED, unit.squad)}
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