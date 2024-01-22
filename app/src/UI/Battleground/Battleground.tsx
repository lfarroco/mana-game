import "./styles.css";
import SquadsWindow from "./SquadsWindow/SquadsWindow";
import { Button, ButtonGroup } from "react-bootstrap";
import { useEffect, useState } from "react";
import { listeners, events, emit, emit_ } from "../../Models/Signals";
import DispatchSquadModal from "./DispatchSquadModal/DispatchSquadModal";
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
        events.PAUSE_GAME,
        () => {
          setPaused(true);
        },
      ],
      [
        events.RESUME_GAME,
        () => {
          setPaused(false);
        },
      ],
      [
        events.SELECT_SQUAD_MOVE_START,
        () => {
          setIsSelectingMoveTarget(true);
        },
      ],
      [
        events.SELECT_SQUAD_MOVE_DONE,
        () => {
          setIsSelectingMoveTarget(false);
        },
      ],
      [
        events.SELECT_SQUAD_MOVE_CANCEL,
        () => {
          setIsSelectingMoveTarget(false);
        },
      ],
      [
        events.BATTLEGROUND_TICK,
        (tick: number) => {
          setTick(tick);
        },
      ],
      [
        events.UPDATE_FORCE,
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
          <ButtonGroup>
            <Button
              onClick={emit_(events.TOGGLE_SQUADS_WINDOW, true)}
              className="btn btn-secondary col-12"
            >
              Units
            </Button>
            <Button
              onClick={emit_(events.TOGGLE_SAVE_GAME_MODAL, true)}
              className="btn btn-secondary col-12"
            >
              Save
            </Button>
            <Button
              onClick={emit_(events.TOGGLE_LOAD_GAME_MODAL, true)}
              className="btn btn-secondary col-12"
            >
              Load
            </Button>
            <Button
              onClick={(e) => {
                if (isPaused) {
                  emit(events.RESUME_GAME);
                } else {
                  emit(events.PAUSE_GAME);
                }
              }}
            >
              {isPaused ? "Resume" : "Pause"}
            </Button>
            <div className="col-2">Turn: {tick}</div>
            <div className="col-2">Gold: {gold}</div>
          </ButtonGroup>
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
