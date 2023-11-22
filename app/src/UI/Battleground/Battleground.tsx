import './styles.css';
import UnitsWindow from './UnitsWindow/UnitsWindow';
import SquadsWindow from './SquadsWindow/SquadsWindow';
import { Button, ButtonGroup } from 'react-bootstrap';
import events, { EventEmitterAsyncResource } from 'events'
import { Link, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getState } from '../../Scenes/Battleground/BGState';
import SelectedSquad from './SelectedEntity/SelectedSquad';
import { Squad } from '../../Models/Squad';
import SelectedCity from './SelectedEntity/SelectedCity';
import { City } from '../../Models/City';
import * as Events from "../../Models/Events"

type BattlegroundProps = {
  events: events.EventEmitter
}

const Battleground = (props: BattlegroundProps) => {

  const { events } = props;
  const state = getState()

  const [selectedEntityInfo, setSelectedEntity] = useState<{ type: string, id: string } | null>(null);
  const [isPaused, setPaused] = useState(false);
  const [isSelectingMoveTarget, setIsSelectingMoveTarget] = useState(false);

  const selectedEntity = selectedEntityInfo && (
    selectedEntityInfo.type === "squad" ? state.squads.find(squad => squad.id === selectedEntityInfo.id) :
      (state.cities.find(city => city.id === selectedEntityInfo.id))
  )

  useEffect(() => {
    console.log("Battleground mounted");
    Events.listeners(
      events,
      [
        [Events.index.PAUSE_PHYSICS, () => { setPaused(true); }],
        [Events.index.RESUME_PHYSICS, () => { setPaused(false); }],
        [Events.index.SQUAD_SELECTED, (id: string) => { setSelectedEntity({ type: "squad", id }); }],
        [Events.index.CITY_SELECTED, (id: string) => { setSelectedEntity({ type: "city", id }); }],
        [Events.index.SELECT_SQUAD_MOVE_START, (id: string) => { setIsSelectingMoveTarget(true); }],
        [Events.index.SELECT_SQUAD_MOVE_DONE, (id: string) => { setIsSelectingMoveTarget(false); }],
        [Events.index.SELECT_SQUAD_MOVE_CANCEL, (id: string) => { setIsSelectingMoveTarget(false); }]
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
                  Events.emit(events, Events.index.RESUME_PHYSICS)
                } else {
                  Events.emit(events, Events.index.PAUSE_PHYSICS)
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
              events={events}
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
    </>
  );
}

export default Battleground;
