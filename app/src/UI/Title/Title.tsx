import { useEffect, useState } from "react";
import { events, emit, emit_ } from "../../Models/Signals";
import Credits from "../Credits/Credits";
import { use } from "matter";


export default function Title() {

  const [creditsVisible, setCreditsVisible] = useState(false);

  const images = [
    'https://th.bing.com/th/id/OIG.A3lHv9S3n9szNXt7NOHh?w=1024&h=1024&rs=1&pid=ImgDetMain',
    'https://th.bing.com/th/id/OIG.894Gtcol5LM5Pcf9LaMj'
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
        <button
          className="button mb-2"
          onClick={() => {
            emit(events.SET_ROUTE, "battleground");
            emit(events.START_GAME);
          }}
        >
          Start Game
        </button>
        <button className="button mb-2" onClick={emit_(events.TOGGLE_LOAD_GAME_MODAL, true)}>
          Load Game
        </button>
        <button className="button mb-2" onClick={emit_(events.TOGGLE_OPTIONS_MODAL, true)}>
          Options
        </button>
        <button className="button mb-2" onClick={() => setCreditsVisible(true)}>
          Credits
        </button>


      </div>
    </div >
    <Credits visible={creditsVisible} onHide={() => setCreditsVisible(false)} />
  </>
  );
}
