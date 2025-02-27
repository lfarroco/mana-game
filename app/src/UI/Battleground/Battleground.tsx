import "./styles.css";
import { useEffect, useState } from "react";
import { listeners, signals, emit_, emit, } from "../../Models/Signals";
import DispatchSquadModal from "./RecruitUnitModal/RecruitUnitModal";
import VictoryModal from "./VictoryModal/VictoryModal";
import SelectionHUD from "./SelectionHUD";
import SaveGame from "../SaveGame/SaveGame";
import { getState, } from "../../Models/State";
import { FORCE_ID_PLAYER, Force } from "../../Models/Force";
import { Col, Row } from "react-bootstrap";
import ManaButton from "../Components/Button";

const Battleground = () => {

  const state = getState()
  const [isSelectingMoveTarget] = useState(false);
  const [isSelectingSkillTarget] = useState(false);
  const [tick, setTick] = useState(state.gameData.tick);
  const [gold, setGold] = useState(state.gameData.forces.find(f => f.id === FORCE_ID_PLAYER)?.gold || 0);
  const [nextTurnEnabled, setNextTurnEnabled] = useState(true);

  useEffect(() => {
    listeners([
      [signals.BATTLEGROUND_TICK, (tick: number) => {
        setTick(tick);
      }],
      [signals.UPDATE_FORCE, (force: Partial<Force>) => {
        if (force.id !== FORCE_ID_PLAYER) return
        setGold(force.gold || 0)
      }],
      [signals.TURN_START, () => {
        setNextTurnEnabled(false);
      }],
      [signals.TURN_END, () => {
        setNextTurnEnabled(true);
      }],
    ]);
  }, [state, state.gameData.units]);

  return (
    <>
      <div className="content" id="tooltip">
        <div className="row">
          <div id="tooltip" className="col text-center">
            {isSelectingMoveTarget ? "Select Target" :
              isSelectingSkillTarget ? "Select Skill Target" :
                null}
          </div>
        </div>
      </div>


      <button
        className="btn btn-primary"
        id="next-turn"
        disabled={!nextTurnEnabled}
        onClick={
          () => {
            emit(signals.BATTLE_START, state.gameData.tick)
          }
        }
      >Start Battle</button >

      <footer className="block">
        <div className="content">
        </div>
      </footer>

      <SelectionHUD
        isSelectingMoveTarget={isSelectingMoveTarget}
        isSelectingSkillTarget={isSelectingSkillTarget}
      />

      <DispatchSquadModal />

      <VictoryModal />

      <SaveGame />

    </>
  );
};

export default Battleground;

