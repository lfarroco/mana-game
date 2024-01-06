import './styles.css';
import UnitsWindow from './UnitsWindow/UnitsWindow';
import SquadsWindow from './SquadsWindow/SquadsWindow';
import { Button, ButtonGroup } from 'react-bootstrap';
import { useEffect, useState } from 'react';
import { listeners, events, emit, emit_ } from "../../Models/Signals"
import DispatchSquadModal from './DispatchSquadModal/DispatchSquadModal';
import SquadDetailsModal from './SquadDetailsModal/SquadDetailsModal';
import { UnitDetailsModal } from './UnitDetailsModal/UnitsDetailsModal';
import VictoryModal from './VictoryModal/VictoryModal';
import EngagementModal from './EngagementModal/EngagementModal';
import SelectionHUD from './SelectionHUD';

const Battleground = () => {

  // move these into the SelectionHUD
  const [isPaused, setPaused] = useState(false);
  const [isSelectingMoveTarget, setIsSelectingMoveTarget] = useState(false);
  const [tick, setTick] = useState(0);


  useEffect(() => {
    console.log("Battleground mounted");
    listeners(
      [
        [events.PAUSE_PHYSICS, () => { setPaused(true); }],
        [events.RESUME_PHYSICS, () => { setPaused(false); }],
        [events.SELECT_SQUAD_MOVE_START, () => { setIsSelectingMoveTarget(true); }],
        [events.SELECT_SQUAD_MOVE_DONE, () => { setIsSelectingMoveTarget(false); }],
        [events.SELECT_SQUAD_MOVE_CANCEL, () => { setIsSelectingMoveTarget(false); }],
        [events.BATTLEGROUND_TICK, (tick: number) => { setTick(tick); }]
      ]
    )
  }, []);

  return (
    <>
      <header>
        <div className="content text-center">
          <ButtonGroup>
            <Button>
              Quests
            </Button>
            <Button
              onClick={emit_(events.TOGGLE_UNITS_WINDOW, true)}
              className="btn btn-secondary col-12"
            >
              Units
            </Button>
            <Button
              onClick={emit_(events.TOGGLE_ENGAGEMENT_WINDOW, true, "")}
              className="btn btn-secondary col-12"
            >
              Engagements
            </Button>
            <Button
              onClick={emit_(events.TOGGLE_SQUADS_WINDOW, true)}
              className="btn btn-secondary col-12"
            >
              Squads
            </Button>
            <Button>
              Log
            </Button>

            <Button
              onClick={(e) => {
                if (isPaused) {
                  emit(events.RESUME_PHYSICS)
                } else {
                  emit(events.PAUSE_PHYSICS)
                }
              }}
            >
              {isPaused ? "Resume" : "Pause"}
            </Button>
            <Button>
              {tick}
            </Button>

          </ButtonGroup>
        </div>
      </header>
      <div className="content" id="tooltip">
        <div className="row">
          <div id="tooltip" className="col text-center">
            {isSelectingMoveTarget && 'Select Target'}
          </div>
        </div>
      </div>
      <footer className="block">
        <div className="content">
          <SelectionHUD
            isSelectingMoveTarget={isSelectingMoveTarget}
          />
        </div>
      </footer>

      <UnitsWindow />
      <SquadsWindow />

      <DispatchSquadModal />
      <SquadDetailsModal />

      <UnitDetailsModal />
      <VictoryModal />
      <EngagementModal />
    </>
  );
}



export default Battleground;


