import { useEffect, useState } from "react";
import { getCity, getUnit, getState } from "../../Models/State";
import SelectedCity from "./SelectedEntity/SelectedCity";
import SelectedUnit from "./SelectedEntity/SelectedUnit";
import { signals, listeners } from "../../Models/Signals";

export default function SelectionHUD({
  isSelectingMoveTarget,
  isSelectingAttackTarget,
  isSelectingSkillTarget
}: {
  isSelectingMoveTarget: boolean;
  isSelectingAttackTarget: boolean;
  isSelectingSkillTarget: boolean;
}) {
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);

  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const state = getState();

  useEffect(() => {
    listeners([
      [signals.UNIT_SELECTED, (id: string) => {
        setSelectedUnit(id);
      }],
      [signals.CITY_SELECTED, (id: string) => {
        setSelectedCity(id);
      }],
      [signals.UNIT_DESELECTED, (_id: string) => {
        setSelectedUnit(null);
      }],
      [signals.CITY_DESELECTED, (_id: string) => {
        setSelectedCity(null);
      }]
    ]);
  }, []);
  return <>
    {selectedUnit &&
      <SelectedUnit
        unit={getUnit(state)(selectedUnit)}
        isSelectingMoveTarget={isSelectingMoveTarget}
        isSelectingAttackTarget={isSelectingAttackTarget}
        isSelectingSkillTarget={isSelectingSkillTarget}
      />}
    {selectedCity &&
      <SelectedCity city={getCity(state)(selectedCity)} />
    }
  </>
}
