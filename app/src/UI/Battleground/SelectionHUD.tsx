import { useEffect, useState } from "react";
import { getState } from "../../Models/State";
import SelectedCity from "./SelectedEntity/SelectedCity";
import SelectedSquad from "./SelectedEntity/SelectedSquad";
import { events, listeners } from "../../Models/Signals";
import MultipleSelection from "./MultipleSelection";

export default function SelectionHUD({
  isSelectingMoveTarget,
}: {
  isSelectingMoveTarget: boolean;
}) {
  const [selectedSquads, setSelectedSquads] = useState<string[]>([]);

  const [selectedCities, setSelectedCities] = useState<string[]>([]);

  const state = getState();

  useEffect(() => {
    listeners([
      [
        events.UNITS_SELECTED,
        (ids: string[]) => {
          setSelectedSquads(ids);
        },
      ],
      [
        events.CITIES_SELECTED,
        (ids: string[]) => {
          setSelectedCities(ids);
        },
      ],
    ]);
  }, []);

  if (selectedSquads.length + selectedCities.length > 1)
    return <MultipleSelection units={selectedSquads} cities={selectedCities} />;
  else if (selectedSquads.length === 1) {
    const squad = state.squads.find((squad) => squad.id === selectedSquads[0]);
    if (!squad) throw new Error("Squad not found");
    return (
      <SelectedSquad
        squad={squad}
        isSelectingMoveTarget={isSelectingMoveTarget}
      />
    );
  } else if (selectedCities.length === 1) {
    const city = state.cities.find((city) => city.id === selectedCities[0]);
    if (!city) throw new Error("City not found");
    return <SelectedCity city={city} />;
  }

  return null;
}
