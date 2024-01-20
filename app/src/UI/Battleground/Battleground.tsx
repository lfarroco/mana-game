import "./styles.css";
import SquadsWindow from "./SquadsWindow/SquadsWindow";
import { Button, ButtonGroup } from "react-bootstrap";
import { useEffect, useState } from "react";
import { listeners, events, emit, emit_ } from "../../Models/Signals";
import DispatchSquadModal from "./DispatchSquadModal/DispatchSquadModal";
import VictoryModal from "./VictoryModal/VictoryModal";
import SelectionHUD from "./SelectionHUD";

const Battleground = () => {
  const [isPaused, setPaused] = useState(false);
  const [isSelectingMoveTarget, setIsSelectingMoveTarget] = useState(false);
  const [tick, setTick] = useState(0);

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
              Squads
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
            <Button>{tick}</Button>
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
    </>
  );
};

export default Battleground;
