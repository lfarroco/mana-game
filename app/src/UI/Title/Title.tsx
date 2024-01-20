import { useState } from "react";
import { events, emit, emit_ } from "../../Models/Signals";
import Credits from "../Credits/Credits";


export default function Title() {

  const [creditsVisible, setCreditsVisible] = useState(false);

  return (<>
    <div
      className="container-fluid pt-5"
      style={{ minHeight: "100vh", position: "relative" }}
    >
      <img
        src="assets/bgs/castle.jpeg"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          opacity: 0.5,
        }}
        alt="Mana Battle"
      />
      <div
        className="row"
        style={{ minHeight: "100vh", zIndex: 1, position: "relative" }}
      >
        <div
          style={{
            color: "white",
          }}
          className="col-sm-12 text-center mb-5"
        >
          <h1>Mana Battle</h1>
        </div>

        <div className="col-sm-2 offset-sm-5 text-center">
          <button
            className="btn btn-primary col-12 mb-2"
            onClick={() => {
              emit(events.SET_ROUTE, "battleground");
              emit(events.START_GAME);
            }}
          >
            Start Game
          </button>
          <button className="btn btn-primary col-12 mb-2" onClick={emit_(events.TOGGLE_LOAD_GAME_MODAL, true)}>
            Load Game
          </button>
          <button className="btn btn-primary col-12 mb-2" onClick={emit_(events.TOGGLE_OPTIONS_MODAL, true)}>
            Options
          </button>
          <button className="btn btn-primary col-12 mb-2" onClick={() => setCreditsVisible(true)}>
            Credits
          </button>
        </div>
      </div>
    </div >

    <Credits visible={creditsVisible} onHide={() => setCreditsVisible(false)} />
  </>
  );
}
