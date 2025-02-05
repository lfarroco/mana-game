import "./styles.css";
import { useEffect, useState } from "react";
import { listeners, signals, emit_, emit } from "../../Models/Signals";
import DispatchSquadModal from "./RecruitUnitModal/RecruitUnitModal";
import VictoryModal from "./VictoryModal/VictoryModal";
import SelectionHUD from "./SelectionHUD";
import SaveGame from "../SaveGame/SaveGame";
import { getState, State } from "../../Models/State";
import { FORCE_ID_PLAYER, Force } from "../../Models/Force";
import { Col, Row } from "react-bootstrap";
import ManaButton from "../Components/Button";

const Battleground = () => {

  const state = getState()
  const [isSelectingMoveTarget, setIsSelectingMoveTarget] = useState(false);
  const [isSelectingSkillTarget, setIsSelectingSkillTarget] = useState(false);
  const [tick, setTick] = useState(state.gameData.tick);
  const [gold, setGold] = useState(state.gameData.forces.find(f => f.id === FORCE_ID_PLAYER)?.gold || 0);
  const [nextTurnEnabled, setNextTurnEnabled] = useState(true);
  const [nextIdleEnabled, setNextIdleEnabled] = useState(true);

  useEffect(() => {
    listeners([
      [signals.SELECT_UNIT_MOVE_START, () => {
        setIsSelectingMoveTarget(true);
      }],
      [signals.SELECT_SKILL_TARGET_START, () => {
        setIsSelectingSkillTarget(true);
      }],
      [signals.SELECT_SKILL_TARGET_DONE, () => {
        setIsSelectingSkillTarget(false);
      }],
      [signals.SELECT_SKILL_TARGET_CANCEL, () => {
        setIsSelectingSkillTarget(false);
      }],
      [signals.SELECT_UNIT_MOVE_DONE, () => {
        setIsSelectingMoveTarget(false);
      }],
      [signals.SELECT_UNIT_MOVE_CANCEL, () => {
        setIsSelectingMoveTarget(false);
      }],
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
      [signals.BATTLEGROUND_TICK, (tick: number) => {
        checkIdle(state, setNextIdleEnabled);
      }],
      [signals.TURN_END, () => {
        checkIdle(state, setNextIdleEnabled);
      }],
      [signals.SELECT_UNIT_MOVE_DONE, () => {
        checkIdle(state, setNextIdleEnabled);
      }],
      [signals.SELECT_SKILL_TARGET_DONE, () => {
        checkIdle(state, setNextIdleEnabled);
      }]
    ]);
  }, [state, state.gameData.units]);

  return (
    <>
      <header>
        <div className="content text-center">
          <Row>
            <Col style={{ color: '#fff', fontSize: '10px', paddingTop: 5 }}>
              <Row>

                <Col>Turn: {tick}</Col>
                <Col >Gold: 💰  {gold}</Col>

              </Row>
            </Col>
            <Col
              xs={2}
            >
              <ManaButton
                onClick={emit_(signals.TOGGLE_SAVE_GAME_MODAL, true)}
                css="btn-sm"
                style={{ padding: '0 10px' }}
                label="Menu"
              />
            </Col>
          </Row>
        </div>
      </header>
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
          emit_(signals.BATTLEGROUND_TICK, state.gameData.tick)

        }
      >Next Turn</button >

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
function checkIdle(state: State, setNextIdleEnabled: (enabled: boolean) => void) {
  const idle = state.gameData.units
    .filter(u => u.force === FORCE_ID_PLAYER && u.hp > 0 && u.order.type === "none");

  console.log("IDLE ::: ", idle);
  if (idle.length > 0) {
    setNextIdleEnabled(true);
  } else {
    setNextIdleEnabled(false);
  }
}

