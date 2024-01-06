import { useEffect, useState } from "react";
import { getState } from "../../Models/State"
import SelectedCity from "./SelectedEntity/SelectedCity"
import SelectedSquad from "./SelectedEntity/SelectedSquad"
import { events, listeners } from "../../Models/Signals";

export default function SelectionHUD({
	isSelectingMoveTarget,
}: {
	isSelectingMoveTarget: boolean,
}) {
	const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
	const [selectedEntityType, setSelectedEntityType] = useState<string | null>(null);
	const [selectedSquads, setSelectedSquads] = useState<string[]>([]);

	const state = getState()

	useEffect(() => {
		listeners(
			[
				[events.SQUAD_SELECTED, (id: string) => {
					setSelectedEntityId(id);
					setSelectedEntityType("squad");
					setSelectedSquads([]);
				}],
				[events.CITY_SELECTED, (id: string) => {
					setSelectedEntityId(id);
					setSelectedEntityType("city");
					setSelectedSquads([]);
				}],
				[events.MULTIPLE_SQUADS_SELECTED, (ids: string[]) => {
					setSelectedSquads(ids);
					setSelectedEntityId(null);
					setSelectedEntityType(null);
				}],
			]
		)
	}, []);


	// if (selectedSquads.length > 0)
	//   return <MultipleSelection
	//     entities={selectedSquads.map(id => state.squads.find(squad => squad.id === id))}
	//   />

	if (selectedEntityType === "squad") {
		const squad = state.squads.find(squad => squad.id === selectedEntityId)
		if (!squad) throw new Error("Squad not found")
		return <SelectedSquad
			squad={squad}
			isSelectingMoveTarget={isSelectingMoveTarget}
		/>
	}
	if (selectedEntityType === "city") {
		const city = state.cities.find(city => city.id === selectedEntityId)
		if (!city) throw new Error("City not found")
		return <SelectedCity city={city} />
	}

	return null
}