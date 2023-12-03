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
import DispatchUnitModal from './DispatchUnitModal/DispachUnitModal';
import SquadDetailsModal from './SquadDetailsModal/SquadDetailsModal';
import { getDispatchableSquads } from '../../Models/Squad';

const Battleground = () => {

  const state = getState()

  const [selectedEntityInfo, setSelectedEntity] = useState<{ type: string, id: string } | null>(null);
  const [isPaused, setPaused] = useState(false);
  const [isSelectingMoveTarget, setIsSelectingMoveTarget] = useState(false);
  const [isDispatchModalVisible, setDispatchModalVisible] = useState(false);
  const [isSquadDetailsModalVisible, setSquadDetailsModalVisible] = useState(false);

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
        [events.TOGGLE_DISPATCH_MODAL, (value: boolean) => { setDispatchModalVisible(value); }],
        [events.TOGGLE_SQUAD_DETAILS_MODAL, (value: boolean) => { setSquadDetailsModalVisible(value); }],
      ]
    )
  }, []);

  const dispatchableSquads = getDispatchableSquads(state)

  return (
    <>
      <header className="card">
        <div className="content">
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

          </ButtonGroup>
        </div>
      </header>
      <footer className="block p-2">
        <div className="content">
          <div className="row">
            <div id="tooltip" className="col text-center text-light">
              {isSelectingMoveTarget && 'Select Target'}
            </div>
          </div>
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

      {dispatchableSquads.length > 0 && <DispatchUnitModal
        visible={isDispatchModalVisible}
        squads={dispatchableSquads}
      />}
      {
        selectedEntityInfo?.type === "squad" && <SquadDetailsModal
          visible={isSquadDetailsModalVisible}
          id={selectedEntityInfo.id}
        />
      }
    </>
  );
}

export default Battleground;


