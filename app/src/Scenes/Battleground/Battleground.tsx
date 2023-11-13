import { useReducer } from 'react';
import './styles.css';
import UnitsWindow from './UnitsWindow/UnitsWindow';
import { Action } from '../../Models/Action';
import { State, initialState } from '../../Models/State';
import SquadsWindow from './SquadsWindow/SquadsWindow';
import { Button, ButtonGroup } from 'react-bootstrap';
import events from 'events'


const reducer = (state: State, action: Action): State => {

  if (action.type === "toggle_units_modal") {
    return { ...state, unitsWindowOpened: !state.unitsWindowOpened }
  } else if (action.type === "toggle_squads_modal") {

    return { ...state, squadsWindowOpened: !state.squadsWindowOpened }

  } else {
    throw new Error(`invalid action ${action}`)
  }

}

type BattlegroundProps = {
  events: events.EventEmitter
}

function Battleground(props: BattlegroundProps) {

  const [state, dispatch] = useReducer(reducer, initialState)

  const { unitsWindowOpened, squadsWindowOpened } = state

  return (
    <>
      <main>
        MAIN
      </main>
      <header>
        <div className="content">
          <ButtonGroup>

            <Button onClick={
              () => {
                dispatch({ type: "toggle_units_modal" })
                props.events.emit("test")
              }
            }>
              Units
            </Button>
            <Button onClick={
              () => {
                dispatch({ type: "toggle_squads_modal" })
              }
            }>
              Squads
            </Button>

          </ButtonGroup>
        </div>
      </header>
      <footer>

        <div className="content">
          FOOTER
        </div>
      </footer>

      <UnitsWindow
        opened={unitsWindowOpened}
        onToggle={
          () => dispatch({ type: "toggle_units_modal" })
        }
      />
      <SquadsWindow
        opened={squadsWindowOpened}
        onToggle={
          () => dispatch({ type: "toggle_squads_modal" })
        }
      />
    </>
  );
}

export default Battleground;
