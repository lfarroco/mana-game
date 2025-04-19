import events from "events";
import { State, initialState } from "./Models/State";
import { initGame } from "./initGame";

const eventEmitter = new events.EventEmitter();

declare global {
  interface Window {
    state: State; // TODO: this is bad
    emitter: events.EventEmitter; // TOOD: this is bad as well
  }
}

const state = initialState();
window.state = state;
window.emitter = eventEmitter;

initGame(state);

// TODO: load these fonts
// <link rel="preconnect" href="https://fonts.googleapis.com">
// <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
// <link href="https://fonts.googleapis.com/css2?family=Macondo&display=swap" rel="stylesheet">
//  <style type="text/css">
//   body {
//     margin: 0;
//     padding: 0;
//     overflow: hidden;
//     background-color: #000;
//     font-family: "Macondo", cursive;
//   }
//   </style>