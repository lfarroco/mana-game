import { useEffect, useState } from "react";
import { getCity, getSquad, getState } from "../../Models/State";
import SelectedCity from "./SelectedEntity/SelectedCity";
import SelectedSquad from "./SelectedEntity/SelectedSquad";
import { signals, listeners } from "../../Models/Signals";
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
        signals.UNITS_SELECTED,
        (ids: string[]) => {
          setSelectedSquads(ids);
        },
      ],
      [
        signals.CITIES_SELECTED,
        (ids: string[]) => {
          setSelectedCities(ids);
        },
      ],
    ]);
  }, []);

  if (selectedSquads.length + selectedCities.length > 1)
    return <MultipleSelection units={selectedSquads} cities={selectedCities} />;
  else if (selectedSquads.length === 1) {
    const squad = getSquad(state)(selectedSquads[0]);
    return (
      <SelectedSquad
        squad={squad}
        isSelectingMoveTarget={isSelectingMoveTarget}
      />
    );
  } else if (selectedCities.length === 1) {
    const city = getCity(state)(selectedCities[0]);
    return <SelectedCity city={city} />;
  }

  return null;
}
