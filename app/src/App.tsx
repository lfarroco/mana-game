import React, { useReducer, useState } from 'react';
import './App.css';
import UnitsWindow from './UnitsWindow/UnitsWindow';
import { Action } from './Models/Action';
import { State, initialState } from './Models/State';
import SquadsWindow from './SquadsWindow/SquadsWindow';


const reducer = (state: State, action: Action): State => {

  if (action.type === "toggle_units_modal") {
    return { ...state, unitsWindowOpened: !state.unitsWindowOpened }
  } else if (action.type === "toggle_squads_modal") {

    return { ...state, squadsWindowOpened: !state.squadsWindowOpened }

  } else {
    throw new Error(`invalid action ${action}`)
  }

}

function App() {

  const [state, dispatch] = useReducer(reducer, initialState)

  const { unitsWindowOpened, squadsWindowOpened } = state

  return (
    <>
      <main>
        MAIN
      </main>
      <header>
        <div className="content">
          <button onClick={
            () => {
              dispatch({ type: "toggle_units_modal" })
            }
          }>
            Units
          </button>
          <button onClick={
            () => {
              dispatch({ type: "toggle_squads_modal" })
            }
          }>
            Squads
          </button>
        </div>
      </header>
      <footer>

        <div className="content">
          FOOTER
        </div>
      </footer>

      {
        unitsWindowOpened &&
        <UnitsWindow
          onToggle={
            () => dispatch({ type: "toggle_units_modal" })
          }
        />
      }
      {
        squadsWindowOpened &&
        <SquadsWindow
          onToggle={
            () => dispatch({ type: "toggle_squads_modal" })
          }
        />
      }
    </>
  );
}

export default App;
