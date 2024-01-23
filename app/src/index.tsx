import * as Phaser from "phaser";
import events from "events";
import BattlegroundScene from "./Scenes/Battleground/BattlegroundScene";
import { State, initialState, listenToStateEvents } from "./Models/State";
import { UI } from "./UI/UI";
import { events as events_ } from './Models/Signals';
import { listeners } from './Models/Signals';
import ReactDOM from "react-dom/client";
import Core from "./Scenes/Core/Core";
import * as SaveGame from "./Systems/SaveGame/SaveGame";

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

// create this listener first so that state changes are processed first
listenToStateEvents();

const game = new Phaser.Game({
  // keep fullscreen for now
  type: Phaser.AUTO,
  mode: Phaser.Scale.FIT,
  autoCenter: Phaser.Scale.CENTER_BOTH,
  parent: "game",
  pixelArt: true,
  width: window.innerWidth,
  height: window.innerHeight,
  scene: [Core, BattlegroundScene]
});


window.addEventListener("resize", () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});

const root = ReactDOM.createRoot(document.getElementById("ui") as HTMLElement);

root.render(<UI />);

listeners([
  [
    events_.START_GAME, () => {
      // TODO: pass empty gamedata
      game.scene.start("BattlegroundScene", { squads: [] });
    }
  ],
])

SaveGame.init(game);
