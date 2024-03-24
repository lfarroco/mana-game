import { useState } from "react";
import { signals, emit, emit_ } from "../../Models/Signals";
import Credits from "../Credits/Credits";
import ManaButton from "../Components/Button";

export default function Title() {

  const [creditsVisible, setCreditsVisible] = useState(false);

  return (<>
    <div
      className="container-fluid text-center"
      style={{
        position: 'absolute',
        background: "#010b22",
      }}
    >
      <div className="row">

        <div className="col-4"></div>
        <div className="col-4"
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
          }}
        >

          <img
            src="assets/logo.jpeg"
            style={{ width: '80%' }}
            alt="Mana Battle"
          />
          <ManaButton
            css="mb-2"
            onClick={() => {
              setTimeout(() => {
                emit(signals.SET_ROUTE, "battleground");
                emit(signals.START_NEW_GAME);
              }, 200);
            }}
            label="Start Game"
          />
          <ManaButton
            css="mb-2"
            onClick={emit_(signals.TOGGLE_LOAD_GAME_MODAL, true)}
            label="Load Game"
          />
          <ManaButton
            css="mb-2"
            onClick={emit_(signals.TOGGLE_OPTIONS_MODAL, true)}
            label="Options"
          />
          <ManaButton
            css="mb-2"
            onClick={() => setCreditsVisible(true)}
            label="Credits"
          />

          {/* TODO: add social links */}


        </div>

        <div className="col-4"></div>
      </div>
    </div >
    <Credits visible={creditsVisible} onHide={() => setCreditsVisible(false)} />
    <audio
      src="assets/audio/button_click.ogg"
      id="audio"
      preload="auto"
    />
  </>
  );
}
