import { initialState, } from "./Models/State";
import { initGame } from "./initGame";
import { initializeOptionsStore } from "./Models/OptionsStore";

initializeOptionsStore(); // Initialize options first
const state = initialState();
window.state = state; // The global state now excludes options

initGame(state);
