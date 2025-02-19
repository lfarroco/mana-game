import { useEffect, useState } from "react";
import { getUnit, getState } from "../../Models/State";
import SelectedUnit from "./SelectedEntity/SelectedUnit";
import { signals, listeners } from "../../Models/Signals";

export default function SelectionHUD({
  isSelectingMoveTarget,
  isSelectingSkillTarget
}: {
  isSelectingMoveTarget: boolean;
  isSelectingSkillTarget: boolean;
}) {
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);


  const state = getState();

  useEffect(() => {
    listeners([
      [signals.UNIT_SELECTED, (id: string) => {
        setSelectedUnit(id);
      }],
      [signals.UNIT_DESELECTED, (_id: string) => {
        setSelectedUnit(null);
      }],
    ]);
  }, []);
  return <>
    {selectedUnit &&
      <SelectedUnit
        unit={getUnit(state)(selectedUnit)}
        isSelectingMoveTarget={isSelectingMoveTarget}
        isSelectingSkillTarget={isSelectingSkillTarget}
      />}
  </>
}
