import events from "events";
import { State, initialState, listenToStateEvents } from "./Models/State";
import { initGame } from "./initGame";
import { initUI } from "./initUI";

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

initGame(state, eventEmitter);

initUI();
