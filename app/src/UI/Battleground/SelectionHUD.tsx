import { useEffect, useState } from "react";
import { getCity, getUnit, getState } from "../../Models/State";
import SelectedCity from "./SelectedEntity/SelectedCity";
import SelectedSquad from "./SelectedEntity/SelectedSquad";
import { signals, listeners } from "../../Models/Signals";
import MultipleSelection from "./MultipleSelection";

export default function SelectionHUD({
  isSelectingMoveTarget,
  isSelectingAttackTarget,
  isSelectingSkillTarget
}: {
  isSelectingMoveTarget: boolean;
  isSelectingAttackTarget: boolean;
  isSelectingSkillTarget: boolean;
}) {
  const [selectedSquads, setSelectedSquads] = useState<string[]>([]);

  const [selectedCity, setSelectedCity] = useState<string | null>(null);

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
        signals.CITY_SELECTED,
        (id: string) => {
          setSelectedCity(id);
        },
      ],
      [
        signals.UNITS_DESELECTED,
        (ids: string[]) => {
          setSelectedSquads((prev) => prev.filter((id) => !ids.includes(id)));
        },
      ], [
        signals.CITY_DESELECTED,
        (id: string) => {
          setSelectedCity(null);
        },
      ]
    ]);
  }, []);
  return <>
    {selectedSquads.length > 1 && <MultipleSelection units={selectedSquads} />}
    {selectedSquads.length === 1 &&
      <SelectedSquad
        unit={getUnit(state)(selectedSquads[0])}
        isSelectingMoveTarget={isSelectingMoveTarget}
        isSelectingAttackTarget={isSelectingAttackTarget}
        isSelectingSkillTarget={isSelectingSkillTarget}
      />}
    {selectedCity &&
      <SelectedCity city={getCity(state)(selectedCity)} />
    }
  </>
}
