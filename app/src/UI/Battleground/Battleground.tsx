import './styles.css';
import UnitsWindow from './UnitsWindow/UnitsWindow';
import SquadsWindow from './SquadsWindow/SquadsWindow';
import { ButtonGroup } from 'react-bootstrap';
import events from 'events'
import { Link, Route, Routes } from 'react-router-dom';

type BattlegroundProps = {
  events: events.EventEmitter
}

const Battleground = (props: BattlegroundProps) => {
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

          </ButtonGroup>
        </div>
      </header>
      <footer className="block p-2">
        <div className="content">
          FOOTER
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
