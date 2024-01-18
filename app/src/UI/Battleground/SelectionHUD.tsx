import { useEffect, useState } from "react";
import { getState } from "../../Models/State"
import SelectedCity from "./SelectedEntity/SelectedCity"
import SelectedSquad from "./SelectedEntity/SelectedSquad"
import { events, listeners } from "../../Models/Signals";
import MultipleSelection from "./MultipleSelection";

export default function SelectionHUD({
	isSelectingMoveTarget,
}: {
	isSelectingMoveTarget: boolean,
}) {
	const [selectedSquads, setSelectedSquads] = useState<string[]>([]);

	const state = getState()

	useEffect(() => {
		listeners(
			[
				[events.UNITS_SELECTED, (ids: string[]) => {
					setSelectedSquads(ids);
				}],
			]
		)
	}, []);


	if (selectedSquads.length > 1)
		return <MultipleSelection
			ids={selectedSquads}
		/>

	if (selectedSquads.length === 1) {
		const squad = state.squads.find(squad => squad.id === selectedSquads[0])
		if (!squad) throw new Error("Squad not found")
		return <SelectedSquad
			squad={squad}
			isSelectingMoveTarget={isSelectingMoveTarget}
		/>
	}
	// if (selectedEntityType === "city") {
	// 	const city = state.cities.find(city => city.id === selectedEntityIds)
	// 	if (!city) throw new Error("City not found")
	// 	return <SelectedCity city={city} />
	// }

	return null
}
