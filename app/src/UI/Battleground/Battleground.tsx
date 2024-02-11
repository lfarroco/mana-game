import "./styles.css";
import { useEffect, useState } from "react";
import { listeners, signals, emit, emit_ } from "../../Models/Signals";
import DispatchSquadModal from "./RecruitUnitModal/RecruitUnitModal";
import VictoryModal from "./VictoryModal/VictoryModal";
import SelectionHUD from "./SelectionHUD";
import SaveGame from "../SaveGame/SaveGame";
import { getState } from "../../Models/State";
import { FORCE_ID_PLAYER, Force } from "../../Models/Force";
import { Button, Col, Row } from "react-bootstrap";

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
          <Row>

            <Col
              xs={2}
            >
              <Button
                variant="dark"
                onClick={emit_(signals.TOGGLE_SAVE_GAME_MODAL, true)}
                size="sm"
                style={{ padding: '0 10px' }}
              >
                Menu
              </Button>
            </Col>
            <Col
              xs={2}
            >
              <Button
                variant="dark"
                size="sm"
                style={{ marginLeft: "10px", padding: '0 10px' }}

                onClick={(e) => {
                  if (isPaused) {
                    emit(signals.RESUME_GAME);
                  } else {
                    emit(signals.PAUSE_GAME);
                  }
                }}
              >
                {isPaused ? "Resume" : "Pause"}
              </Button>
            </Col>

            <Col style={{ color: '#fff', fontSize: '10px', paddingTop: 5 }}>
              <Row>

                <Col>Turn: {tick}</Col>
                <Col >Gold: 💰  {gold}</Col>

              </Row>
            </Col>
          </Row>
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
        </div>
      </footer>

      <SelectionHUD isSelectingMoveTarget={isSelectingMoveTarget} />

      <DispatchSquadModal />

      <VictoryModal />

      <SaveGame />
    </>
  );
};

export default Battleground;
