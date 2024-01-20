import * as Phaser from "phaser";
import events from "events";
import BattlegroundScene from "./Scenes/Battleground/BattlegroundScene";
import { State, initialState } from "./Models/State";
import { UI } from "./UI/UI";
import { events as events_ } from './Models/Signals';
import { listeners } from './Models/Signals';
import ReactDOM from "react-dom/client";
import Core from "./Scenes/Battleground/Core/Core";

const eventEmitter = new events.EventEmitter();

declare global {
  interface Window {
    state: State;
    emitter: events.EventEmitter;
  }
}
const state = initialState();
window.state = state;
window.emitter = eventEmitter;

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
//reportWebVitals();
const game = new Phaser.Game({
  // keep fullscreen for now
  type: Phaser.AUTO,
  mode: Phaser.Scale.FIT,
  autoCenter: Phaser.Scale.CENTER_BOTH,
  parent: "game",
  pixelArt: true,
  width: window.innerWidth,
  height: window.innerHeight,
});


game.scene.add("CoreScene", Core, true);
game.scene.add("BattlegroundScene", BattlegroundScene, false);

window.addEventListener("resize", () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});

const root = ReactDOM.createRoot(document.getElementById("ui") as HTMLElement);

root.render(<UI />);

listeners([
  [
    events_.START_GAME, () => {
      game.scene.start("BattlegroundScene");
    }
  ],
])
