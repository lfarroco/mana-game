import "./styles.css";
import SquadsWindow from "./SquadsWindow/SquadsWindow";
import { useEffect, useState } from "react";
import { listeners, signals, emit, emit_ } from "../../Models/Signals";
import DispatchSquadModal from "./RecruitUnitModal/RecruitUnitModal";
import VictoryModal from "./VictoryModal/VictoryModal";
import SelectionHUD from "./SelectionHUD";
import SaveGame from "../SaveGame/SaveGame";
import { getState } from "../../Models/State";
import { FORCE_ID_PLAYER, Force } from "../../Models/Force";

const Battleground = () => {

  const state = getState()
  const [isPaused, setPaused] = useState(true);
  const [isSelectingMoveTarget, setIsSelectingMoveTarget] = useState(false);
  const [tick, setTick] = useState(state.gameData.tick);
  const [gold, setGold] = useState(state.gameData.forces.find(f => f.id === FORCE_ID_PLAYER)?.gold || 0);

  useEffect(() => {
    console.log("Battleground mounted");
    listeners([
      [
        signals.PAUSE_GAME,
        () => {
          setPaused(true);
        },
      ],
      [
        signals.RESUME_GAME,
        () => {
          setPaused(false);
        },
      ],
      [
        signals.SELECT_SQUAD_MOVE_START,
        () => {
          setIsSelectingMoveTarget(true);
        },
      ],
      [
        signals.SELECT_SQUAD_MOVE_DONE,
        () => {
          setIsSelectingMoveTarget(false);
        },
      ],
      [
        signals.SELECT_SQUAD_MOVE_CANCEL,
        () => {
          setIsSelectingMoveTarget(false);
        },
      ],
      [
        signals.BATTLEGROUND_TICK,
        (tick: number) => {
          setTick(tick);
        },
      ],
      [
        signals.UPDATE_FORCE,
        (force: Partial<Force>) => {
          if (force.id === FORCE_ID_PLAYER) {
            setGold(force.gold || 0)
          }
        },
      ],
    ]);
  }, []);

  return (
    <>
      <header>
        <div className="content text-center">
          <button
            onClick={emit_(signals.TOGGLE_SQUADS_WINDOW, true)}
            className="button"
          >
            Units
          </button>
          <button
            onClick={emit_(signals.TOGGLE_SAVE_GAME_MODAL, true)}
            className="button"
          >
            Save
          </button>
          <button
            onClick={emit_(signals.TOGGLE_LOAD_GAME_MODAL, true)}
            className="button"
          >
            Load
          </button>
          <button
            className="button"
            onClick={(e) => {
              if (isPaused) {
                emit(signals.RESUME_GAME);
              } else {
                emit(signals.PAUSE_GAME);
              }
            }}
          >
            {isPaused ? "Resume" : "Pause"}
          </button>
          <button className="button col-2">Turn: {tick}</button>
          <button className="button col-2">Gold: {gold}</button>
        </div>
      </header>
      <div className="content" id="tooltip">
        <div className="row">
          <div id="tooltip" className="col text-center">
            {isSelectingMoveTarget && "Select Target"}
          </div>
        </div>
      </div>
      <footer className="block">
        <div className="content">
          <SelectionHUD isSelectingMoveTarget={isSelectingMoveTarget} />
        </div>
      </footer>

      <SquadsWindow />

      <DispatchSquadModal />

      <VictoryModal />

      <SaveGame />
    </>
  );
};

export default Battleground;
