import { State, initialState } from "./Models/State";
import { initGame } from "./initGame";

declare global {
  interface Window {
    state: State; // TODO: this is bad
  }
}

const state = initialState();
window.state = state;

initGame(state);
