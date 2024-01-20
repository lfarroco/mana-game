import {events, emit} from "../Models/Signals";

export function MainMenu() {
  return (
    <div className="container-fluid pt-5">

      <img src="assets/jobs/soldier.png"
        style={{position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: -1, opacity: 0.5}}
        alt="Mana Battle" />
      <div className="row">
        <div className="col-sm-12 text-center mb-5">
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
          <button
            className="btn btn-primary col-12 mb-2"
            onClick={() => {
            }}
          >
            Load Game
          </button>
          <button
            className="btn btn-primary col-12 mb-2"
            onClick={() => {
            }}
          >
            Options
          </button>
          <button
            className="btn btn-primary col-12 mb-2"
            onClick={() => {
            }}
          >
            Credits
          </button>
        </div>
      </div>
    </div>
  );
}

