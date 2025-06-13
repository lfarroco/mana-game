import { initialState } from "./Models/State";
import { initGame } from "./initGame";

const state = initialState();
window.state = state;

initGame(state);
