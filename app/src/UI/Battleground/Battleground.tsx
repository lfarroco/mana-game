import './styles.css';
import UnitsWindow from './UnitsWindow/UnitsWindow';
import SquadsWindow from './SquadsWindow/SquadsWindow';
import { Button, ButtonGroup } from 'react-bootstrap';
import { Link, Route, Routes } from 'react-router-dom'; // TODO: remove react router
import { useEffect, useState } from 'react';
import { getState } from '../../Scenes/Battleground/BGState';
import SelectedSquad from './SelectedEntity/SelectedSquad';
import { Squad } from '../../Models/Squad';
import SelectedCity from './SelectedEntity/SelectedCity';
import { City } from '../../Models/City';
import * as Signals from "../../Models/Signals"
import DispatchUnitModal from './DispatchUnitModal/DispachUnitModal';


const Battleground = () => {

  const state = getState()

  const [selectedEntityInfo, setSelectedEntity] = useState<{ type: string, id: string } | null>(null);
  const [isPaused, setPaused] = useState(false);
  const [isSelectingMoveTarget, setIsSelectingMoveTarget] = useState(false);
  const [isDispatchModalVisible, setDispatchModalVisible] = useState(false);

  const selectedEntity = selectedEntityInfo && (
    selectedEntityInfo.type === "squad" ? state.squads.find(squad => squad.id === selectedEntityInfo.id) :
      (state.cities.find(city => city.id === selectedEntityInfo.id))
  )

  useEffect(() => {
    console.log("Battleground mounted");
    Signals.listeners(
      [
        [Signals.index.PAUSE_PHYSICS, () => { setPaused(true); }],
        [Signals.index.RESUME_PHYSICS, () => { setPaused(false); }],
        [Signals.index.SQUAD_SELECTED, (id: string) => { setSelectedEntity({ type: "squad", id }); }],
        [Signals.index.CITY_SELECTED, (id: string) => { setSelectedEntity({ type: "city", id }); }],
        [Signals.index.SELECT_SQUAD_MOVE_START, () => { setIsSelectingMoveTarget(true); }],
        [Signals.index.SELECT_SQUAD_MOVE_DONE, () => { setIsSelectingMoveTarget(false); }],
        [Signals.index.SELECT_SQUAD_MOVE_CANCEL, () => { setIsSelectingMoveTarget(false); }],
        [Signals.index.TOGGLE_DISPATCH_MODAL, (value: boolean) => { setDispatchModalVisible(value); }]
      ]
    )
  }, []);

  return (
    <>
      <header className="card">
        <div className="content">
          <ButtonGroup>
            <Link
              to="units"
              className="btn btn-secondary col-12"
            >
              Units
            </Link>

            <Link
              to="squads"
              className="btn btn-secondary col-12"
            >
              Squads
            </Link>

            <Button
              onClick={(e) => {
                if (isPaused) {
                  Signals.emit(Signals.index.RESUME_PHYSICS)
                } else {
                  Signals.emit(Signals.index.PAUSE_PHYSICS)
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

      <Routes>
        <Route path="units" element={<UnitsWindow />} />
        <Route path="units/:unitId" element={<UnitsWindow />} />
        <Route path="squads" element={<SquadsWindow />} />
        <Route path="squads/:squadId" element={<SquadsWindow />} />
      </Routes>
      {state.squads.length > 0 && <DispatchUnitModal
        visible={isDispatchModalVisible}
        squads={state.squads}
      />}
    </>
  );
}

export default Battleground;
