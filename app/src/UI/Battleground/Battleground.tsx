import './styles.css';
import UnitsWindow from './UnitsWindow/UnitsWindow';
import SquadsWindow from './SquadsWindow/SquadsWindow';
import { Button, ButtonGroup } from 'react-bootstrap';
import events from 'events'
import { Link, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getState } from '../../Scenes/Battleground/BGState';
import SelectedSquad from './SelectedEntity/SelectedSquad';
import { Squad } from '../../Models/Squad';
import SelectedCity from './SelectedEntity/SelectedCity';
import { City } from '../../Models/City';

type BattlegroundProps = {
  events: events.EventEmitter
}

const Battleground = (props: BattlegroundProps) => {

  const [selectedEntityInfo, setSelectedEntity] = useState<{ type: string, id: string } | null>(null);
  const state = getState()

  const [isPaused, setPaused] = useState(false);

  const selectedEntity = selectedEntityInfo && (
    selectedEntityInfo.type === "squad" ? state.squads.find(squad => squad.id === selectedEntityInfo.id) :
      (state.cities.find(city => city.id === selectedEntityInfo.id))
  )

  useEffect(() => {
    console.log("Battleground mounted");
    props.events.on('SQUAD_SELECTED', (id: string) => {
      setSelectedEntity({ type: "squad", id });
    })
    props.events.on('CITY_SELECTED', (id: string) => {
      setSelectedEntity({ type: "city", id });
    })
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
                e.preventDefault();
                e.stopPropagation();
                isPaused ? props.events.emit('RESUME') : props.events.emit('PAUSE');
                setPaused(!isPaused);
              }}
            >
              {isPaused ? "Resume" : "Pause"}
            </Button>

          </ButtonGroup>
        </div>
      </header>
      <footer className="block p-2">
        <div className="content">
          {
            selectedEntityInfo?.type === "squad" && <SelectedSquad squad={selectedEntity as Squad} />
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
