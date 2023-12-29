import './styles.css';
import UnitsWindow from './UnitsWindow/UnitsWindow';
import SquadsWindow from './SquadsWindow/SquadsWindow';
import { Button, ButtonGroup } from 'react-bootstrap';
import { useEffect, useState } from 'react';
import { getState } from '../../Models/State';
import SelectedSquad from './SelectedEntity/SelectedSquad';
import { Squad } from '../../Models/Squad';
import SelectedCity from './SelectedEntity/SelectedCity';
import { City } from '../../Models/City';
import { listeners, events, emit, emit_ } from "../../Models/Signals"
import DispatchSquadModal from './DispatchSquadModal/DispatchSquadModal';
import SquadDetailsModal from './SquadDetailsModal/SquadDetailsModal';
import { UnitDetailsModal } from './UnitDetailsModal/UnitsDetailsModal';
import VictoryModal from './VictoryModal/VictoryModal';
import EngagementModal from './EngagementModal/EngagementModal';

const Battleground = () => {

  const state = getState()

  const [selectedEntityInfo, setSelectedEntity] = useState<{ type: string, id: string } | null>(null);
  const [isPaused, setPaused] = useState(false);
  const [isSelectingMoveTarget, setIsSelectingMoveTarget] = useState(false);
  const [tick, setTick] = useState(0);

  const selectedEntity = selectedEntityInfo && (
    selectedEntityInfo.type === "squad" ? state.squads.find(squad => squad.id === selectedEntityInfo.id) :
      (state.cities.find(city => city.id === selectedEntityInfo.id))
  )

  useEffect(() => {
    console.log("Battleground mounted");
    listeners(
      [
        [events.PAUSE_PHYSICS, () => { setPaused(true); }],
        [events.RESUME_PHYSICS, () => { setPaused(false); }],
        [events.SQUAD_SELECTED, (id: string) => { setSelectedEntity({ type: "squad", id }); }],
        [events.CITY_SELECTED, (id: string) => { setSelectedEntity({ type: "city", id }); }],
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
          {
            selectedEntityInfo?.type === "squad"
            && <SelectedSquad
              squad={selectedEntity as Squad}
              isSelectingMoveTarget={isSelectingMoveTarget}
            />
          }
          {
            selectedEntityInfo?.type === "city" && <SelectedCity city={selectedEntity as City} />
          }
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


