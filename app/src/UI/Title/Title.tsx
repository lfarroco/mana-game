import { useState } from "react";
import { signals, emit, emit_ } from "../../Models/Signals";
import Credits from "../Credits/Credits";
import ManaButton from "../Components/Button";

export default function Title() {

  const [creditsVisible, setCreditsVisible] = useState(false);

  const images = [
    'assets/bgs/bg1.jpeg',
    'assets/bgs/bg2.jpeg',
  ]

  return (<>
    <div
      className="container-fluid text-center"

      style={{
        background: `url(${images[0]})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "auto 100%",
        backgroundPosition: "center bottom",
        minHeight: "100vh",
      }}
    >
      <div className="col-4 float-end"

        style={{
          display: "flex",
          minHeight: "100vh",
          background: "#010b22",
          flexDirection: "column",
          alignItems: "center",
          borderLeft: "4px double #ccc",
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
